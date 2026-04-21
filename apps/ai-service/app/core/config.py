import os
from typing import List, Optional

from dotenv import load_dotenv
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings

# Load environment variables from .env file
load_dotenv()


def _strip_env_quotes(value: Optional[str]) -> Optional[str]:
    """Avoid stray quotes from .env breaking URLs and keys."""
    if value is None:
        return None
    s = str(value).strip().strip("'").strip('"').strip()
    return s if s else None


def _env_str(name: str, default: Optional[str] = None) -> Optional[str]:
    value = _strip_env_quotes(os.getenv(name))
    return value if value is not None else default


def _env_bool(name: str, default: bool = False) -> bool:
    value = _env_str(name)
    if value is None:
      return default
    return value.lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    value = _env_str(name)
    if value is None:
        return default
    return int(value)


def default_qdrant_collection() -> str:
    """
    Collection name when QDRANT_COLLECTION is unset.
    Override via QDRANT_COLLECTION in .env (must match Nest backend QDRANT_COLLECTION).
    """
    explicit = (os.getenv("QDRANT_COLLECTION") or "").strip()
    if explicit:
        return explicit
    env = (os.getenv("ENVIRONMENT") or "development").lower()
    if env in ("production", "prod"):
        return "vidhigya"
    if env in ("staging", "stage"):
        return "vidhigya-stage"
    return "vidhigya_dev"


