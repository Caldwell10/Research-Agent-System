#!/bin/bash

set -e  # Exit on any error

echo "🏗️  Starting Multi-Agent Research Tool build process..."

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Install Node.js and build frontend
echo "📦 Installing Node.js dependencies..."
cd frontend

# Debug: Show current directory and contents
echo "Current directory: $(pwd)"
echo "Contents:"
ls -la

# Install dependencies
npm ci --production=false

# Build the frontend (skip type checking for production)
echo "🎨 Building React frontend..."
# Set production environment variables - use same domain since frontend and backend are on same service
export VITE_API_URL="https://multi-agent-research-tool.onrender.com"
export VITE_WS_URL="wss://multi-agent-research-tool.onrender.com"
export VITE_APP_NAME="Multi-Agent Research Tool"
export VITE_APP_VERSION="1.0.0"
export VITE_ENABLE_PWA="true"
export VITE_ENABLE_ANALYTICS="false"
npm run build:production

# Move back to root
cd ..

# Copy built frontend to backend static directory
echo "📁 Setting up static files..."
if [ -d "frontend/dist" ]; then
    echo "✅ Frontend build successful - dist directory found"
    ls -la frontend/dist/
else
    echo "❌ Frontend build failed - no dist directory found"
    exit 1
fi

echo "🚀 Build process completed successfully!"