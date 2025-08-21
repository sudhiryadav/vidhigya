import datetime
import os
from contextlib import asynccontextmanager

from app.api.v1.endpoints import documents

# Now we can import using absolute paths
from app.core.config import settings
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from generate_postman import generate_postman_collection


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for FastAPI application."""
    # Startup: generate Postman collection
    try:
        generate_postman_collection(app)
    except Exception as e:
        print(f"Failed to generate Postman collection: {str(e)}")
    yield
    # Shutdown: add cleanup logic here if needed


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Document AI Chatbot API with multi-tenant support",
    version=settings.VERSION,
    lifespan=lifespan,
    # Enable OpenAPI documentation
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    openapi_url="/api/v1/openapi.json",
)

# CORS middleware with proper settings for handling credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Include routers
app.include_router(
    documents.router, prefix="/api/v1/admin/documents", tags=["Documents"]
)

# Serve static frontend (Next.js export) at root
frontend_path = os.path.join(os.path.dirname(__file__), "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.VERSION}


@app.get("/health")
async def health_check(
    api_key: str = Header(..., alias="X-API-Key"),
):
    """Health check endpoint for the FastAPI service."""
    try:
        # Validate API key
        if api_key != settings.AI_SERVICE_API_KEY:
            raise HTTPException(status_code=401, detail="Invalid API key")

        # Import the services from documents module
        from app.api.v1.endpoints.documents import (
            embedding_model,
            processing_status,
            qdrant_client,
        )

        # Check if essential services are available
        health_status = {
            "status": "healthy",
            "timestamp": datetime.datetime.now().isoformat(),
            "services": {
                "embedding_model": embedding_model is not None,
                "qdrant_client": qdrant_client is not None,
                "processing_status": len(processing_status),
            },
        }

        # Check if any critical services are down
        critical_services = ["embedding_model", "qdrant_client"]
        critical_services_status = [
            health_status["services"][service] for service in critical_services
        ]

        if not all(critical_services_status):
            health_status["status"] = "degraded"
            health_status["warnings"] = []

            if not health_status["services"]["embedding_model"]:
                health_status["warnings"].append("Embedding model not available")
            if not health_status["services"]["qdrant_client"]:
                health_status["warnings"].append("Qdrant client not available")

        return health_status

    except HTTPException:
        raise
    except Exception as e:
        from app.utils.logger import log_to_backend

        log_to_backend("error", "Unexpected error in health check", error=e)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during health check",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
