"""
Lambda-optimized backend server
Removes WebSocket functionality and optimizes for serverless deployment
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import asyncio
import json
import logging
import gc
import os
from datetime import datetime
import sys
from pathlib import Path
import time

# Set up logging for Lambda
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add project root to path for imports
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Import the enhanced multi-agent system - with error handling
try:
    from enhanced_research_system import RateLimitedResearchSystem
    RESEARCH_SYSTEM_AVAILABLE = True
    logger.info("Research system module loaded successfully")
except ImportError as e:
    RESEARCH_SYSTEM_AVAILABLE = False
    RateLimitedResearchSystem = None
    logger.warning(f"Research system not available: {e}")

# Simplified backend with just the three specialized agents
# No RAG functionality needed
logger.info("Backend initialized - ML dependencies will be loaded on demand")

# Memory optimization for Lambda
def setup_lambda_optimization():
    """Configure Python for Lambda-efficient operation"""
    gc.set_threshold(700, 10, 10)
    os.environ['TOKENIZERS_PARALLELISM'] = 'false'
    os.environ['OMP_NUM_THREADS'] = '1'
    logger.info("🧠 Lambda optimization configured")

# Initialize optimization
setup_lambda_optimization()

app = FastAPI(
    title="Multi-Agent Research API",
    description="API for the Multi-Agent Research Paper Analysis System (Lambda)",
    version="1.0.0",
    root_path="/prod"  # API Gateway stage path
)

# Configure CORS for Lambda
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for Lambda
    allow_credentials=False,  # Disable credentials for Lambda
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
research_system = None

# Data models (same as original)
class ResearchRequest(BaseModel):
    query: str
    max_papers: Optional[int] = 5
    filters: Optional[dict] = {}

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    memory_usage: Optional[dict] = None


# Initialize research system
async def get_research_system():
    """Initialize research system"""
    global research_system
    if not RESEARCH_SYSTEM_AVAILABLE:
        raise HTTPException(status_code=503, detail="Research system not available - missing dependencies")
    
    if research_system is None:
        try:
            logger.info("🔄 Initializing research system...")
            research_system = RateLimitedResearchSystem()
            logger.info("✅ Research system initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize research system: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to initialize research system")
    return research_system

# Health check endpoint
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for Lambda"""
    memory_usage = None
    try:
        import psutil
        process = psutil.Process()
        memory_info = process.memory_info()
        memory_usage = {
            "rss": memory_info.rss,
            "vms": memory_info.vms,
            "cpu_percent": process.cpu_percent()
        }
    except ImportError:
        logger.warning("psutil not available - memory stats disabled")
    
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0",
        memory_usage=memory_usage
    )

# Research endpoint (HTTP only, no WebSocket)
@app.post("/api/research")
async def start_research(request: ResearchRequest):
    """Start research process (Lambda version - returns results immediately)"""
    try:
        system = await get_research_system()
        
        logger.info(f"🔍 Starting research for: {request.query}")
        start_time = time.time()
        
        # Run research synchronously in Lambda
        results = await system.research_papers_async(
            query=request.query,
            max_papers=request.max_papers,
            filters=request.filters or {}
        )
        
        duration = time.time() - start_time
        logger.info(f"✅ Research completed in {duration:.2f} seconds")
        
        return {
            "status": "completed",
            "results": results,
            "query": request.query,
            "duration": duration,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Research failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Root API endpoint
@app.get("/api/")
async def api_root():
    """API root endpoint"""
    return {
        "message": "Multi-Agent Research API (Lambda)",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "research": "/api/research"
        }
    }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"error": "Endpoint not found", "path": str(request.url)}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "message": str(exc)}
    )

# Lambda startup optimization - disabled pre-warming to reduce cold start time
@app.on_event("startup")
async def startup_event():
    """Lambda startup event - lightweight initialization"""
    logger.info("🚀 Lambda function starting up...")
    logger.info("✅ Lambda function ready - research system will be initialized on first request")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)