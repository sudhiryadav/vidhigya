import json
import os
import time

import modal

# Fix NumPy compatibility issue
import numpy as np

if np.__version__.startswith("2"):
    print("Warning: NumPy 2.x detected, this may cause compatibility issues")

import re
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

# Initialize Modal app.
# NOTE: This MUST stay distinct from the existing "qurieus-app-*" deployment.
# Modal endpoint URLs are derived from the `label=` on each fastapi_endpoint
# (not the app name), so every label below is also prefixed with `vidhigya-`
# to guarantee no URL collision with the Qurieus deployment in the same workspace.
app = modal.App("vidhigya")

def _modal_expected_api_key() -> Optional[str]:
    """Must match backend AI_SERVICE_API_KEY (or MODAL_API_KEY). Modal secret QURIEUS_KEY may define API_KEY or AI_SERVICE_API_KEY."""
    return os.environ.get("API_KEY") or os.environ.get("AI_SERVICE_API_KEY")

# Hugging Face token (no longer directly used for llama-cpp-python wheel download, but kept if other HF models/data are used later)
HF_TOKEN = "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"

# Create a custom Modal image with all dependencies installed at deployment time
cuda_version = "12.1.0"
flavor = "devel"
operating_sys = "ubuntu22.04"
tag = f"{cuda_version}-{flavor}-{operating_sys}"

image = (
    modal.Image.from_registry(f"nvidia/cuda:{tag}", add_python="3.10")
    .apt_install(
        "git", "cmake", "build-essential", "wget"
    )  # Added wget back for general utility
    .pip_install(
        "sentence-transformers",
        "PyMuPDF",
        "python-docx",
        "pandas",
        "fastapi",
        "uvicorn",
        "langdetect",
        "openpyxl",
        "tabulate",
        "xlrd",
        "numpy<2.0",
        "requests",
        "qdrant-client",
        # --- CRITICAL FIX: Pin the llama-cpp-python version ---
        # Ensure this matches the version found in the cu121 index, e.g., 0.3.4 or the latest
        "llama-cpp-python==0.3.4",
        extra_index_url="https://abetlen.github.io/llama-cpp-python/whl/cu121",
    )
    # --- PyTorch for CUDA 12.1 (using a specific version for stability) ---
    .pip_install(
        "torch==2.4.1", extra_index_url="https://download.pytorch.org/whl/cu121"
    )
)

# Create persistent volume for storing documents and embeddings
volume = modal.Volume.from_name("qurieus-documents", create_if_missing=True)

# Model download logic (at container start)
#
# We deliberately moved OFF Mistral-7B-Instruct-v0.2 Q4_K_M. That model is
# small AND heavily quantized, and in practice was:
#   (1) ignoring negative instructions ("Do NOT describe what the document
#       does NOT contain" — it still appended hedging boilerplate),
#   (2) treating prior chat turns as if they were ground truth about the
#       document, so when an earlier answer was wrong the next answer
#       inherited the hallucination,
#   (3) producing boilerplate summaries that skipped the actual "grounds /
#       cruelty / facts" sections of petitions.
#
# Llama-3.1-8B-Instruct at Q5_K_M is roughly the same memory footprint
# (~5.7 GB), fits on the same L40S GPU, and is dramatically stronger at
# (a) instruction following under negative constraints, (b) long-context
# factual grounding, and (c) Indic-English mixed text (useful because many
# of our scanned filings are Hindi + English cover pages).
#
# llama-cpp-python 0.3.4 already knows the Llama-3 chat template — we call
# `create_chat_completion(...)` below and let the library apply the correct
# tokens, instead of hand-rolling `[INST] ... [/INST]` (which is Mistral's
# format and is WRONG for Llama-3 models).
MODEL_URL = (
    "https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/"
    "Meta-Llama-3.1-8B-Instruct-Q5_K_M.gguf"
)
MODEL_PATH = "/data/models/Meta-Llama-3.1-8B-Instruct-Q5_K_M.gguf"


