#!/bin/bash

# FastAPI MQTT Firebase Integration - Startup Script

set -e

echo "🚀 Starting FastAPI MQTT Firebase Integration"

# Check if Poetry is installed
if ! command -v poetry &> /dev/null; then
    echo "❌ Poetry is not installed. Please install Poetry first."
    echo "   Visit: https://python-poetry.org/docs/#installation"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.example .env
    echo "📝 Please edit .env file with your configuration before running the application."
    exit 1
fi

# Check if Firebase credentials file exists
FIREBASE_CREDS=$(grep FIREBASE_CREDENTIALS_PATH .env | cut -d '=' -f2)
if [ ! -f "$FIREBASE_CREDS" ]; then
    echo "❌ Firebase credentials file not found: $FIREBASE_CREDS"
    echo "   Please download your Firebase Admin SDK JSON file and place it in the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
poetry install

# Run the application
echo "🔥 Starting FastAPI application..."
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
