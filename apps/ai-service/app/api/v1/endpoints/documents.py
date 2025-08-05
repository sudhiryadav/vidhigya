import base64
import datetime
import io
import json
import os
import re
import sys
import traceback
import uuid
from functools import lru_cache
from typing import Any, Dict, List, Optional

import docx
import fitz
import pandas as pd
import pytesseract
from app.utils.logger import log_to_backend
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from PIL import Image
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session

# Add the root directory to Python path
backend_dir = os.path.dirname(
    os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )
)
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

# Now we can import from absolute paths
from app.core.config import settings
from app.database import get_db

# Removed database model imports - AI service should not manage database records

# OCR Configuration
OCR_ENABLED = getattr(settings, "OCR_ENABLED", True)  # Enable/disable OCR
OCR_LANGUAGE = getattr(settings, "OCR_LANGUAGE", "eng")  # OCR language
OCR_DPI = getattr(settings, "OCR_DPI", 300)  # DPI for page rendering
OCR_CONFIG = getattr(settings, "OCR_CONFIG", "--oem 3 --psm 6")  # Tesseract config

# Set Tesseract path if needed (uncomment and set path if tesseract is not in PATH)
# pytesseract.pytesseract.tesseract_cmd = '/opt/homebrew/bin/tesseract'  # macOS with Homebrew

# Initialize the embedding model with the same model as query service
try:
    embedding_model = SentenceTransformer("BAAI/bge-small-en-v1.5", device="cpu")
    print("✅ Embedding model initialized successfully")
except Exception as e:
    print(f"Warning: Could not initialize SentenceTransformer: {str(e)}")
    embedding_model = None

# Initialize Qdrant client
try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, PointStruct, VectorParams

    # Initialize Qdrant client with optional authentication
    if settings.QDRANT_API_KEY:
        qdrant_client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY,
            check_compatibility=False,  # Skip version compatibility check
        )
    else:
        qdrant_client = QdrantClient(
            settings.QDRANT_URL,
            check_compatibility=False,  # Skip version compatibility check
        )

    qdrant_collection = settings.QDRANT_COLLECTION
    print(
        f"✅ Qdrant client initialized successfully for collection: {qdrant_collection}"
    )

except Exception as e:
    print(f"Warning: Could not initialize Qdrant client: {str(e)}")
    qdrant_client = None


def ensure_qdrant_collection_exists():
    """Ensure Qdrant collection exists, create if it doesn't."""
    if not qdrant_client:
        print("Warning: Qdrant client not available")
        return False

    try:
        print(f"Checking if Qdrant collection '{qdrant_collection}' exists...")
        qdrant_client.get_collection(qdrant_collection)
        print(f"✅ Collection '{qdrant_collection}' already exists")
        return True
    except Exception as e:
        print(f"❌ Collection '{qdrant_collection}' does not exist. Creating it now...")
        try:
            # Create collection if it doesn't exist
            qdrant_client.create_collection(
                collection_name=qdrant_collection,
                vectors_config=VectorParams(
                    size=384, distance=Distance.COSINE
                ),  # all-MiniLM-L6-v2 has 384 dimensions
            )
            print(f"✅ Successfully created collection '{qdrant_collection}'")

            # Create payload indexes for filtering
            try:
                qdrant_client.create_payload_index(
                    collection_name=qdrant_collection,
                    field_name="user_id",
                    field_schema="keyword",
                )
                print(
                    f"✅ Created payload index for user_id in collection {qdrant_collection}"
                )
            except Exception as e:
                print(f"⚠️  Warning: Could not create payload index for user_id: {e}")

            try:
                qdrant_client.create_payload_index(
                    collection_name=qdrant_collection,
                    field_name="document_id",
                    field_schema="keyword",
                )
                print(
                    f"✅ Created payload index for document_id in collection {qdrant_collection}"
                )
            except Exception as e:
                print(
                    f"⚠️  Warning: Could not create payload index for document_id: {e}"
                )

            print(f"🎉 Collection '{qdrant_collection}' setup completed successfully!")
            return True
        except Exception as e:
            print(f"❌ Failed to create collection: {e}")
            return False