def download_model():
    import os

    import requests

    if not os.path.exists(MODEL_PATH):
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        print(f"Model not found at {MODEL_PATH}. Downloading Mistral GGUF model...")
        start_time = time.time()  # Start timing
        r = requests.get(MODEL_URL, stream=True)
        r.raise_for_status()  # Raise an HTTPError for bad responses (4xx or 5xx)
        total_size = int(r.headers.get("content-length", 0))
        downloaded_size = 0
        with open(MODEL_PATH, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
                downloaded_size += len(chunk)
                # print(f"Downloaded {downloaded_size / (1024*1024):.2f}MB / {total_size / (1024*1024):.2f}MB", end='\r')
        end_time = time.time()  # End timing
        print(
            f"Model downloaded and saved to volume in {end_time - start_time:.2f} seconds."
        )
    else:
        print(f"Model already exists at {MODEL_PATH}, skipping download.")


# Global model instances for caching
llm = None
embedding_model = None


def get_embedding_model():
    """Get cached embedding model instance."""
    global embedding_model
    if embedding_model is None:
        print("Initializing embedding model...")
        # Use a better model for document Q&A
        embedding_model = SentenceTransformer("BAAI/bge-small-en-v1.5", device="cuda")
        print("Embedding model initialized successfully")
    return embedding_model


def get_llama_model():
    """Get cached LLM model instance."""
    global llm
    if llm is None:
        # Model should already be downloaded during container startup
        if not os.path.exists(MODEL_PATH):
            raise RuntimeError(
                f"Model not found at {MODEL_PATH}. Please ensure model was downloaded during container startup."
            )

        print("Loading Llama model with n_gpu_layers=28...")
        try:
            from llama_cpp import Llama

            print(f"Model path exists: {os.path.exists(MODEL_PATH)}")
            print(
                f"Model file size: {os.path.getsize(MODEL_PATH) if os.path.exists(MODEL_PATH) else 'N/A'} bytes"
            )

            llm = Llama(
                model_path=MODEL_PATH,
                # Llama-3.1 supports 128K context natively. We set 8192 — big
                # enough to hold a document profile + ~6k chars of retrieved
                # context + a short conversation + the instructions, without
                # the KV-cache blowing up memory on an L40S under concurrency.
                n_ctx=8192,
                n_threads=8,
                # -1 means "offload every layer to GPU". On L40S (48 GB) the
                # Q5_K_M 8B model (~5.7 GB + KV cache) comfortably fits. Full
                # offload is a significant speedup vs partial offload, and
                # Llama-3.1 has no layers that need to stay on CPU.
                n_gpu_layers=-1,
                # Let llama-cpp pick the chat template from the GGUF metadata
                # (Llama-3 format). We invoke create_chat_completion(...) with
                # structured messages below, so we never hand-roll tags.
                chat_format=None,
                verbose=False,
            )

            print(f"Llama model loaded successfully!")

        except Exception as e:
            print(f"Error loading model for get_llama_model: {e}")
            raise RuntimeError(
                f"Failed to load model with GPU support: {e}. Check model path, n_gpu_layers, and CUDA installation."
            )

    return llm


# Initialize models at container startup
def initialize_models_at_startup():
    """Initialize both models during container startup to avoid cold starts."""
    try:
        print("🚀 Initializing models at container startup...")

        # Download model if needed
        download_model()

        # Preload embedding model
        print("Preloading embedding model...")
        embedding_model = get_embedding_model()
        print("✅ Embedding model preloaded")

        # Preload LLM model
        print("Preloading LLM model...")
        llm_model = get_llama_model()
        print("✅ LLM model preloaded")

        # Test inference to ensure models are ready
        print("Testing models...")
        test_embedding = embedding_model.encode("test query").tolist()
        print(f"✅ Embedding test successful, vector length: {len(test_embedding)}")

        test_output = llm_model.create_chat_completion(
            messages=[{"role": "user", "content": "Say hello in one word."}],
            max_tokens=10,
            temperature=0.1,
            stream=False,
        )
        _test_msg = (
            test_output.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        print(f"✅ LLM test successful: {_test_msg[:40]!r}")

        print("🎉 All models initialized and ready!")
        return True

    except Exception as e:
        print(f"❌ Model initialization failed: {e}")
        return False


def ensure_models_loaded():
    """
    Lightweight per-request guard.

    Avoids running warmup inference on every query request while still ensuring
    model artifacts are present and model singletons are initialized.
    """
    if not os.path.exists(MODEL_PATH):
        download_model()
    get_embedding_model()
    get_llama_model()


# Note: Model initialization will happen inside Modal functions when they first run
print("🔄 Modal service starting - models will be initialized on first request...")

# Create the FastAPI app
web_app = FastAPI(title="Qurieus GPU Service with Persistent Storage", version="1.0.0")


def verify_api_key(x_api_key: str = Header(...)):
    expected = _modal_expected_api_key()
    if not expected or x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid API Key")


class DocumentRequest(BaseModel):
    file_content: str  # base64 encoded
    file_extension: str
    original_filename: str
    user_id: str


class QueryRequest(BaseModel):
    query: str
    user_id: str
    history: Optional[List[dict]] = None
    collection_name: Optional[str] = None  # Allow collection override
    document_id: Optional[str] = None  # Optional: restrict retrieval to a single document


class ExtractMetadataRequest(BaseModel):
    """
    Request for generic document-profile extraction.

    Kept domain-agnostic on purpose — the same endpoint is used for legal filings,
    contracts, invoices, medical reports, letters, etc.
    """

    text: str  # Concatenated OCR/extracted text from the first few pages.
    filename: Optional[str] = None


# ---------------------------------------------------------------------------
# Query-intent helpers
# ---------------------------------------------------------------------------

# Broad, domain-agnostic patterns that indicate the user wants a whole-document
# overview rather than needle-in-haystack retrieval. RAG is the wrong tool for
# these — we bypass vector search and feed document-header + top-of-document
# context straight to the LLM.
_SUMMARY_INTENT_PATTERNS = [
    r"\bsummari[sz]e\b",
    r"\bsummary\b",
    r"\bbrief(?:ing)?\b",
    r"\boverview\b",
    r"\btl;?dr\b",
    r"\bgist\b",
    r"\bkey points?\b",
    r"\bmain points?\b",
    r"\bwhat(?:'| i)?s (?:this|the) document\b",
    r"\bwhat (?:is|are) (?:this|these|the) (?:document|file|pdf)s?\b",
    r"\babout (?:this|the|uploaded) (?:document|file|pdf)s?\b",
    r"\btell me about (?:this|the|uploaded) (?:document|file|pdf)s?\b",
    r"\bexplain (?:this|the) (?:document|file|pdf)s?\b",
    r"\b(?:parties|petitioner|respondent|plaintiff|defendant|vendor|client|patient|subject)\b",
    r"\b(?:case|matter|reference|invoice|file) (?:number|no\.?|id)\b",
    r"\bwho (?:is|are) (?:the|this)\b",
    r"\bwhat kind of (?:document|file)\b",
    # Party-name questions — these must go through the summary-intent path
    # so the authoritative [Document Profile] block gets prepended instead
    # of random later-page chunks (signatures, stamps, phone numbers) being
    # vector-retrieved and reported as people.
    r"\bname[s]? of (?:the )?(?:people|parties|parties involved|individuals|person|plaintiff|defendant|petitioner|respondent)\b",
    r"\bwhat (?:are )?(?:the )?names?\b",
    r"\bname[s]? (?:in|of) (?:this|the) (?:document|case|matter|file|pdf)\b",
    # Section / Act citation questions
    r"\b(?:which|what) (?:is )?(?:the )?(?:section|act|law|statute)\b",
    r"\bsection\s+\d",
    r"\bunder (?:which|what) (?:section|act|law)\b",
]
_SUMMARY_INTENT_REGEX = re.compile("|".join(_SUMMARY_INTENT_PATTERNS), re.IGNORECASE)


def _render_profile_block(chunks: List[Any]) -> str:
    """
    Reconstruct an authoritative ``[Document Profile]`` block from the payload
    fields stored on header / summary chunks at upload time. The LLM treats
    this block as the single source of truth for document identity, so we
    keep it compact and structured.

    Any profile value that looks like OCR gibberish (letters ratio too low,
    all single-letter tokens, >=3 unusual punctuation run) is dropped HERE
    rather than rendered — otherwise a bad profile stored from a prior
    upload would silently poison every subsequent answer.
    """
    if not chunks:
        return ""
    lines: List[str] = ["[Document Profile]"]
    seen_files: set = set()
    any_field = False
    for pt in chunks:
        payload = getattr(pt, "payload", None) or {}
        filename = (payload.get("filename") or "").strip() or "Unknown"
        if filename in seen_files:
            continue
        seen_files.add(filename)
        dtype_raw = _clean_name_value(str(payload.get("document_type") or ""))
        title_raw = _clean_name_value(str(payload.get("document_title") or ""))
        dtype = "" if _looks_like_junk_value(dtype_raw) else dtype_raw
        title = "" if _looks_like_junk_value(title_raw) else title_raw
        parties = _filter_parties(payload.get("parties") or [])
        ids = _filter_value_list(
            payload.get("key_identifiers") or [], max_items=6, drop_junk=False
        )
        topics = _filter_value_list(payload.get("key_topics") or [], max_items=8)
        summary_raw = (payload.get("document_summary") or "").strip()
        # Summary is a long free-form paragraph; don't junk-reject it just
        # because it contains a few noisy tokens, only if it's short AND junk.
        summary = (
            summary_raw
            if summary_raw and (len(summary_raw) > 80 or not _looks_like_junk_value(summary_raw))
            else ""
        )

        lines.append(f"- Filename: {filename}")
        if dtype:
            lines.append(f"  Type: {dtype}")
            any_field = True
        if title:
            lines.append(f"  Title: {title}")
            any_field = True
        if parties:
            lines.append("  Parties (copy names EXACTLY as shown here):")
            for p in parties[:8]:
                lines.append(f"    - {p}")
            any_field = True
        else:
            lines.append(
                "  Parties: NOT RELIABLY EXTRACTED — do NOT guess party names from the excerpt."
            )
        if ids:
            lines.append(f"  Identifiers: {'; '.join(ids)}")
            any_field = True
        if topics:
            lines.append(f"  Topics: {', '.join(topics)}")
            any_field = True
        if summary:
            lines.append(f"  Summary: {summary}")
            any_field = True
    lines.append("[/Document Profile]")
    return "\n".join(lines) if any_field else ""


def detect_summary_intent(query: str) -> bool:
    """Return True if the query is better answered by 'read the whole doc' than by RAG."""
    if not query:
        return False
    return bool(_SUMMARY_INTENT_REGEX.search(query))


# ---------------------------------------------------------------------------
# Output sanitisation — strip hallucinated "does not contain" hedges
# ---------------------------------------------------------------------------
#
# Even with Llama-3.1 and strong negative-instruction prompting, quantized
# local models occasionally append a hedge sentence like:
#
#     "However, the document does not provide further context regarding
#      the nature of their disputes."
#
# These sentences are almost always wrong in our workload: they're inserted
# as padding when the model runs out of confident things to say, and they
# pattern-match to things the user's lawyer will correctly flag as false.
# Every passing layer of prompt instructions has asked the model not to
# emit them; this is the backstop.
#
# We delete trailing sentences (or bullet lines) whose body fits one of
# these common hedge shapes AND that sit at the END of the output. We
# deliberately do NOT remove mid-answer hedges — those can be legitimate
# (e.g. "the document does not disclose the respondent's current address"
# is sometimes the correct answer for a specific question).

_HEDGE_SENTENCE_RE = re.compile(
    r"""
    (?:^|[\n.!?])
    \s*
    (?:however\s*,?\s+|additionally\s*,?\s+|furthermore\s*,?\s+|but\s+)?
    (?:the\s+)?document\s+
    (?:does\s+not|doesn'?t|fails\s+to|provides?\s+no|contains?\s+no|
       offers?\s+no|gives?\s+no|mentions?\s+no|details?\s+no)
    [^.!?\n]{0,220}
    (?:\.|!|\?|$)
    """,
    flags=re.IGNORECASE | re.VERBOSE,
)


def _strip_hedges(text: str) -> str:
    """
    Remove trailing 'document does not contain …' boilerplate sentences.

    Safe on streaming fragments: only strips matches that end at the tail
    of the fragment, so we don't accidentally chop the middle of a running
    sentence the user would have otherwise received cleanly.
    """
    if not text:
        return text
    stripped = text
    # Loop so "However, ... . Additionally, the document does not ..." gets
    # both trailing hedges removed, not just the outermost one.
    for _ in range(4):
        m = list(_HEDGE_SENTENCE_RE.finditer(stripped))
        if not m:
            break
        last = m[-1]
        # Only strip if the match sits at (or very near) the tail. This
        # prevents us from nuking a mid-paragraph disclosure that the user
        # legitimately asked for.
        tail_start = last.start()
        trailing_after = stripped[last.end():].strip()
        if trailing_after:
            break
        stripped = stripped[:tail_start].rstrip()
        if not stripped:
            break
    return stripped


# Upload endpoint
# Upload endpoint removed - now handled by FastAPI backend with Qdrant


# Query endpoint (GPU for LLM) - Updated to use Qdrant
@app.function(
    image=image,
    # gpu="T4",
    # gpu="A10G",
    gpu="L40S",
    timeout=300,
    memory=8192,
    volumes={"/data": volume},
    secrets=[modal.Secret.from_name("QURIEUS_KEY")],
)
@modal.fastapi_endpoint(docs=True, label="vidhigya-query", method="POST")
async def query_documents_endpoint(
    request: QueryRequest,
    x_api_key: str = Header(...),
    x_collection: Optional[str] = Header(None),
):
    start_time = time.time()
    try:
        print("=== Query Endpoint Started ===")
        verify_api_key(x_api_key)
        print("API Key verification passed")

        # Ensure models are ready without expensive warmup inference.
        ensure_models_loaded()

    except Exception as e:
        print(f"API Key verification failed: {e}")
        raise

    try:
        query = request.query
        user_id = request.user_id
        history = request.history
        print(f"Processing query: '{query}' for user: {user_id}")
        if history and len(history) > 0:
            print(
                f"Received conversation history with {len(history)} previous Q&A pairs"
            )
        else:
            print("No conversation history provided")

        # Get Qdrant configuration from environment
        qdrant_url = os.environ.get("QDRANT_URL")
        qdrant_api_key = os.environ.get("QDRANT_API_KEY")

        # Determine collection name: header override > request body > environment default
        default_collection = os.environ.get("QDRANT_COLLECTION")
        qdrant_collection = (
            x_collection or request.collection_name or default_collection
        )

        print(f"Using Qdrant collection: {qdrant_collection}")

        # Initialize Qdrant client
        try:
            from qdrant_client import QdrantClient
            from qdrant_client.models import Filter, FieldCondition, MatchValue

            if qdrant_api_key:
                qdrant_client = QdrantClient(
                    url=qdrant_url, check_compatibility=False, api_key=qdrant_api_key
                )
            else:
                qdrant_client = QdrantClient(qdrant_url, check_compatibility=False)

            print(f"Connected to Qdrant: {qdrant_url}")
        except Exception as e:
            print(f"Failed to connect to Qdrant: {e}")
            from fastapi.responses import StreamingResponse

            def generate_qdrant_error_stream():
                yield f"data: {json.dumps({'response': 'I am having trouble accessing your documents right now. Please try again in a moment.', 'sources': [], 'done': True})}\n\n"

            return StreamingResponse(
                generate_qdrant_error_stream(),
                media_type="text/plain",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                },
            )

        # Generate query embedding using cached model
        embedding_start = time.time()
        try:
            embedding_model = get_embedding_model()
            query_embedding = embedding_model.encode(query).tolist()
            print(
                f"PERFLOG: Query embedding generated in {time.time() - embedding_start:.2f}s"
            )
        except Exception as e:
            print(f"Failed to generate query embedding: {e}")
            from fastapi.responses import StreamingResponse

            def generate_embedding_error_stream():
                yield f"data: {json.dumps({'response': 'I am having trouble understanding your question. Please try rephrasing it.', 'sources': [], 'done': True})}\n\n"

            return StreamingResponse(
                generate_embedding_error_stream(),
                media_type="text/plain",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                },
            )

        # ------------------------------------------------------------------
        # Retrieval strategy
        # ------------------------------------------------------------------
        # Two modes:
        #
        #  1. Summary-intent queries (e.g. "brief me about the uploaded doc",
        #     "who are the parties", "what is this file about") bypass vector
        #     search entirely and instead read the document profile (header
        #     chunk stored at upload time) + a first-pages window, because
        #     similarity to "brief me..." never matches cover-page text.
        #
        #  2. Needle queries do the usual vector search, but with:
        #     - bigger top-k for long docs,
        #     - first-page bias (always inject at least one page-1 chunk),
        #     - the document header chunk prepended so the LLM always knows
        #       which document / parties it is talking about.
        # ------------------------------------------------------------------
        summary_intent = detect_summary_intent(query)
        print(f"PERFLOG: Summary intent detected: {summary_intent}")

        search_start = time.time()
        filter_conditions = [
            FieldCondition(key="user_id", match=MatchValue(value=user_id))
        ]
        if request.document_id:
            filter_conditions.append(
                FieldCondition(
                    key="document_id", match=MatchValue(value=request.document_id)
                )
            )
        query_filter = Filter(must=filter_conditions)

        # Header chunks: seeded at upload time. Fetching these is cheap via scroll.
        header_chunks: List[Any] = []
        try:
            header_filter = Filter(
                must=filter_conditions
                + [
                    FieldCondition(
                        key="chunk_kind", match=MatchValue(value="summary")
                    )
                ]
            )
            header_scroll, _ = qdrant_client.scroll(
                collection_name=qdrant_collection,
                scroll_filter=header_filter,
                limit=10,
                with_payload=True,
                with_vectors=False,
            )
            header_chunks = list(header_scroll or [])
            print(f"PERFLOG: Fetched {len(header_chunks)} header chunk(s)")
        except Exception as hex_e:
            # Backward compat: older documents uploaded before metadata
            # extraction existed won't have header chunks. Ignore and continue.
            print(f"Header chunk fetch skipped: {hex_e}")
            header_chunks = []

        search_results: List[Any] = []
        first_page_chunks: List[Any] = []
        coverage_results: List[Any] = []

        # ------------------------------------------------------------------
        # Coverage-query expansion
        # ------------------------------------------------------------------
        # Previously, asking "what acts of cruelty are alleged?" on a Hindu
        # Marriage Act petition would vector-match the cover page (parties,
        # court name) more strongly than the inner "grounds of petition"
        # pages — because the cruelty pages often use verbs ("beat", "demanded
        # dowry", "threw out") while the user asks with a noun ("cruelty").
        # Embedding similarity on short queries is brittle there.
        #
        # Fix: run a SECOND retrieval using a fixed, domain-broad "coverage"
        # phrase that is semantically close to the substantive body of
        # most legal / contractual / clinical documents, and union those
        # points with the user-query results. For non-legal docs the extra
        # chunks usually score low and either get truncated out or the LLM
        # simply ignores them (since it's instructed to answer only the
        # user's actual question).
        _coverage_query = (
            "grounds of the petition, facts and circumstances, allegations, "
            "averments, incidents, dates of incidents, acts of cruelty, "
            "mental and physical harassment, dowry demand, violence, abuse, "
            "relief sought, prayer, orders passed, reply, written statement, "
            "terms, parties, obligations, breach, damages, diagnosis, treatment"
        )
        try:
            coverage_embedding = embedding_model.encode(_coverage_query).tolist()
        except Exception as ce:
            print(f"Coverage embedding skipped: {ce}")
            coverage_embedding = None

        try:
            if summary_intent:
                # ---- Summary mode: read a generous first-N-pages window --
                # Raised from 12 → 40 chunks per doc (roughly the first
                # ~8–10 pages at our 800-char chunk size). Summaries of
                # petitions/contracts/discharge summaries are reliably
                # present within the first several pages; 12 was too
                # aggressive and cut off the "grounds / facts" section.
                body_filter = Filter(
                    must=filter_conditions,
                    must_not=[
                        FieldCondition(
                            key="chunk_kind", match=MatchValue(value="summary")
                        )
                    ],
                )
                scroll_batch, _ = qdrant_client.scroll(
                    collection_name=qdrant_collection,
                    scroll_filter=body_filter,
                    limit=400,
                    with_payload=True,
                    with_vectors=False,
                )

                def _order_key(pt):
                    p = pt.payload or {}
                    return (
                        p.get("document_id") or "",
                        p.get("page_number") if p.get("page_number") is not None else 10**6,
                        p.get("chunk_index") if p.get("chunk_index") is not None else 10**6,
                    )

                ordered = sorted(scroll_batch or [], key=_order_key)
                per_doc_cap = 40
                per_doc_counts: Dict[str, int] = {}
                for pt in ordered:
                    doc_id = (pt.payload or {}).get("document_id") or ""
                    if per_doc_counts.get(doc_id, 0) >= per_doc_cap:
                        continue
                    search_results.append(pt)
                    per_doc_counts[doc_id] = per_doc_counts.get(doc_id, 0) + 1
                print(
                    f"PERFLOG: Summary mode selected {len(search_results)} body chunks "
                    f"across {len(per_doc_counts)} document(s)"
                )
            else:
                # ---- Needle mode: vector search (wider + lower threshold) -
                # Raised top-k from 16 → 30 and relaxed threshold; we used
                # to drop relevant chunks just because their cosine was
                # < 0.30. With the larger Llama-3.1 context we can afford
                # more chunks and let the model pick.
                response = qdrant_client.query_points(
                    collection_name=qdrant_collection,
                    query=query_embedding,
                    query_filter=query_filter,
                    limit=30,
                    with_payload=True,
                    score_threshold=0.2,
                )
                search_results = list(
                    response.points if hasattr(response, "points") else []
                )

                if len(search_results) < 5:
                    print(
                        f"Only {len(search_results)} results at threshold 0.2, "
                        "retrying with no threshold"
                    )
                    response = qdrant_client.query_points(
                        collection_name=qdrant_collection,
                        query=query_embedding,
                        query_filter=query_filter,
                        limit=20,
                        with_payload=True,
                    )
                    search_results = list(
                        response.points if hasattr(response, "points") else []
                    )

                # First-page bias: keep ONE cover-page chunk per doc (not
                # two) so we spend more of the prompt budget on chunks that
                # actually answer the question. The profile block already
                # carries title/parties/identifiers, so we don't need
                # multiple first-page chunks for grounding.
                try:
                    fp_filter = Filter(
                        must=filter_conditions,
                        must_not=[
                            FieldCondition(
                                key="chunk_kind", match=MatchValue(value="summary")
                            )
                        ],
                    )
                    fp_scroll, _ = qdrant_client.scroll(
                        collection_name=qdrant_collection,
                        scroll_filter=fp_filter,
                        limit=50,
                        with_payload=True,
                        with_vectors=False,
                    )
                    fp_ordered = sorted(
                        fp_scroll or [],
                        key=lambda pt: (
                            (pt.payload or {}).get("document_id") or "",
                            (pt.payload or {}).get("page_number")
                            if (pt.payload or {}).get("page_number") is not None
                            else 10**6,
                            (pt.payload or {}).get("chunk_index")
                            if (pt.payload or {}).get("chunk_index") is not None
                            else 10**6,
                        ),
                    )
                    seen_docs: Dict[str, int] = {}
                    for pt in fp_ordered:
                        doc_id = (pt.payload or {}).get("document_id") or ""
                        if seen_docs.get(doc_id, 0) >= 1:
                            continue
                        first_page_chunks.append(pt)
                        seen_docs[doc_id] = seen_docs.get(doc_id, 0) + 1
                        if len(first_page_chunks) >= 2:
                            break
                except Exception as fp_e:
                    print(f"First-page bias scroll skipped: {fp_e}")

            # Coverage retrieval runs for BOTH modes — it's the main fix
            # for "brief me" and "what acts of cruelty" both missing the
            # grounds section.
            if coverage_embedding is not None:
                try:
                    cov_resp = qdrant_client.query_points(
                        collection_name=qdrant_collection,
                        query=coverage_embedding,
                        query_filter=query_filter,
                        limit=20,
                        with_payload=True,
                        score_threshold=0.2,
                    )
                    coverage_results = list(
                        cov_resp.points if hasattr(cov_resp, "points") else []
                    )
                    print(
                        f"PERFLOG: Coverage retrieval got {len(coverage_results)} chunks"
                    )
                except Exception as cov_e:
                    print(f"Coverage retrieval skipped: {cov_e}")
                    coverage_results = []

            print(
                f"PERFLOG: Qdrant retrieval completed in {time.time() - search_start:.2f}s"
            )

            if not search_results and not header_chunks and not coverage_results:
                print("No relevant information found in Qdrant")
                from fastapi.responses import StreamingResponse

                def generate_no_results_stream():
                    yield f"data: {json.dumps({'response': 'I could not find any relevant information. Please try rephrasing your question or make sure you have uploaded the relevant documents.', 'sources': [], 'done': True})}\n\n"

                return StreamingResponse(
                    generate_no_results_stream(),
                    media_type="text/plain",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                    },
                )

            # ------------------------------------------------------------------
            # Build the prompt context.
            # Order:
            #   1. header chunks (identity: title/type/parties)
            #   2. first-page chunks (cover-page grounding, capped)
            #   3. user-query similarity results
            #   4. coverage-query results (substantive body sections)
            # De-duplicate by point id so the same chunk doesn't appear twice.
            # ------------------------------------------------------------------
            relevant_chunks: List[str] = []
            relevant_sources: List[Dict[str, Any]] = []
            seen_ids: set = set()
            debug_sample: List[str] = []

            def _consume(pt: Any, source_kind: str) -> None:
                pid = getattr(pt, "id", None)
                if pid is not None:
                    if pid in seen_ids:
                        return
                    seen_ids.add(pid)
                payload = pt.payload or {}
                content = (payload.get("content") or "").strip()
                if not content:
                    return
                relevant_chunks.append(content)
                if len(debug_sample) < 8:
                    debug_sample.append(
                        f"[{source_kind} p={payload.get('page_number')} "
                        f"score={float(getattr(pt, 'score', 0.0) or 0.0):.2f}] "
                        f"{content[:140].replace(chr(10), ' ')}"
                    )
                relevant_sources.append(
                    {
                        "document": payload.get("filename", "Unknown"),
                        "document_id": payload.get("document_id"),
                        "page_number": payload.get("page_number"),
                        "similarity": float(getattr(pt, "score", 0.0) or 0.0),
                        "chunk_kind": payload.get("chunk_kind") or "body",
                        "source_kind": source_kind,
                    }
                )

            for pt in header_chunks:
                _consume(pt, "header")
            for pt in first_page_chunks:
                _consume(pt, "first_page")

            if summary_intent:
                # In summary mode the scroll already yields chunks in
                # page_number order; keep that order so the LLM reads the
                # document in its natural sequence.
                for pt in search_results:
                    _consume(pt, "body")
            else:
                sorted_results = sorted(
                    search_results,
                    key=lambda x: getattr(x, "score", 0.0) or 0.0,
                    reverse=True,
                )
                for pt in sorted_results:
                    _consume(pt, "body")
                    if len(relevant_chunks) >= 24:
                        break

            # Merge coverage results — these are the substantive-section
            # grabs (grounds/facts/prayer/etc.). Add up to a cap so they
            # can't crowd out the primary user-query results.
            for pt in sorted(
                coverage_results,
                key=lambda x: getattr(x, "score", 0.0) or 0.0,
                reverse=True,
            ):
                _consume(pt, "coverage")
                if len(relevant_chunks) >= 32:
                    break

            # Context window: Llama-3.1 gives us a much bigger n_ctx (8192),
            # so we can afford materially more context. Summary mode gets
            # the most room because it must cover the whole document;
            # needle mode gets enough to include both the similarity hits
            # and the coverage-query hits.
            if summary_intent:
                max_length = 9000
            else:
                max_length = 6000

            # The [Document Profile] block is the authoritative source for
            # document type / title / party names. Previously only injected
            # on summary intent; we inject it for needle queries too so the
            # model doesn't re-derive parties from raw OCR chunks (which
            # produced "Complainant" instead of "Petitioner" and invented
            # phone-number-as-person mistakes).
            profile_block = _render_profile_block(header_chunks)

            body_context = "\n\n---\n\n".join(relevant_chunks)
            if profile_block:
                body_budget = max(0, max_length - len(profile_block) - 4)
                context = profile_block + "\n\n" + body_context[:body_budget]
            else:
                context = body_context[:max_length]

            print(
                f"PERFLOG: Selected {len(relevant_chunks)} chunks "
                f"(header={len(header_chunks)}, first_page={len(first_page_chunks)}, "
                f"similarity={len(search_results)}, coverage={len(coverage_results)}), "
                f"profile_block={'yes' if profile_block else 'no'}, "
                f"context length: {len(context)}"
            )
            for _line in debug_sample:
                print(f"PERFLOG: CHUNK {_line}")

        except Exception as e:
            print(f"Failed to search Qdrant: {e}")
            from fastapi.responses import StreamingResponse

            def generate_error_stream():
                yield f"data: {json.dumps({'response': 'I am having trouble searching through your documents. Please try again.', 'sources': [], 'done': True})}\n\n"

            return StreamingResponse(
                generate_error_stream(),
                media_type="text/plain",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                },
            )

        # Generate response using the cached LLM model
        llm_start = time.time()
        print(f"PERFLOG: Generating response with context length: {len(context)}")
        try:
            print("Loading LLM model...")
            llm = get_llama_model()
            print("LLM model loaded successfully")
        except Exception as e:
            print(f"Error loading LLM model: {e}")
            raise RuntimeError(f"Failed to load LLM model: {e}")

        # ------------------------------------------------------------------
        # Prompt construction — chat-completion with a single system message.
        # Key change vs. the old Mistral prompt:
        #
        # 1. Conversation history is NOT interleaved between the document
        #    context and the current question anymore. Previously the order
        #    was:
        #        Document Context
        #        === Previous Conversation ===
        #        Q1/A1
        #        === Current Question ===
        #        Question: ...
        #    Llama and Mistral both suffer strong recency bias, so the
        #    IMMEDIATELY preceding text (a prior hallucinated answer) was
        #    being treated as authoritative. If an earlier answer said "the
        #    document does not contain grounds", the next answer inherited
        #    that lie. We now put prior Q&A in its own chat turn WITH an
        #    explicit caveat that it may be incorrect and is not a source.
        #
        # 2. A dedicated system message spells out the invariant rules once,
        #    instead of stuffing them at the end of the user message where
        #    the model's attention drops off.
        # ------------------------------------------------------------------
        system_rules_common = (
            "You are a careful document analyst. You answer questions using "
            "ONLY the 'Document Context' block supplied in the user turn. "
            "The Document Context may begin with a [Document Profile] block "
            "— that block is the authoritative source for document type, "
            "title, parties, and key identifiers. Copy names and role "
            "labels (Petitioner, Respondent, Vendor, Patient, etc.) "
            "VERBATIM from the profile; do NOT translate or substitute "
            "roles (do not say 'Complainant' if the profile says "
            "'Petitioner').\n\n"
            "Hard rules:\n"
            "- Do NOT use a previous assistant turn as a source of facts "
            "about the document; those earlier answers may have been "
            "wrong. Always re-derive your answer from the CURRENT "
            "Document Context.\n"
            "- Do NOT fabricate names, numbers, dates, addresses, phone "
            "numbers, ages, occupations, or court locations. If a fact is "
            "not in the current Document Context, either omit it or say "
            "'not clearly identified in the provided excerpts'.\n"
            "- NEVER treat a phone number, stamp / seal label, 'Presiding "
            "Officer', 'Counsel for …', court fee, or a letter-spaced "
            "all-caps OCR artefact as a party / person.\n"
            "- Reply in plain English sentences. Never output JSON, YAML, "
            "CSV, markdown tables, or raw structured dumps."
        )

        if summary_intent:
            system_instructions = (
                system_rules_common
                + "\n\nTask mode: SUMMARY.\n"
                + "- Produce a concise, factual description of the "
                "document: what kind of document it is, who it concerns, "
                "any key identifiers, and its core purpose.\n"
                + "- Target length: 3-6 sentences (around 80-120 words), "
                "UNLESS the user asked for a specific length (e.g. 'about "
                "100 words') — then respect that.\n"
                + "- When the document is a legal filing (petition, "
                "complaint, written statement, affidavit), your summary "
                "MUST mention that the document sets out the grounds / "
                "facts / allegations IF those sections are present in the "
                "Document Context (they usually are — look for incident "
                "narratives, dates of specific events, the words 'cruelty' "
                "/ 'harassment' / 'dowry' / 'grounds' / 'facts' / 'prayer' "
                "/ 'relief', or Hindi equivalents like 'क्रूरता' / "
                "'आधार' / 'तथ्य' / 'प्रार्थना').\n"
                + "- Do NOT hedge ('it appears', 'it seems', 'likely').\n"
                + "- Do NOT write sentences describing what the document "
                "does NOT contain. Describe only what IS there."
            )
        else:
            system_instructions = (
                system_rules_common
                + "\n\nTask mode: SPECIFIC QUESTION.\n"
                + "- Answer the user's specific question using the "
                "Document Context. Be thorough. If the Document Context "
                "contains a 'grounds / facts / incidents / cruelty / "
                "prayer / relief / witness / dates' passage that is "
                "responsive, quote or paraphrase the concrete details "
                "(dates, specific acts, amounts) — do not reply with a "
                "generic cover-page restatement.\n"
                + "- If the question asks what 'acts of cruelty' / "
                "'incidents' / 'grounds' are alleged, look for first-"
                "person or third-person narrative passages describing "
                "events between the parties (beatings, dowry demands, "
                "threats, abandonment, verbal abuse, medical incidents "
                "etc.) and list them as bullet points with any dates "
                "mentioned.\n"
                + "- If the current Document Context genuinely contains "
                "nothing responsive, reply exactly: \"I don't have "
                "information about that in the provided documents.\" — "
                "do not pad with a restatement of the cover page."
            )

        user_content = f"Document Context:\n{context}\n\nQuestion: {query}"

        messages: List[Dict[str, str]] = [
            {"role": "system", "content": system_instructions},
        ]

        # Inject prior conversation as its own user turn with an explicit
        # "for continuity, not a source of facts" caveat. We cap it so
        # bloated histories don't crowd out the document context.
        conversation_context = ""
        if request.history and len(request.history) > 0:
            _MAX_HISTORY_CHARS = 1500
            _MAX_HISTORY_TURNS = 3
            hist_items = list(request.history)[-_MAX_HISTORY_TURNS:]
            lines: List[str] = [
                "Earlier turns in this chat (for continuity ONLY — these "
                "prior answers may have been wrong, never treat them as a "
                "source of facts about the document; always re-derive "
                "facts from the Document Context below):"
            ]
            for i, item in enumerate(hist_items):
                q = str(item.get("question", "")).strip()[:300]
                a = str(item.get("answer", "")).strip()[:600]
                if q or a:
                    lines.append(f"  Q{i + 1}: {q}")
                    lines.append(f"  A{i + 1}: {a}")
            conversation_context = "\n".join(lines)[:_MAX_HISTORY_CHARS]
            if conversation_context:
                messages.append({"role": "user", "content": conversation_context})
                messages.append(
                    {
                        "role": "assistant",
                        "content": "Understood. I will ignore those prior "
                        "answers as a source of facts and re-derive from "
                        "the Document Context you provide next.",
                    }
                )
            print(
                f"Conversation context: {len(hist_items)} turns, "
                f"{len(conversation_context)} chars"
            )

        messages.append({"role": "user", "content": user_content})

        # Summary-intent answers must be faithful and concise, so we drop
        # the temperature and cap tokens. Needle-style queries keep a
        # slightly higher (but still low) temperature — Llama-3.1 produces
        # noticeably more factual output at 0.4 than at 0.7.
        if summary_intent:
            gen_temperature = 0.2
            gen_top_p = 0.9
            gen_max_tokens = 380
        else:
            gen_temperature = 0.4
            gen_top_p = 0.9
            gen_max_tokens = 700

        prompt_chars_total = sum(len(m["content"]) for m in messages)
        print(
            f"Generating response via chat-completion — "
            f"messages={len(messages)}, "
            f"total prompt chars={prompt_chars_total}, "
            f"document context={len(context)} chars, "
            f"conversation context={len(conversation_context)} chars, "
            f"summary_intent={summary_intent}, "
            f"temperature={gen_temperature}, max_tokens={gen_max_tokens}"
        )

        try:
            from fastapi.responses import StreamingResponse

            def generate_stream():
                try:
                    print("Attempting streaming chat-completion generation...")
                    output = llm.create_chat_completion(
                        messages=messages,
                        max_tokens=gen_max_tokens,
                        temperature=gen_temperature,
                        top_p=gen_top_p,
                        stream=True,
                    )

                    answer = ""
                    buffered = ""
                    chunk_count = 0
                    for chunk in output:
                        chunk_count += 1
                        if not isinstance(chunk, dict):
                            continue
                        choices = chunk.get("choices") or []
                        if not choices:
                            continue
                        choice = choices[0]
                        delta = choice.get("delta") or {}
                        content = delta.get("content") or ""
                        if not content:
                            continue
                        answer += content
                        buffered += content
                        # Flush on whitespace boundaries to keep UI smooth
                        # while still letting us sanitise hedge sentences
                        # before they reach the client (see _strip_hedges).
                        if any(ch in buffered for ch in (".", "\n")) or len(buffered) > 80:
                            clean = _strip_hedges(buffered)
                            buffered = ""
                            if clean:
                                yield f"data: {json.dumps({'response': clean, 'done': False})}\n\n"

                    if buffered:
                        clean = _strip_hedges(buffered)
                        if clean:
                            yield f"data: {json.dumps({'response': clean, 'done': False})}\n\n"

                    print(
                        f"Streaming completed. Total chunks: {chunk_count}, "
                        f"Answer length: {len(answer)}"
                    )

                    # Defensive fallback: if streaming produced nothing,
                    # retry non-streaming on the same messages.
                    if not answer.strip():
                        print("No streaming content, retrying non-streaming...")
                        ns = llm.create_chat_completion(
                            messages=messages,
                            max_tokens=gen_max_tokens,
                            temperature=gen_temperature,
                            top_p=gen_top_p,
                            stream=False,
                        )
                        ns_msg = (
                            (ns.get("choices") or [{}])[0]
                            .get("message", {})
                            .get("content", "")
                        )
                        if ns_msg:
                            clean = _strip_hedges(ns_msg)
                            if clean:
                                yield f"data: {json.dumps({'response': clean, 'done': False})}\n\n"

                    final_response = {
                        "response": "",
                        "sources": relevant_sources,
                        "done": True,
                    }
                    yield f"data: {json.dumps(final_response)}\n\n"

                    print(
                        f"PERFLOG: LLM generation completed in {time.time() - llm_start:.2f}s"
                    )
                    print(f"PERFLOG: Total query time: {time.time() - start_time:.2f}s")
                    print("PERFLOG: --- END OF REQUEST ---")

                except Exception as e:
                    print(f"PERFLOG: Exception in streaming generation: {e}")
                    try:
                        print("Streaming failed, trying non-streaming fallback...")
                        ns = llm.create_chat_completion(
                            messages=messages,
                            max_tokens=gen_max_tokens,
                            temperature=gen_temperature,
                            top_p=gen_top_p,
                            stream=False,
                        )
                        ns_msg = (
                            (ns.get("choices") or [{}])[0]
                            .get("message", {})
                            .get("content", "")
                        )
                        if ns_msg:
                            clean = _strip_hedges(ns_msg)
                            if clean:
                                yield f"data: {json.dumps({'response': clean, 'done': False})}\n\n"
                        final_response = {
                            "response": "",
                            "sources": relevant_sources,
                            "done": True,
                        }
                        yield f"data: {json.dumps(final_response)}\n\n"
                    except Exception as fallback_error:
                        print(f"PERFLOG: Fallback also failed: {fallback_error}")
                        error_response = {
                            "response": f"Error generating response: {str(fallback_error)}",
                            "sources": [],
                            "done": True,
                        }
                        yield f"data: {json.dumps(error_response)}\n\n"

            return StreamingResponse(
                generate_stream(),
                media_type="text/plain",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                },
            )

        except Exception as e:
            print(f"PERFLOG: Exception in LLM generation: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to generate response: {str(e)}"
            )

    except Exception as e:
        print(f"PERFLOG: Exception in query_documents_endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.function(
    image=image,
    gpu="T4",
    timeout=300,
    memory=4096,
    volumes={"/data": volume},
    secrets=[modal.Secret.from_name("QURIEUS_KEY")],
)
@modal.fastapi_endpoint(docs=True, label="vidhigya-health")
async def health_check(x_api_key: str = Header(...)):
    print("=== Health Check Started ===")
    print(f"Received x_api_key: {x_api_key}")
    expected = _modal_expected_api_key()
    print(f"Expected API_KEY: {expected}")
    print(f"Keys match: {x_api_key == expected}")
    verify_api_key(x_api_key)
    print("API Key verification passed")

    health_status = {
        "status": "healthy",
        "service": "active",
        "cuda_available": False,
        "llama_cuda_support": False,  # This will be set to True if model loads with GPU layers
        "numpy_version": None,
        "torch_cuda_version": None,
        "llama_cpp_version": None,
        "llama_model_load_success": False,
        "llama_model_offloaded_layers": 0,  # This will store the number of layers offloaded
    }

    try:
        import llama_cpp
        import numpy as np
        import torch

        health_status["numpy_version"] = np.__version__
        health_status["cuda_available"] = torch.cuda.is_available()
        health_status["torch_cuda_version"] = (
            torch.version.cuda if torch.cuda.is_available() else None
        )
        print(f"NumPy version: {np.__version__}")
        print("CUDA available (PyTorch):", torch.cuda.is_available())
        if torch.cuda.is_available():
            print("GPU Name:", torch.cuda.get_device_name(0))
            print("CUDA version (PyTorch):", torch.version.cuda)

        print(f"llama-cpp-python version: {llama_cpp.__version__}")
        health_status["llama_cpp_version"] = llama_cpp.__version__

        # --- Attempt to load the LLM model to confirm CUDA usage ---
        print("Attempting to load LLM model with GPU offload for health check...")
        try:
            # Call your existing get_llama_model function
            # This will also trigger download_model if the model isn't there
            get_llama_model()

            health_status["llama_model_load_success"] = True

            # If the model loads successfully with n_gpu_layers=35, it implies CUDA usage
            health_status["llama_cuda_support"] = True

            print("Llama model instance created successfully for health check.")

        except Exception as e:
            print(f"Error loading Llama model during health check: {e}")
            health_status["llama_model_load_success"] = False
            health_status["llama_cuda_support"] = (
                False  # Set to false if model load fails
            )
            # Do NOT re-raise here; let the health check return with false status.

        print("Health check completed successfully")
        return health_status

    except Exception as e:
        print(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@app.function(
    image=image,
    cpu=4,  # Use CPU instead of GPU
    timeout=600,
    memory=4096,
    volumes={"/data": volume},
    secrets=[modal.Secret.from_name("QURIEUS_KEY")],
)
@modal.fastapi_endpoint(docs=True, label="vidhigya-download-model", method="POST")
async def download_model_endpoint(x_api_key: str = Header(...)):
    """Download the LLM model to persistent storage."""
    verify_api_key(x_api_key)
    try:
        print("🚀 Starting model download...")
        download_model()
        print("✅ Model download completed successfully")
        return {
            "success": True,
            "message": "Model downloaded successfully",
            "model_path": MODEL_PATH,
            "model_size_mb": os.path.getsize(MODEL_PATH) / (1024 * 1024)
            if os.path.exists(MODEL_PATH)
            else 0,
        }
    except Exception as e:
        print(f"❌ Model download failed: {e}")
        raise HTTPException(status_code=500, detail=f"Model download failed: {str(e)}")


def _extract_json_block(text: str) -> Optional[dict]:
    """Extract the first top-level JSON object from `text` (tolerant of prose around it)."""
    if not text:
        return None
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    in_str = False
    escape = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start : i + 1])
                    except Exception:
                        return None
    return None