class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = _env_str("ENVIRONMENT", "development")
    DEBUG: bool = _env_bool("DEBUG", True)

    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Qurieus API"
    VERSION: str = "1.0.0"
    HOST: str = _env_str("HOST", "0.0.0.0")
    PORT: int = _env_int("PORT", 8000)

    # Database Settings
    DATABASE_URL: str = _env_str("DATABASE_URL", "")

    # Frontend URL for CORS
    BACKEND_URL: str = _env_str("BACKEND_URL", "http://localhost:3888")

    # CORS settings
    CORS_ORIGINS: List[str] = [_env_str("BACKEND_URL", "http://localhost:3888")]

    # NextAuth Secret for token verification
    # IMPORTANT: This must match the NEXTAUTH_SECRET in the Next.js frontend
    NEXTAUTH_SECRET: str = _env_str("NEXTAUTH_SECRET", "")

    # Postman Settings
    POSTMAN_API_KEY: Optional[str] = _env_str("POSTMAN_API_KEY")
    POSTMAN_COLLECTION_ID: Optional[str] = _env_str("POSTMAN_COLLECTION_ID")

    # Qdrant settings (QDRANT_COLLECTION defaults by ENVIRONMENT if unset — see default_qdrant_collection)
    QDRANT_URL: Optional[str] = _env_str("QDRANT_URL")
    QDRANT_COLLECTION: str = Field(default_factory=default_qdrant_collection)
    QDRANT_API_KEY: Optional[str] = _env_str("QDRANT_API_KEY")
    # HTTP timeout (seconds) for the Qdrant client. Default httpx write
    # timeout is 5s which is too short for bulk upsert over remote networks.
    QDRANT_CLIENT_TIMEOUT_SEC: int = int(
        os.getenv("QDRANT_CLIENT_TIMEOUT_SEC", "120")
    )
    # Batch size for bulk upsert. Large documents can produce 500+ points;
    # sending them in one request is fragile over slow networks.
    QDRANT_UPSERT_BATCH_SIZE: int = int(
        os.getenv("QDRANT_UPSERT_BATCH_SIZE", "100")
    )
    # Max retry attempts per batch on transient upsert failures.
    QDRANT_UPSERT_MAX_RETRIES: int = int(
        os.getenv("QDRANT_UPSERT_MAX_RETRIES", "3")
    )

    @field_validator("QDRANT_URL", "QDRANT_API_KEY", mode="before")
    @classmethod
    def normalize_qdrant_strings(cls, v):
        return _strip_env_quotes(v if isinstance(v, str) else v)

    @field_validator("QDRANT_URL", mode="after")
    @classmethod
    def qdrant_url_trim_slash(cls, v: Optional[str]) -> Optional[str]:
        return v.rstrip("/") if v else v

    # Backend API Key for authentication
    AI_SERVICE_API_KEY: str = _env_str("AI_SERVICE_API_KEY", "")

    # OCR Settings (PDF + images: Tesseract)
    #
    # Defaults raised after an investigation into "summary misses the
    # grounds / facts of cruelty" on scanned legal petitions:
    #   - OCR_ENABLED now defaults to True. Shipping OCR off by default
    #     meant scanned PDFs uploaded on a dev env with no .env override
    #     silently stored ~0 usable text per page. The Modal query
    #     endpoint then had nothing to retrieve and fell back to
    #     hallucinating from the cover-page header chunk.
    #   - OCR_MIN_NATIVE_CHARS bumped 72 → 180. Some scanned PDFs have
    #     header artefacts (page numbers, "IN THE FAMILY COURT OF...")
    #     that pushed past 72 chars on content-less pages, so the
    #     per-page decision falsely thought those pages were already
    #     text-rich. 180 is a better trigger point. The scanned-only
    #     auto-detection in pdf_ocr.py also catches this independently.
    #   - OCR_COVER_PAGES bumped 3 → 5. Title-page blocks on Indian
    #     family-court filings sometimes span 4-5 pages (index, memo of
    #     parties, synopsis, then the actual petition head). Upping this
    #     to 5 gives the document-profile extractor more signal.
    OCR_ENABLED: bool = _env_bool("OCR_ENABLED", True)
    OCR_LANGUAGE: str = _env_str("OCR_LANGUAGE", "eng")
    OCR_DPI: int = _env_int("OCR_DPI", 300)
    # Empty → pdf_ocr uses --oem 1 --psm 6 (LSTM, uniform block)
    OCR_CONFIG: str = _env_str("OCR_CONFIG", "")
    # Rasterize every page for OCR (slower; use for difficult scans)
    OCR_ALWAYS_FULLPAGE: bool = _env_bool("OCR_ALWAYS_FULLPAGE", False)
    # Below this many characters of native PDF text, treat page as needing full-page OCR
    OCR_MIN_NATIVE_CHARS: int = _env_int("OCR_MIN_NATIVE_CHARS", 180)
    # Cover pages (first N) are OCR'd at a higher DPI and with multi-PSM
    # retry because that's where the title / parties / case number live.
    OCR_COVER_PAGES: int = _env_int("OCR_COVER_PAGES", 5)
    OCR_COVER_PAGE_DPI: int = _env_int("OCR_COVER_PAGE_DPI", 400)
    OCR_TRY_MULTIPLE_PSM: bool = _env_bool("OCR_TRY_MULTIPLE_PSM", True)
    OCR_DESKEW: bool = _env_bool("OCR_DESKEW", True)

    # Document-profile extraction (generic metadata: title, type, parties,
    # key identifiers, topics). Runs against a Modal LLM endpoint at upload
    # time; falls back to a regex heuristic when unavailable or disabled.
    METADATA_EXTRACTION_ENABLED: bool = _env_bool("METADATA_EXTRACTION_ENABLED", True)
    METADATA_EXTRACTION_TIMEOUT: int = _env_int("METADATA_EXTRACTION_TIMEOUT", 120)
    MODAL_EXTRACT_METADATA_URL: Optional[str] = _env_str("MODAL_EXTRACT_METADATA_URL")
    # MODAL_API_KEY is only needed if Modal's shared secret differs from
    # AI_SERVICE_API_KEY; otherwise AI_SERVICE_API_KEY is used.
    MODAL_API_KEY: Optional[str] = _env_str("MODAL_API_KEY")

    # Hard cap for background PDF+OCR+embed (seconds); cancel/abort after this
    DOCUMENT_PROCESSING_TIMEOUT_SEC: int = _env_int(
        "DOCUMENT_PROCESSING_TIMEOUT_SEC", 3600
    )

    class Config:
        case_sensitive = True
        env_file = ".env"


# Create settings instance
settings = Settings()

# Validate critical settings
if not settings.NEXTAUTH_SECRET:
    import warnings

    warnings.warn(
        "NEXTAUTH_SECRET is not set in environment variables. "
        "This will cause authentication to fail. "
        "Make sure NEXTAUTH_SECRET is the same in both frontend and backend."
    )

# Print debug information in development
if settings.DEBUG:
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Debug mode: {settings.DEBUG}")
    print(f"BACKEND_URL URL: {settings.BACKEND_URL}")
    print(f"NEXTAUTH_SECRET set: {'Yes' if settings.NEXTAUTH_SECRET else 'No'}")
    print(f"QDRANT_COLLECTION (effective): {settings.QDRANT_COLLECTION}")