# Cache for embeddings using lru_cache
@lru_cache(maxsize=1000)
def get_cached_embedding(text: str) -> List[float]:
    """Get cached embedding or compute new one."""
    return embedding_model.encode(text).tolist()


def optimize_chunk_size(text: str, target_size: int = 800) -> List[str]:
    """Optimize text into chunks of approximately target_size characters."""
    if not text.strip():
        return []

    # Split by sentences first
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        if len(current_chunk) + len(sentence) <= target_size:
            current_chunk += sentence + " "
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence + " "

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks


def optimize_chunk_size_with_pages(
    text: str, file_extension: str, file_content: bytes
) -> List[Dict[str, Any]]:
    """Optimize text into chunks with page tracking for better search results."""
    if not text.strip():
        return []

    chunks = []

    if file_extension.lower() == ".pdf":
        # For PDFs, we can track page numbers
        try:
            doc = fitz.open(stream=file_content, filetype="pdf")
            current_pos = 0

            for page_num in range(len(doc)):
                page = doc[page_num]
                page_text = page.get_text()

                if not page_text.strip():
                    continue

                # Find this page's text in the full document
                page_start = text.find(page_text, current_pos)
                if page_start == -1:
                    # Fallback: approximate page boundaries
                    page_start = current_pos

                page_end = page_start + len(page_text)
                current_pos = page_end

                # Split page text into chunks
                page_chunks = optimize_chunk_size(page_text, 800)

                for chunk_idx, chunk_text in enumerate(page_chunks):
                    # Find chunk position within page
                    chunk_start = page_text.find(chunk_text)
                    if chunk_start != -1:
                        global_start = page_start + chunk_start
                        global_end = global_start + len(chunk_text)
                    else:
                        global_start = page_start
                        global_end = page_start + len(chunk_text)

                    chunks.append(
                        {
                            "text": chunk_text,
                            "page_number": page_num + 1,  # 1-based page numbers
                            "start_char": global_start,
                            "end_char": global_end,
                            "chunk_in_page": chunk_idx,
                        }
                    )

            doc.close()
        except Exception as e:
            # Fallback to simple chunking if page tracking fails
            simple_chunks = optimize_chunk_size(text, 800)
            for chunk in simple_chunks:
                chunks.append(
                    {
                        "text": chunk,
                        "page_number": None,
                        "start_char": None,
                        "end_char": None,
                    }
                )
    else:
        # For non-PDF files, use simple chunking
        simple_chunks = optimize_chunk_size(text, 800)
        for chunk in simple_chunks:
            chunks.append(
                {
                    "text": chunk,
                    "page_number": None,
                    "start_char": None,
                    "end_char": None,
                }
            )

    return chunks


def analyze_financial_data(df: pd.DataFrame) -> Dict[str, Any]:
    """Analyze financial data from DataFrame and return key metrics."""
    analysis = {}

    # Basic statistics for numeric columns
    numeric_cols = df.select_dtypes(include=["float64", "int64"]).columns
    if not numeric_cols.empty:
        analysis["numeric_summary"] = df[numeric_cols].describe().to_dict()

    # Try to identify financial metrics
    for col in df.columns:
        col_lower = col.lower()
        # Revenue/Income analysis
        if any(term in col_lower for term in ["revenue", "income", "sales"]):
            analysis["revenue_metrics"] = {
                "total": df[col].sum(),
                "average": df[col].mean(),
                "trend": df[col].pct_change().mean(),
            }
        # Expense analysis
        elif any(term in col_lower for term in ["expense", "cost", "spend"]):
            analysis["expense_metrics"] = {
                "total": df[col].sum(),
                "average": df[col].mean(),
                "trend": df[col].pct_change().mean(),
            }
        # Profit analysis
        elif any(term in col_lower for term in ["profit", "margin", "earnings"]):
            analysis["profit_metrics"] = {
                "total": df[col].sum(),
                "average": df[col].mean(),
                "trend": df[col].pct_change().mean(),
            }

    return analysis