def _empty_profile() -> Dict[str, Any]:
    return {
        "document_type": "",
        "document_title": "",
        "summary": "",
        "parties": [],
        "key_identifiers": [],
        "key_topics": [],
    }


# Tesseract frequently reads stylised bold/italic strokes on cover pages as
# stray "+", "|" or "\" characters attached to real letters, producing names
# like "Jajan+t+" or "Sh|ri" where the real letters were "Jayant" / "Shri".
# These characters never appear legitimately inside or immediately after a
# name token, so strip them wherever they sit adjacent to alpha characters.
_NAME_INTRA_NOISE_RE = re.compile(r"(?<=[A-Za-z])[+|\\](?=[A-Za-z])")
_NAME_TRAILING_NOISE_RE = re.compile(r"(?<=[A-Za-z])[+|\\]+(?=\s|[,.;:!?)\]}'\"]|$)")
_LETTER_SPACED_NAME_RE = re.compile(r"(?:\b[A-Za-z]\s){2,}[A-Za-z]\b")


def _collapse_letter_spaced_name(match: "re.Match[str]") -> str:
    seq = match.group(0)
    letters = [p for p in seq.split(" ") if p]
    if all(len(t) == 1 and t.isalpha() for t in letters):
        return "".join(letters)
    return seq


def _clean_name_value(value: str) -> str:
    """
    Conservative cleanup for a free-form name / title string coming back from
    the LLM (or from raw OCR). Strips stray +|\\ noise, collapses letter-spaced
    sequences (``S H R I`` -> ``SHRI``), normalises whitespace. Preserves
    hyphens, apostrophes, periods in initials, and ``&``.
    """
    if not value:
        return ""
    s = str(value).strip()
    s = _LETTER_SPACED_NAME_RE.sub(_collapse_letter_spaced_name, s)
    s = _NAME_INTRA_NOISE_RE.sub("", s)
    s = _NAME_TRAILING_NOISE_RE.sub("", s)
    s = re.sub(r"\s+", " ", s).strip()
    s = s.strip(" ,;:-_|/\\")
    return s


