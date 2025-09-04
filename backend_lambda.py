"""
Lambda-optimized backend server
Removes WebSocket functionality and optimizes for serverless deployment
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import asyncio
import json
import logging
import gc
import os
from datetime import datetime
import sys
from pathlib import Path
import time

# Add project root to path for imports
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Import the enhanced multi-agent system
from enhanced_research_system import RateLimitedResearchSystem
from agents.rag_agent import RAGAgent
from utils.groq_llm import GroqLLM

# Set up logging for Lambda
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

class RAGChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class RAGChatResponse(BaseModel):
    response: str
    conversation_id: str
    sources: List[dict] = []
    timestamp: str

# Initialize research system
async def get_research_system():
    """Initialize research system with lazy loading and S3 configuration"""
    global research_system
    if research_system is None:
        try:
            logger.info("🔄 Initializing research system...")
            
            # Get S3 bucket name from environment
            s3_bucket = os.getenv("S3_BUCKET_NAME", "caldwell-research-kb-570466")
            logger.info(f"🪣 Using S3 bucket: {s3_bucket}")
            
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
    import psutil
    process = psutil.Process()
    memory_info = process.memory_info()
    
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0",
        memory_usage={
            "rss": memory_info.rss,
            "vms": memory_info.vms,
            "cpu_percent": process.cpu_percent()
        }
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

# RAG Chat endpoint
@app.post("/api/rag/chat", response_model=RAGChatResponse)
async def rag_chat(request: RAGChatRequest):
    """Process RAG chat request"""
    try:
        system = await get_research_system()
        
        # Initialize RAG agent if not exists
        if not hasattr(system, 'rag_agent'):
            logger.info("🔄 Initializing RAG agent...")
            s3_bucket = os.getenv("S3_BUCKET_NAME", "caldwell-research-kb-570466")
            groq_llm = GroqLLM()
            system.rag_agent = RAGAgent(groq_llm=groq_llm, s3_bucket=s3_bucket)
        
        # Process the chat request
        response_data = await system.rag_agent.chat(
            message=request.message,
            conversation_id=request.conversation_id
        )
        
        return RAGChatResponse(
            response=response_data.get("response", ""),
            conversation_id=response_data.get("conversation_id", ""),
            sources=response_data.get("sources", []),
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"❌ RAG chat failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# RAG stats endpoint
@app.get("/api/rag/stats")
async def get_rag_stats():
    """Get RAG knowledge base statistics"""
    try:
        system = await get_research_system()
        
        if not hasattr(system, 'rag_agent'):
            s3_bucket = os.getenv("S3_BUCKET_NAME", "caldwell-research-kb-570466")
            groq_llm = GroqLLM()
            system.rag_agent = RAGAgent(groq_llm=groq_llm, s3_bucket=s3_bucket)
        
        stats = await system.rag_agent.get_knowledge_base_stats()
        return stats
        
    except Exception as e:
        logger.error(f"❌ Failed to get RAG stats: {str(e)}")
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
            "research": "/api/research",
            "rag_chat": "/api/rag/chat",
            "rag_stats": "/api/rag/stats"
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

# Lambda startup optimization
@app.on_event("startup")
async def startup_event():
    """Lambda startup event"""
    logger.info("🚀 Lambda function starting up...")
    # Pre-warm the research system
    await get_research_system()
    logger.info("✅ Lambda function ready")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)