def df_to_markdown(df: pd.DataFrame) -> str:
    """Convert a DataFrame to a markdown table string."""
    try:
        return df.to_markdown(index=False)
    except Exception:
        # Fallback to CSV if markdown fails
        return df.to_csv(index=False)


def clean_text_content(text: str) -> str:
    """Clean text content by removing problematic characters."""
    if not text:
        return ""

    # Remove NUL characters (0x00)
    text = text.replace("\x00", "")

    # Remove other control characters except newlines and tabs
    text = re.sub(r"[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]", "", text)

    # Normalize whitespace
    text = re.sub(r"\s+", " ", text)

    # Remove leading/trailing whitespace
    text = text.strip()

    return text


def process_file(
    file_content: bytes,
    file_extension: str,
    original_filename: str,
    userId: str,
    db: Session = None,  # Make database optional
) -> dict:
    """Process uploaded file with optimized chunking and Qdrant integration."""
    try:
        text_content = ""
        financial_analysis = {}

        # Remove database user creation - AI service should not manage users
        # The backend is responsible for user management

        if file_extension.lower() == ".pdf":
            doc = None
            try:
                doc = fitz.open(stream=file_content, filetype="pdf")
            except fitz.FileDataError as e:
                log_to_backend(
                    "error", f"Failed to open PDF file '{original_filename}': {str(e)}"
                )
                raise ValueError(
                    f"PDF file '{original_filename}' appears to be corrupted or broken. Please try uploading a valid PDF file."
                )
            except Exception as e:
                log_to_backend(
                    "error",
                    f"Unexpected error opening PDF file '{original_filename}': {str(e)}",
                )
                raise ValueError(
                    f"Failed to process PDF file '{original_filename}': {str(e)}"
                )

            try:
                for page in doc:
                    # Extract selectable text first
                    page_text = page.get_text()
                    text_content += page_text

                    # If no text was extracted, the page might be scanned/image-based
                    if not page_text.strip() and OCR_ENABLED:
                        log_to_backend(
                            "info",
                            f"Page {page.number + 1} appears to be image-based, running OCR...",
                        )
                        try:
                            # Render page as image for OCR
                            pix = page.get_pixmap(dpi=OCR_DPI)  # Use configured DPI
                            img = Image.frombytes(
                                "RGB", [pix.width, pix.height], pix.samples
                            )

                            # Run OCR on the page image
                            ocr_text = pytesseract.image_to_string(
                                img, lang=OCR_LANGUAGE, config=OCR_CONFIG
                            )
                            if ocr_text.strip():
                                text_content += (
                                    f"\n[OCR Page {page.number + 1}]:\n{ocr_text}\n"
                                )
                                log_to_backend(
                                    "info",
                                    f"OCR extracted {len(ocr_text)} characters from page {page.number + 1}",
                                )
                            else:
                                log_to_backend(
                                    "warning",
                                    f"No text found via OCR on page {page.number + 1}",
                                )
                        except Exception as e:
                            log_to_backend(
                                "error",
                                f"OCR failed on page {page.number + 1}: {str(e)}",
                            )
                    elif not page_text.strip() and not OCR_ENABLED:
                        log_to_backend(
                            "warning",
                            f"Page {page.number + 1} appears to be image-based but OCR is disabled",
                        )

                    # Also extract text from embedded images in the page
                    if OCR_ENABLED:
                        try:
                            for img_index, img in enumerate(page.get_images(full=True)):
                                xref = img[0]
                                base_image = doc.extract_image(xref)
                                image_bytes = base_image["image"]
                                image = Image.open(io.BytesIO(image_bytes))

                                # Run OCR on embedded image
                                ocr_text = pytesseract.image_to_string(
                                    image, lang=OCR_LANGUAGE, config=OCR_CONFIG
                                )
                                if ocr_text.strip():
                                    text_content += f"\n[OCR Page {page.number + 1} Image {img_index + 1}]:\n{ocr_text}\n"
                                    log_to_backend(
                                        "info",
                                        f"OCR extracted {len(ocr_text)} characters from image {img_index + 1} on page {page.number + 1}",
                                    )
                        except Exception as e:
                            log_to_backend(
                                "warning",
                                f"Failed to process embedded images on page {page.number + 1}: {str(e)}",
                            )
            finally:
                if doc:
                    doc.close()
        elif file_extension.lower() in [".docx", ".doc"]:
            # Create a BytesIO object from the file content
            doc_stream = io.BytesIO(file_content)
            doc = docx.Document(doc_stream)
            for para in doc.paragraphs:
                text_content += para.text + "\n"
        elif file_extension.lower() == ".txt":
            # Handle plain text files
            try:
                # Try UTF-8 first
                text_content = file_content.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    # Fallback to UTF-8 with error handling
                    text_content = file_content.decode("utf-8", errors="replace")
                except Exception:
                    # Final fallback to latin-1
                    text_content = file_content.decode("latin-1", errors="replace")
        elif file_extension.lower() in [".xlsx", ".xls", ".csv"]:
            file_stream = io.BytesIO(file_content)
            try:
                if file_extension.lower() == ".csv":
                    df = pd.read_csv(file_stream)
                    text_content = df_to_markdown(df)
                else:
                    xls = pd.ExcelFile(file_stream)
                    sheet_names = xls.sheet_names
                    sheet_tables = []
                    for idx, sheet in enumerate(sheet_names):
                        df_sheet = pd.read_excel(xls, sheet_name=sheet)
                        sheet_tables.append(
                            f"Sheet: {sheet}\n\n{df_to_markdown(df_sheet)}\n"
                        )
                        if idx == 0:
                            df = df_sheet  # Use first sheet for financial analysis
                    text_content = "\n\n".join(sheet_tables)
                # Perform financial analysis on the first sheet only
                financial_analysis = analyze_financial_data(df)
            except Exception as e:
                print(f"Error processing file: {str(e)}")
                raise ValueError(f"Error processing file: {str(e)}")
        elif file_extension.lower() in [
            ".png",
            ".jpg",
            ".jpeg",
            ".bmp",
            ".tiff",
            ".tif",
        ]:
            # Handle image files with OCR
            if not OCR_ENABLED:
                raise ValueError(
                    f"OCR is disabled. Cannot process image file: {file_extension}"
                )

            try:
                image = Image.open(io.BytesIO(file_content))

                # Convert to RGB if necessary (for better OCR accuracy)
                if image.mode != "RGB":
                    image = image.convert("RGB")

                # Run OCR on the image
                ocr_text = pytesseract.image_to_string(
                    image, lang=OCR_LANGUAGE, config=OCR_CONFIG
                )
                if ocr_text.strip():
                    text_content = ocr_text
                    log_to_backend(
                        "info",
                        f"OCR extracted {len(ocr_text)} characters from image {original_filename}",
                    )
                else:
                    log_to_backend(
                        "warning", f"No text found via OCR in image {original_filename}"
                    )
                    text_content = (
                        f"[Image file: {original_filename} - No text detected via OCR]"
                    )
            except Exception as e:
                log_to_backend(
                    "error",
                    f"Failed to process image file {original_filename}: {str(e)}",
                )
                raise ValueError(f"Error processing image file: {str(e)}")
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")

        # Clean text content before chunking
        cleaned_text_content = clean_text_content(text_content)

        # Generate a unique document ID for vector storage
        document_id = str(uuid.uuid4())

        # Optimize chunks with page tracking
        chunks_with_pages = optimize_chunk_size_with_pages(
            cleaned_text_content, file_extension, file_content
        )
        total_chunks = len(chunks_with_pages)

        # Store chunks directly in Qdrant (no database storage for chunks)
        if qdrant_client:
            try:
                points = []
                for idx, chunk_data in enumerate(chunks_with_pages):
                    embedding = get_cached_embedding(chunk_data["text"])
                    points.append(
                        PointStruct(
                            id=str(uuid.uuid4()),
                            vector=embedding,
                            payload={
                                "document_id": document_id,
                                "user_id": userId,
                                "content": chunk_data["text"],
                                "filename": original_filename,
                                "chunk_index": idx,
                                "page_number": chunk_data.get("page_number"),
                                "start_char": chunk_data.get("start_char"),
                                "end_char": chunk_data.get("end_char"),
                                "file_type": file_extension.lower().lstrip("."),
                            },
                        )
                    )

                qdrant_client.upsert(collection_name=qdrant_collection, points=points)
                print(
                    f"Upserted {len(points)} chunks to Qdrant for document {document_id}"
                )
            except Exception as e:
                print(f"Warning: Failed to upsert to Qdrant: {str(e)}")
                # Continue processing even if Qdrant fails

        return {
            "chunks": total_chunks,
            "document_id": document_id,
            "content": cleaned_text_content,
            "filename": original_filename,
            "file_size": len(file_content),
            "file_type": file_extension.lower().lstrip("."),
            "pages": len(
                [c for c in chunks_with_pages if c.get("page_number") is not None]
            ),
        }

    except Exception as e:
        # db.rollback() # Removed database operations
        raise e


