#!/usr/bin/env python3

print("Testing imports step by step...")

try:
    print("1. Testing basic imports...")
    import fastapi
    import uvicorn

    print("✅ FastAPI and uvicorn imported successfully")
except Exception as e:
    print(f"❌ FastAPI import failed: {e}")
    exit(1)

try:
    print("2. Testing config import...")
    from app.core.config import settings

    print("✅ Config imported successfully")
except Exception as e:
    print(f"❌ Config import failed: {e}")
    exit(1)

try:
    print("3. Testing documents module import...")
    from app.api.v1.endpoints import documents

    print("✅ Documents module imported successfully")
except Exception as e:
    print(f"❌ Documents module import failed: {e}")
    exit(1)

try:
    print("4. Testing generate_postman import...")
    from generate_postman import generate_postman_collection

    print("✅ Generate postman imported successfully")
except Exception as e:
    print(f"❌ Generate postman import failed: {e}")
    exit(1)

print("✅ All imports successful!")