# Stop-list for party / name extraction — these strings ARE found on scanned
# legal documents (signature blocks, stamps, court footers, bureaucratic
# labels) but are NOT the case parties. If we don't filter them out here they
# leak into the [Document Profile] block and the LLM then reports them as
# petitioner / respondent.
_PARTY_STOPLIST_RE = re.compile(
    r"^(?:"
    r"presiding\s+officer|counsel(?:\s+for)?|advocate|judge|registrar|stamp|"
    r"seal|court\s+fee|notary|witness|translator|oath\s+commissioner"
    r")\b",
    flags=re.IGNORECASE,
)


def _strip_party_role_prefix(value: str) -> str:
    return re.sub(
        r"^(?:petitioner|respondent|plaintiff|defendant|appellant|complainant|"
        r"vendor|client|buyer|seller|bill to|patient|parties|opposing party|"
        r"प्रार्थी|प्रतिप्रार्थी|प्रतिवादी|अनावेदक|आवेदक|वादी|अभियोगी)\s*[:\-–]\s*",
        "",
        value or "",
        flags=re.IGNORECASE,
    ).strip()


def _looks_like_junk_value(s: Any) -> bool:
    """
    Reject OCR gibberish that slipped through ingestion — e.g.
    ``oe [6 Fa`` or ``Opposing party: ae ‘ ee a श्र ps (ft tt 221 i rs 42``.

    Intended for NATURAL-LANGUAGE values only (title / parties / topics /
    document_type). Do NOT use this on identifiers like dates or case numbers
    — those legitimately have few letters.

    Heuristic: need at least one whitespace-separated token that is a "real
    word" (3+ Latin letters, or 4+ Devanagari codepoints so a conjunct like
    ``श्र`` does not count but ``सुरेश`` does); no run of 3+ unusual
    punctuation; at most 40% single-character tokens when there are >=4 tokens.
    """
    if s is None:
        return True
    text = str(s).strip()
    if len(text) < 3:
        return True
    tokens = text.split()
    real_word_count = 0
    for tok in tokens:
        if re.search(r"[A-Za-z]{3,}", tok):
            real_word_count += 1
            continue
        deva = sum(1 for c in tok if 0x0900 <= ord(c) <= 0x097F)
        if deva >= 4:
            real_word_count += 1
    if real_word_count == 0:
        return True
    # A title / name with multiple tokens but only ONE real word is almost
    # always OCR garbage (e.g. ``हे KS jee oa``).
    if len(tokens) >= 3 and real_word_count / len(tokens) < 0.5:
        return True
    if re.search(r"[^\w\s\u0900-\u097F'\-.,&/()]{3,}", text):
        return True
    if len(tokens) >= 4:
        single = sum(1 for t in tokens if len(t) == 1)
        if single / len(tokens) > 0.4:
            return True
    return False


