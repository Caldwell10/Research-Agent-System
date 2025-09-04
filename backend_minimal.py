"""
Minimal Lambda backend for testing
Removes heavy ML dependencies to get basic API working
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import json
import logging
import os
from datetime import datetime
import time

# Set up logging for Lambda
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Multi-Agent Research API (Minimal)",
    description="Minimal API for testing Lambda deployment",
    version="1.0.0",
    root_path="/prod"  # API Gateway stage path
)

# Configure CORS for Lambda
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class ResearchRequest(BaseModel):
    query: str
    max_papers: Optional[int] = 5
    filters: Optional[dict] = {}

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    environment: str

# Health check endpoint
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for Lambda"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0-minimal",
        environment=os.getenv("ENVIRONMENT", "lambda")
    )

# Mock research endpoint
@app.post("/api/research")
async def start_research(request: ResearchRequest):
    """Mock research endpoint (returns dummy data)"""
    try:
        logger.info(f"🔍 Mock research for: {request.query}")
        
        # Mock response data
        mock_results = {
            "papers": [
                {
                    "title": f"Mock Paper 1 about {request.query}",
                    "authors": ["Author A", "Author B"],
                    "summary": f"This is a mock paper about {request.query}. Lambda backend is working!",
                    "arxiv_id": "2024.0001",
                    "relevance_score": 0.95,
                    "published": "2024-01-01"
                },
                {
                    "title": f"Mock Paper 2 about {request.query}",
                    "authors": ["Author C", "Author D"],
                    "summary": f"Another mock paper about {request.query}. The API is responding correctly.",
                    "arxiv_id": "2024.0002",
                    "relevance_score": 0.87,
                    "published": "2024-01-02"
                }
            ],
            "total_found": 2,
            "search_terms": [request.query],
            "filters_applied": request.filters or {}
        }
        
        return {
            "status": "completed",
            "results": mock_results,
            "query": request.query,
            "duration": 1.5,  # Mock duration
            "timestamp": datetime.now().isoformat(),
            "note": "This is mock data - full AI research system not loaded to reduce Lambda size"
        }
        
    except Exception as e:
        logger.error(f"❌ Research failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Mock RAG chat endpoint
@app.post("/api/rag/chat")
async def rag_chat(request: dict):
    """Mock RAG chat endpoint"""
    try:
        message = request.get("message", "")
        
        return {
            "response": f"Mock response to: '{message}'. The Lambda backend is working! RAG system would process this query with your research papers.",
            "conversation_id": "mock-conversation-123",
            "sources": [
                {
                    "title": "Mock Source Paper",
                    "relevance": 0.9,
                    "excerpt": "This would be a relevant excerpt from your papers..."
                }
            ],
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ RAG chat failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# RAG stats endpoint
@app.get("/api/rag/stats")
async def get_rag_stats():
    """Mock RAG stats endpoint"""
    return {
        "total_papers": 0,
        "total_chunks": 0,
        "knowledge_base_size": "0 MB",
        "last_updated": datetime.now().isoformat(),
        "status": "mock_data"
    }

# Root API endpoint
@app.get("/api/")
async def api_root():
    """API root endpoint"""
    return {
        "message": "Multi-Agent Research API (Minimal Lambda Version)",
        "version": "1.0.0-minimal",
        "status": "operational",
        "note": "This is a minimal version for testing Lambda deployment",
        "endpoints": {
            "health": "/api/health",
            "research": "/api/research (mock data)",
            "rag_chat": "/api/rag/chat (mock responses)",
            "rag_stats": "/api/rag/stats (mock stats)"
        }
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Multi-Agent Research API (Lambda)", "status": "running"}

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)