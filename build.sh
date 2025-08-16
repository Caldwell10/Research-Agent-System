#!/bin/bash

echo "🔨 Building Multi-Agent Research Tool..."

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements_backend.txt

# Build frontend if Node.js is available
if command -v npm &> /dev/null; then
    echo "🎨 Building frontend..."
    cd frontend
    npm ci
    npm run build
    cd ..
    echo "✅ Frontend build complete"
else
    echo "⚠️  Node.js not found, skipping frontend build"
fi

echo "🚀 Build complete!"