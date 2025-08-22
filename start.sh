#!/bin/bash

set -e  # Exit on any error

echo "🚀 Starting Multi-Agent Research Tool..."

# Get port from environment (Render sets this automatically)
PORT=${PORT:-10000}
HOST=${HOST:-0.0.0.0}

echo "🌐 Starting server on $HOST:$PORT"
echo "📚 API Documentation will be available at: https://your-app.onrender.com/docs"
echo "🔍 Health check endpoint: https://your-app.onrender.com/health"

# Start the FastAPI server with uvicorn
exec uvicorn backend_server:app \
    --host "$HOST" \
    --port "$PORT" \
    --log-level info \
    --access-log \
    --loop uvloop \
    --http httptools