def _is_stoplisted_party(value: str) -> bool:
    return bool(_PARTY_STOPLIST_RE.match(_strip_party_role_prefix(value)))


def _filter_parties(values: Any) -> List[str]:
    """Drop OCR junk + stoplisted entries + dedup; preserve order."""
    if not isinstance(values, list):
        return []
    out: List[str] = []
    seen: set = set()
    for v in values:
        s = _clean_name_value(str(v or ""))
        if not s or _looks_like_junk_value(s) or _is_stoplisted_party(s):
            continue
        key = s.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
        if len(out) >= 8:
            break
    return out


def _filter_value_list(
    values: Any, *, max_items: int = 12, drop_junk: bool = True
) -> List[str]:
    if not isinstance(values, list):
        return []
    out: List[str] = []
    seen: set = set()
    for v in values:
        s = _clean_name_value(str(v or ""))
        if not s:
            continue
        if drop_junk and _looks_like_junk_value(s):
            continue
        key = s.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
        if len(out) >= max_items:
            break
    return out


def _clamp_profile(raw: Any) -> Dict[str, Any]:
    """Coerce LLM output into the expected, size-bounded profile shape."""
    out = _empty_profile()
    if not isinstance(raw, dict):
        return out

    def _s(val, cap=500, *, clean: bool = False):
        if val is None:
            return ""
        s = str(val).strip()
        if clean:
            s = _clean_name_value(s)
        return s[:cap]

    def _l(val, cap_items=10, cap_each=200, *, clean: bool = False):
        if not isinstance(val, list):
            return []
        cleaned = []
        seen_lower: set = set()
        for v in val:
            if v is None:
                continue
            s = str(v).strip()
            if clean:
                s = _clean_name_value(s)
            if not s:
                continue
            key = s.lower()
            if key in seen_lower:
                continue
            seen_lower.add(key)
            cleaned.append(s[:cap_each])
            if len(cleaned) >= cap_items:
                break
        return cleaned

    out["document_type"] = _s(raw.get("document_type"), 120, clean=True)
    out["document_title"] = _s(raw.get("document_title"), 160, clean=True)
    out["summary"] = _s(raw.get("summary"), 800)
    out["parties"] = _l(raw.get("parties"), cap_items=10, cap_each=180, clean=True)
    out["key_identifiers"] = _l(
        raw.get("key_identifiers"), cap_items=12, cap_each=160, clean=True
    )
    out["key_topics"] = _l(raw.get("key_topics"), cap_items=10, cap_each=80, clean=True)

    # Final junk pass: reject OCR-gibberish values that slipped through the
    # LLM + cleaner. Prevents strings like ``oe [6 Fa`` or
    # ``Opposing party: ae ‘ ee a श्र ps …`` from ever reaching Qdrant.
    if out["document_title"] and _looks_like_junk_value(out["document_title"]):
        out["document_title"] = ""
    if out["document_type"] and _looks_like_junk_value(out["document_type"]):
        out["document_type"] = ""
    out["parties"] = _filter_parties(out["parties"])
    # Identifiers are dates / numbers / citations; don't apply the natural-
    # language junk check (it would reject legitimate "07/02/2015" etc.).
    out["key_identifiers"] = _filter_value_list(
        out["key_identifiers"], max_items=12, drop_junk=False
    )
    out["key_topics"] = _filter_value_list(out["key_topics"], max_items=8)
    return out


