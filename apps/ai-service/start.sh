#!/bin/bash

# Start FastAPI AI Service
echo "Starting FastAPI AI Service..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Start the service
echo "Starting service on http://localhost:8000"
python main.py 