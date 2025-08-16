#!/usr/bin/env python3
"""
Simple startup script for Railway deployment
"""
import os
import sys

def main():
    """Start the FastAPI server"""
    try:
        import uvicorn
        
        # Get port from environment (Railway sets this)
        port = int(os.getenv("PORT", 8000))
        host = os.getenv("HOST", "0.0.0.0")
        
        print(f"🚀 Starting Multi-Agent Research API on {host}:{port}")
        print(f"📚 API Documentation will be at: http://{host}:{port}/docs")
        
        # Start the server
        uvicorn.run(
            "backend_server:app",
            host=host,
            port=port,
            log_level="info"
        )
        
    except ImportError as e:
        print(f"❌ Error importing uvicorn: {e}")
        print("📦 Please ensure uvicorn is installed: pip install uvicorn")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()