@app.function(
    image=image,
    gpu="L40S",
    timeout=180,
    memory=4096,
    volumes={"/data": volume},
    secrets=[modal.Secret.from_name("QURIEUS_KEY")],
)
@modal.fastapi_endpoint(docs=True, label="vidhigya-extract-metadata", method="POST")
async def extract_metadata_endpoint(
    request: ExtractMetadataRequest,
    x_api_key: str = Header(...),
):
    """
    Extract a domain-agnostic "document profile" from OCR/extracted text.

    This is called by the upload pipeline in apps/ai-service so that every
    document in Qdrant has a high-signal header chunk plus payload fields
    (title, type, parties/subjects, identifiers) the query endpoint can
    always surface — independent of vector-search recall on specific terms.
    """
    verify_api_key(x_api_key)
    initialize_models_at_startup()

    text = (request.text or "").strip()
    if not text:
        return {"profile": _empty_profile(), "raw": ""}

    # Cap input into the LLM. 12k chars ≈ 3–4k tokens; comfortably fits.
    excerpt = text[:12000]

    # NOTE: Moved from hand-rolled [INST] ... [/INST] Mistral format to
    # chat-completion messages. [INST] is Mistral-specific; feeding it to
    # Llama-3.1 produces weaker outputs (the model treats [INST] as a
    # literal token sequence rather than an instruction delimiter). With
    # create_chat_completion, llama-cpp-python applies the Llama-3 chat
    # template embedded in the GGUF metadata automatically.
    system_msg = (
        "You are an expert document analyst. You read OCR'd document "
        "excerpts (which may contain minor noise) and extract a structured "
        "profile as STRICT JSON.\n\n"
        "Return ONLY the JSON object. No prose before or after. No code "
        "fences. No explanatory text.\n\n"
        "Rules:\n"
        "- If a field cannot be determined from the excerpt, use an empty "
        "string or empty array for that field.\n"
        "- Do NOT fabricate names, numbers, dates, occupations, ages, "
        "addresses, or phone numbers. Extract only what appears verbatim.\n"
        "- Repair obvious OCR noise when extracting names: collapse "
        "letter-spacing ('S H R I' -> 'SHRI'), and remove stray '+', '|' "
        "or '\\\\' characters that appear inside or immediately after "
        "letters (e.g. 'Jajan+t+' -> 'Jayant'). If a name still looks "
        "corrupted after cleanup, leave the entry out rather than guessing.\n"
        "- Use the role label the document itself prints (Petitioner / "
        "Respondent / Plaintiff / Defendant / Appellant / etc.) — do not "
        "translate or substitute roles.\n"
        "- The summary field must NEVER describe what the document does "
        "NOT contain. Only describe facts that ARE present."
    )

    user_msg = (
        "Return a STRICT JSON object with exactly these fields and no others:\n\n"
        "{\n"
        "  \"document_type\": \"short human-readable description of what kind of document this is (e.g. 'Written Statement', 'Invoice', 'Medical Discharge Summary', 'Rental Agreement', 'Court Petition', 'Affidavit', 'Letter', 'Bank Statement').\",\n"
        "  \"document_title\": \"short human-readable title (<= 100 chars). Use the case title / subject line / file title if one is present.\",\n"
        "  \"summary\": \"2-4 sentence faithful summary of what this document is about. If it is a legal filing, mention whether it sets out grounds / facts / allegations when those sections are present.\",\n"
        "  \"parties\": [\"up to 8 named people or organizations this document concerns, each prefixed with the EXACT role label the document itself uses (e.g. 'Petitioner: Ram Kumar', 'Respondent: State of Karnataka', 'Vendor: Acme Pvt Ltd', 'Patient: Priya S.', 'Plaintiff: John Doe')\"],\n"
        "  \"key_identifiers\": [\"up to 10 concrete identifiers: case numbers, invoice numbers, reference IDs, prominent dates, amounts with currency, registration numbers, PAN/GSTIN/Aadhaar-like numbers\"],\n"
        "  \"key_topics\": [\"3-8 short topic tags describing what the document is about\"]\n"
        "}\n\n"
        f"Filename (may be a hint, may not): {request.filename or 'unknown'}\n\n"
        "Excerpt:\n\"\"\"\n"
        f"{excerpt}\n"
        "\"\"\""
    )

    try:
        llm = get_llama_model()
        output = llm.create_chat_completion(
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=900,
            temperature=0.1,
            top_p=0.9,
            stream=False,
        )
        raw_text = ""
        if isinstance(output, dict) and output.get("choices"):
            raw_text = (
                output["choices"][0].get("message", {}).get("content", "") or ""
            )

        parsed = _extract_json_block(raw_text) or {}
        profile = _clamp_profile(parsed)
        return {"profile": profile, "raw": raw_text[:4000]}
    except Exception as e:
        print(f"extract-metadata failed: {e}")
        # Return empty profile rather than 500 — upload flow has its own
        # regex fallback and should still succeed even if extraction fails.
        return {"profile": _empty_profile(), "raw": "", "error": str(e)[:300]}


if __name__ == "__main__":
    # For local testing of Modal functions
    print("Modal service functions ready for deployment")
