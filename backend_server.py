"""
Railway-compatible backend server
Simple FastAPI server for multi-agent research system
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import asyncio
import json
import logging
import os
from datetime import datetime
import sys
from pathlib import Path
import time
import psutil
import uvicorn

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add project root to path for imports
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Import the enhanced multi-agent system
try:
    from enhanced_research_system import RateLimitedResearchSystem
    RESEARCH_SYSTEM_AVAILABLE = True
    logger.info("Research system module loaded successfully")
except ImportError as e:
    RESEARCH_SYSTEM_AVAILABLE = False
    RateLimitedResearchSystem = None
    logger.warning(f"Research system not available: {e}")

app = FastAPI(
    title="Multi-Agent Research API",
    description="API for the Multi-Agent Research Paper Analysis System",
    version="1.0.0"
)

# Configure CORS - Allow all origins for Railway deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global research system instance
research_system = None

# Data models
class ResearchRequest(BaseModel):
    query: str
    max_papers: Optional[int] = 5

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
            logger.error(f" Failed to initialize research system: {e}")
            raise HTTPException(status_code=503, detail=f"System initialization failed: {str(e)}")
    
    return research_system

# Health check endpoint
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    memory_usage = None
    try:
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

# Research endpoint
@app.post("/api/research")
async def start_research(request: ResearchRequest):
    """Start research analysis"""
    try:
        logger.info(f"🔍 Starting research for: {request.query}")
        start_time = time.time()
        
        system = await get_research_system()
        
        # Progress callback for real-time updates
        progress_updates = []
        
        async def progress_callback(stage: str, message: str):
            timestamp = datetime.now().isoformat()
            progress_updates.append({
                "stage": stage,
                "message": message,
                "timestamp": timestamp
            })
            logger.info(f"Progress - {stage}: {message}")
        
        # Execute research with progress tracking
        results = await system.research_topic_with_progress(
            query=request.query,
            save_report=True,
            progress_callback=progress_callback
        )
        
        duration = time.time() - start_time
        
        # Extract metrics from results
        papers_found = results.get("papers_analyzed", 0)
        execution_time = results.get("execution_time_seconds", duration)
        
        # Get insights count safely
        analysis_results = results.get("analysis_results", {})
        insights = analysis_results.get("insights", {})
        key_insights_count = len(insights.get("trending_methods", []))
        
        # Get recommendations count
        report_results = results.get("report", {})
        recommendations_count = len(report_results.get("recommendations", []))
        
        # Build comprehensive response with metrics
        response = {
            "status": "completed",
            "query": request.query,
            "timestamp": datetime.now().isoformat(),
            "metrics": {
                "papers_found": papers_found,
                "execution_time_seconds": round(execution_time, 2),
                "key_insights_count": key_insights_count,
                "recommendations_count": recommendations_count,
                "research_stages_completed": len(progress_updates)
            },
            "summary": results.get("summary", {}),
            "research_results": results.get("research_results", {}),
            "analysis_results": analysis_results,
            "report": report_results,
            "progress_updates": progress_updates,
            "full_results": results
        }
        
        return response
        
    except Exception as e:
        logger.error(f"❌ Research failed: {str(e)}")
        
        # Return detailed error response instead of raising exception
        return {
            "status": "error",
            "query": request.query,
            "timestamp": datetime.now().isoformat(),
            "error": {
                "message": str(e),
                "type": type(e).__name__,
                "duration": time.time() - start_time if 'start_time' in locals() else 0
            },
            "metrics": {
                "papers_found": 0,
                "execution_time_seconds": time.time() - start_time if 'start_time' in locals() else 0,
                "key_insights_count": 0,
                "recommendations_count": 0,
                "research_stages_completed": len(progress_updates) if 'progress_updates' in locals() else 0
            },
            "progress_updates": progress_updates if 'progress_updates' in locals() else []
        }

# Root API endpoint
@app.get("/api/")
async def api_root():
    """API root endpoint"""
    return {
        "message": "Multi-Agent Research API (Railway)",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "research": "/api/research"
        }
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Multi-Agent Research API", 
        "status": "running",
        "platform": "Railway"
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

# Startup event
@app.on_event("startup")
async def startup_event():
    """Startup event"""
    logger.info(" Backend server starting up...")
    logger.info(" Backend server ready")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)