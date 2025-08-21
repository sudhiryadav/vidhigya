#!/usr/bin/env python3
"""
Test script for restart-processing endpoint
"""

import json

import requests

# Configuration
BASE_URL = "http://localhost:8002"
API_KEY = "Qjgh28D7HnTzNeLtkFYq2ZVY9w-6N0VpdJMLmnAIuUk"
HEADERS = {"X-API-Key": API_KEY, "Content-Type": "application/json"}


def test_health_endpoint():
    """Test the health endpoint"""
    print("🔍 Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health", headers=HEADERS)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()


def test_status_endpoint(document_id):
    """Test the status endpoint"""
    print(f"🔍 Testing status endpoint for document: {document_id}")
    response = requests.get(
        f"{BASE_URL}/api/v1/admin/documents/status/{document_id}", headers=HEADERS
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()


def test_restart_endpoint(document_id):
    """Test the restart endpoint"""
    print(f"🔍 Testing restart endpoint for document: {document_id}")
    response = requests.post(
        f"{BASE_URL}/api/v1/admin/documents/restart-processing/{document_id}",
        headers=HEADERS,
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()


def add_test_document_to_processing():
    """Add a test document to processing status"""
    print("🔧 Adding test document to processing status...")

    # Import the function from the documents module
    import os
    import sys

    sys.path.append(os.path.dirname(__file__))

    from app.api.v1.endpoints.documents import update_processing_status

    # Add a test document in processing status
    test_document_id = "test-restart-document-123"
    update_processing_status(
        document_id=test_document_id,
        status="PROCESSING",
        details="Test document for restart functionality",
        progress=50,
    )

    print(f"✅ Added test document: {test_document_id}")
    return test_document_id


if __name__ == "__main__":
    print("🚀 Testing restart-processing endpoint functionality")
    print("=" * 50)

    # Test health endpoint
    test_health_endpoint()

    # Test with non-existent document
    test_status_endpoint("non-existent-doc")
    test_restart_endpoint("non-existent-doc")

    # Add test document and test restart
    test_doc_id = add_test_document_to_processing()

    # Test status with test document
    test_status_endpoint(test_doc_id)

    # Test restart with test document
    test_restart_endpoint(test_doc_id)

    # Test status again after restart
    test_status_endpoint(test_doc_id)

    print("✅ Testing completed!")