router = APIRouter()
security = HTTPBearer()


def derive_encryption_key(secret: str) -> bytes:
    """Derive the encryption key using HKDF, matching NextAuth.js implementation."""
    if not secret:
        raise ValueError("NEXTAUTH_SECRET is not set")

    # Convert the secret to bytes
    secret_bytes = secret.encode()

    # Use HKDF to derive the key
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,  # 32 bytes for AES-256
        salt=b"",  # NextAuth.js uses no salt
        info=b"NextAuth.js Generated Encryption Key",
        backend=default_backend(),
    )
    return hkdf.derive(secret_bytes)


def decrypt_token(token: str) -> dict:
    """Decrypt a NextAuth.js JWE token."""
    try:
        # Split the token into its components
        header_b64, _, iv_b64, ciphertext_b64, tag_b64 = token.split(".")

        # Decode the header
        header_padding = "=" * (-len(header_b64) % 4)
        header = json.loads(base64.urlsafe_b64decode(header_b64 + header_padding))

        if header.get("alg") != "dir" or header.get("enc") != "A256GCM":
            raise ValueError("Unsupported JWE algorithm or encryption")

        # Decode the other components
        iv = base64.urlsafe_b64decode(iv_b64 + "=" * (-len(iv_b64) % 4))
        ciphertext = base64.urlsafe_b64decode(
            ciphertext_b64 + "=" * (-len(ciphertext_b64) % 4)
        )
        tag = base64.urlsafe_b64decode(tag_b64 + "=" * (-len(tag_b64) % 4))

        # Derive the key using HKDF
        key = derive_encryption_key(settings.NEXTAUTH_SECRET)

        # Create AESGCM cipher
        aesgcm = AESGCM(key)

        # Decrypt the payload
        plaintext = aesgcm.decrypt(iv, ciphertext + tag, header_b64.encode())

        # Parse and return the decrypted payload
        return json.loads(plaintext)

    except Exception as e:
        print(f"Error decrypting token: {str(e)}")
        print(traceback.format_exc())
        raise


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Get current user from Next.js session token."""
    try:
        token = credentials.credentials
        print(f"Received token: {token[:20]}...")

        # Enhanced debugging
        print(f"Token length: {len(token)}")
        print(f"Token parts: {len(token.split('.'))}")
        print(
            f"Token format: {'JWE' if len(token.split('.')) == 5 else 'JWT' if len(token.split('.')) == 3 else 'Unknown'}"
        )

        # Print NEXTAUTH_SECRET for debugging
        secret = settings.NEXTAUTH_SECRET
        print(f"Using NEXTAUTH_SECRET: {secret[:5] if secret else 'Not set'}...")
        print(f"NEXTAUTH_SECRET length: {len(secret) if secret else 0}")

        # Decrypt the token
        try:
            payload = decrypt_token(token)
            print("Successfully decrypted token")
            print(f"Decoded payload: {json.dumps(payload, indent=2)}")

            # Check if user is active
            user_id = payload.get("id")
            if user_id:
                # Removed database user lookup - AI service should not manage users
                # The backend is responsible for user management
                pass  # No user lookup needed here

            return payload
        except Exception as e:
            print(f"Token decryption error: {str(e)}")
            raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

    except Exception as e:
        print(f"Authentication error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


@router.post("/upload")
async def upload_files(
    files: List[UploadFile] = File(...),
    userId: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    api_key: str = Header(..., alias="X-API-Key"),
    db: Session = Depends(get_db),
):
    """Upload one or more documents (PDF, DOC, DOCX, TXT, CSV, XLS, XLSX) for processing."""
    try:
        # Validate API key
        if api_key != settings.BACKEND_API_KEY:
            raise HTTPException(status_code=401, detail="Invalid API key")

        # For now, we'll need to get user ID from the request or use a default
        # You might want to pass user ID in the form data or header
        if not userId:
            raise HTTPException(status_code=400, detail="User ID is required")

        log_to_backend("info", f"Processing upload for user: {userId}")

        # Ensure Qdrant collection exists before processing files
        if not ensure_qdrant_collection_exists():
            log_to_backend("error", "Failed to ensure Qdrant collection exists")
            raise HTTPException(status_code=500, detail="Vector database setup failed")

        total_chunks = 0
        processed_documents = []

        for file in files:
            log_to_backend("info", f"Processing file: {file.filename}")

            # Read file content
            content = await file.read()

            # Debug logging
            log_to_backend(
                "info",
                f"File details: filename={file.filename}, size={file.size}, content_length={len(content) if content else 0}",
            )

            if not content:
                log_to_backend("error", f"File content is empty for {file.filename}")
                raise HTTPException(
                    status_code=400, detail=f"File '{file.filename}' content is empty"
                )

            # Validate file content
            if not content or len(content) == 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"File '{file.filename}' is empty or could not be read",
                )

            # Check file size limit (50MB)
            if len(content) > 50 * 1024 * 1024:
                raise HTTPException(
                    status_code=400,
                    detail=f"File '{file.filename}' is too large. Maximum file size is 50MB.",
                )

            # Get file extension
            _, ext = os.path.splitext(file.filename)

            # Validate PDF files have proper header
            if ext.lower() == ".pdf":
                if not content.startswith(b"%PDF"):
                    raise HTTPException(
                        status_code=400,
                        detail=f"File '{file.filename}' does not appear to be a valid PDF file",
                    )
                # Check for minimum PDF size (PDF files should be at least 100 bytes)
                if len(content) < 100:
                    raise HTTPException(
                        status_code=400,
                        detail=f"File '{file.filename}' appears to be too small to be a valid PDF file",
                    )

            try:
                # Process the document (no database operations)
                document_info = process_file(
                    file_content=content,
                    file_extension=ext,
                    original_filename=file.filename,
                    userId=userId,
                    db=None,  # No database operations in AI service
                )
                total_chunks += document_info.get("chunks")
                processed_documents.append(document_info)

                log_to_backend(
                    "info",
                    f"Processed {document_info.get('chunks')} chunks from {file.filename}",
                )
            except ValueError as e:
                # Handle specific validation errors (like corrupted PDFs)
                error_msg = f"Error processing file {file.filename}: {str(e)}"
                log_to_backend("error", error_msg)
                raise HTTPException(status_code=400, detail=str(e))
            except Exception as e:
                error_msg = f"Error processing file {file.filename}"
                log_to_backend("error", error_msg, error=e)
                raise HTTPException(
                    status_code=500, detail=f"Error processing document: {str(e)}"
                )

        return {
            "message": f"Successfully processed {len(files)} files",
            "total_chunks": total_chunks,
            "documents": processed_documents,
            "user": {
                "id": userId,
                "name": "User",  # We don't have user details from API key auth
                "email": "user@example.com",
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        log_to_backend("error", "Unexpected error in upload_files", error=e)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while processing your upload",
        )


@router.post("/query")
async def query_documents(
    query: str = Form(...),
    userId: Optional[str] = Form(None),
    limit: int = Form(10),
    mode: Optional[str] = Form("search"),  # "search" or "qa"
    context: Optional[str] = Form(None),
    api_key: str = Header(..., alias="X-API-Key"),
    db: Session = Depends(get_db),
):
    """Query documents - supports both search and Q&A modes."""
    try:
        # Validate API key
        if api_key != settings.BACKEND_API_KEY:
            raise HTTPException(status_code=401, detail="Invalid API key")

        if not userId:
            raise HTTPException(status_code=400, detail="User ID is required")

        if not qdrant_client:
            raise HTTPException(status_code=500, detail="Qdrant client not available")

        # Generate embedding for the query
        query_embedding = get_cached_embedding(query)

        # Search in Qdrant
        search_results = qdrant_client.search(
            collection_name=qdrant_collection,
            query_vector=query_embedding,
            limit=limit,
            query_filter={"must": [{"key": "user_id", "match": {"value": userId}}]},
            with_payload=True,
            with_vectors=False,
        )

        if not search_results:
            if mode == "qa":
                return {
                    "question": query,
                    "answer": "I couldn't find any relevant documents to answer your question. Please make sure you have uploaded documents and try asking a different question.",
                    "sources": [],
                    "confidence": 0.0,
                }
            else:
                return {
                    "query": query,
                    "results": [],
                    "total_results": 0,
                }

        # Format results with page numbers and file information
        formatted_results = []
        for result in search_results:
            payload = result.payload
            formatted_results.append(
                {
                    "score": result.score,
                    "content": payload.get("content", ""),
                    "filename": payload.get("filename", ""),
                    "page_number": payload.get("page_number"),
                    "chunk_index": payload.get("chunk_index"),
                    "document_id": payload.get("document_id"),
                    "file_type": payload.get("file_type"),
                    "start_char": payload.get("start_char"),
                    "end_char": payload.get("end_char"),
                }
            )

        # If mode is "qa", generate an answer
        if mode == "qa":
            # Create a simple answer based on search results
            answer = f"Based on the documents I found, here's what I can tell you about '{query}':\n\n"
            answer += "The most relevant information from your documents includes:\n"

            for i, result in enumerate(formatted_results[:3], 1):  # Top 3 sources
                answer += f"{i}. {result['content'][:200]}...\n"

            answer += f"\n\nThis answer is based on {len(formatted_results)} relevant document sections."

            return {
                "question": query,
                "answer": answer,
                "sources": formatted_results,
                "confidence": min(
                    0.8, max(0.3, search_results[0].score if search_results else 0.3)
                ),
            }
        else:
            # Return search results
            return {
                "query": query,
                "results": formatted_results,
                "total_results": len(formatted_results),
            }

    except HTTPException:
        raise
    except Exception as e:
        log_to_backend("error", "Unexpected error in query_documents", error=e)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while processing your query",
        )
