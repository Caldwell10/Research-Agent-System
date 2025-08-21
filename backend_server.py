# backend_server.py - FastAPI server for Multi-Agent Research System
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
import asyncio
import json
import logging
from datetime import datetime
import sys
import os
from pathlib import Path
import socketio
import time

# Add project root to path for imports
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Import the enhanced multi-agent system
from enhanced_research_system import RateLimitedResearchSystem

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Multi-Agent Research API",
    description="API for the Multi-Agent Research Paper Analysis System",
    version="1.0.0"
)

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
research_system = None

# Mount static files (frontend) if they exist
if os.path.exists("frontend/dist"):
    app.mount("/static", StaticFiles(directory="frontend/dist", html=True), name="static")
    
    # Serve index.html at root path
    from fastapi.responses import FileResponse
    
    @app.get("/")
    async def read_root():
        return FileResponse("frontend/dist/index.html")

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=cors_origins
)

# Pydantic models for API
class ResearchRequest(BaseModel):
    query: str
    max_papers: Optional[int] = 5
    save_report: Optional[bool] = True

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: Optional[str] = "1.0.0"

# Initialize the research system
async def initialize_system():
    global research_system
    try:
        research_system = RateLimitedResearchSystem(max_papers=5)
        logger.info("✅ Enhanced Multi-Agent Research System initialized")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to initialize research system: {e}")
        return False

@app.on_event("startup")
async def startup_event():
    """Initialize the research system on startup"""
    success = await initialize_system()
    if not success:
        logger.warning("⚠️ Research system not fully initialized - some features may not work")

# Socket.IO event handlers
@sio.event
async def connect(sid, environ):
    logger.info(f"Socket.IO client connected: {sid}")
    await sio.emit('message', {'type': 'connection', 'data': 'Connected to Multi-Agent Research Server'}, room=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Socket.IO client disconnected: {sid}")

@sio.event
async def message(sid, data):
    logger.info(f"Received message from {sid}: {data}")
    await sio.emit('message', {'type': 'echo', 'data': f'Received: {data}'}, room=sid)

# Broadcast function for research updates
async def broadcast_update(event_type: str, data: dict):
    """Broadcast updates to all connected clients"""
    try:
        message = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        await sio.emit('message', message)
        logger.info(f"Broadcasted {event_type} to all clients")
    except Exception as e:
        logger.error(f"Error broadcasting update: {e}")

# Create Socket.IO ASGI app
socket_app = socketio.ASGIApp(sio)

# API Routes
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    status = "healthy" if research_system is not None else "unhealthy"
    return HealthResponse(
        status=status,
        timestamp=datetime.now().isoformat(),
        version="1.0.0"
    )

@app.post("/api/research")
async def start_research(request: ResearchRequest):
    """Start research analysis"""
    if research_system is None:
        raise HTTPException(
            status_code=503,
            detail="Research system not initialized"
        )
    
    try:
        # Broadcast research started
        await broadcast_update("research_started", {
            "query": request.query, 
            "max_papers": request.max_papers
        })
        
        # Send progress updates during research
        async def send_progress(stage: str, message: str):
            await broadcast_update("research_progress", {
                "stage": stage, 
                "message": message
            })
        
        # Run research with progress updates
        logger.info(f"🔬 Starting enhanced research for: '{request.query}'")
        
        # Use the enhanced research system with progress callbacks
        results = await research_system.research_topic_with_progress(
            query=request.query,
            save_report=request.save_report,
            progress_callback=send_progress
        )
        
        if results.get('status') == 'success':
            await send_progress("completed", "✅ Research analysis complete!")
            await broadcast_update("research_complete", results)
        else:
            await send_progress("error", f"❌ Research failed: {results.get('message', 'Unknown error')}")
        
        return results
        
    except Exception as e:
        error_msg = f"Research failed: {str(e)}"
        logger.error(error_msg)
        
        # Broadcast error
        await broadcast_update("error", {"error": str(e)})
        
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/api/research/summary")
async def get_research_summary(query: str):
    """Get quick research summary"""
    if research_system is None:
        raise HTTPException(
            status_code=503,
            detail="Research system not initialized"
        )
    
    try:
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            None,
            research_system.get_research_summary,
            query
        )
        return results
    except Exception as e:
        logger.error(f"Quick research failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Mount Socket.IO app
app.mount("/socket.io", socket_app)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Multi-Agent Research API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": f"Path {request.url.path} not found"}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    print("🚀 Starting Enhanced Multi-Agent Research API Server...")
    print(f"📡 API will be available at: http://{host}:{port}")
    print(f"📚 API Documentation: http://{host}:{port}/docs")
    print(f"🔌 Socket.IO endpoint: http://{host}:{port}/socket.io/")
    print("⚡ Features: Rate limiting, progress updates, WebSocket support")
    print("-" * 60)
    
    uvicorn.run(
        "backend_server:app",
        host=host,
        port=port,
        reload=os.getenv("ENVIRONMENT") != "production",
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )