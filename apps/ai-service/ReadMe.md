# AI Service - Document Processing & AI Q&A

This is the AI service for Vidhigya, providing document processing, OCR, and AI-powered Q&A capabilities.

## Prerequisites

- Python 3.9+
- Tesseract OCR (for text extraction from images)
- Homebrew (for macOS)

## Setup Steps

### 1. System Dependencies

1. Install Tesseract OCR (required for image-based text extraction):

   **macOS:**

   ```bash
   brew install tesseract
   brew install tesseract-lang  # For additional languages including Hindi
   ```

   **Ubuntu/Debian:**

   ```bash
   sudo apt update
   sudo apt install tesseract-ocr tesseract-ocr-hin
   ```

   **Windows:**
   Download from: https://github.com/UB-Mannheim/tesseract/wiki

2. Verify Tesseract installation:
   ```bash
   tesseract --version
   ```

### 2. AI Service Setup

1. Create and activate a virtual environment:

   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

   **Note:** If you encounter PyMuPDF installation issues on macOS ARM64, try:

   ```bash
   pip install --upgrade pip setuptools wheel
   pip install PyMuPDF==1.23.8 --no-cache-dir
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:

   ```
   # Server Configuration
   HOST=0.0.0.0
   PORT=8001

   # Backend API Key for authentication
   AI_SERVICE_API_KEY=your-backend-api-key

   # Qdrant Vector Database
   QDRANT_URL=https://your-qdrant-instance:6333
   QDRANT_COLLECTION=dev_vidhigya_documents_embeddings
   QDRANT_API_KEY=your-qdrant-api-key

   # OCR Configuration
   OCR_ENABLED=true
   OCR_LANGUAGE=eng+hin
   OCR_DPI=300
   OCR_CONFIG=--oem 3 --psm 6

   # NextAuth Secret (must match frontend)
   NEXTAUTH_SECRET=your-nextauth-secret

   # Backend URL for CORS
   BACKEND_URL=http://localhost:3001
   ```

4. Start the AI service:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8001
   ```

## API Documentation

Once the server is running, you can access:

- API documentation: http://localhost:8001/api/v1/docs
- Alternative documentation: http://localhost:8001/api/v1/redoc

## Features

### Document Processing

- **PDF Processing**: Text extraction + OCR for image-based PDFs
- **Word Documents**: DOCX and DOC file support
- **Spreadsheets**: Excel and CSV file processing
- **Images**: OCR for JPG, PNG, TIFF files
- **Text Files**: Plain text processing

### OCR Capabilities

- **Multi-language Support**: English and Hindi (Devanagari script)
- **Image-based PDFs**: Automatic OCR for scanned documents
- **Embedded Images**: OCR for images within documents
- **High Quality**: 300 DPI processing for better accuracy

### AI Q&A

- **Vector Search**: Semantic document search using Qdrant
- **Intelligent Responses**: Context-aware answers from documents
- **Source Attribution**: Links to original document sections
- **Confidence Scoring**: Reliability indicators for responses

## API Endpoints

### Document Upload

```
POST /api/v1/documents/upload
```

Upload and process documents for AI Q&A.

### Embedding Generation

```
POST /api/v1/documents/embeddings/generate
```

Generate text embeddings for custom use.

## Environment Variables

Key environment variables:

- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8001)
- `AI_SERVICE_API_KEY`: Authentication key for backend requests
- `QDRANT_URL`: Vector database URL
- `QDRANT_COLLECTION`: Collection name for document embeddings
- `QDRANT_API_KEY`: Vector database API key
- `OCR_ENABLED`: Enable/disable OCR (default: true)
- `OCR_LANGUAGE`: OCR languages (default: eng+hin)
- `OCR_DPI`: OCR resolution (default: 300)
- `NEXTAUTH_SECRET`: Secret for token verification
- `BACKEND_URL`: Frontend URL for CORS

## Troubleshooting

### PyMuPDF Installation Issues

If you encounter PyMuPDF build errors on macOS ARM64:

1. **Update build tools:**

   ```bash
   pip install --upgrade pip setuptools wheel
   ```

2. **Install with no cache:**

   ```bash
   pip install PyMuPDF==1.23.8 --no-cache-dir
   ```

3. **Alternative: Use conda:**
   ```bash
   conda install -c conda-forge pymupdf
   ```

### Tesseract Issues

1. **Check installation:**

   ```bash
   tesseract --version
   ```

2. **Verify language support:**

   ```bash
   tesseract --list-langs
   ```

3. **Install Hindi language (if missing):**

   ```bash
   # macOS
   brew install tesseract-lang

   # Ubuntu
   sudo apt install tesseract-ocr-hin
   ```

### Qdrant Connection Issues

1. **Check Qdrant URL and API key**
2. **Verify network connectivity**
3. **Ensure collection exists**

### OCR Performance

1. **Increase DPI** for better accuracy (OCR_DPI=300)
2. **Use appropriate language codes** (eng+hin for English + Hindi)
3. **Check image quality** of scanned documents

## Development

- The server runs on http://localhost:8001 by default
- API endpoints are prefixed with `/api/v1`
- Debug mode is enabled by default in development
- Hot reload is enabled for development

## Architecture

This AI service is designed as a **stateless microservice** that:

- **Processes Documents**: Extracts text and generates embeddings
- **Stores Vectors**: Uses Qdrant for semantic search
- **Provides AI Q&A**: Answers questions based on document content
- **No Database Management**: Focuses only on AI/ML tasks

The main backend handles:

- User authentication
- Document metadata storage
- File upload/download
- API gateway functionality

## License

This project is proprietary and confidential. All rights reserved.

Copyright (c) 2024 Vidhigya
