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
import gc
import os
from datetime import datetime
import sys
from pathlib import Path
import socketio
import time

# Add project root to path for imports
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Import the enhanced multi-agent system
from enhanced_research_system import RateLimitedResearchSystem
from agents.rag_agent import RAGAgent
from utils.groq_llm import GroqLLM

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Memory optimization settings
def setup_memory_optimization():
    """Configure Python for memory-efficient operation"""
    # More aggressive garbage collection
    gc.set_threshold(700, 10, 10)  # Trigger GC more frequently
    
    # Set environment variables for memory efficiency
    os.environ['TOKENIZERS_PARALLELISM'] = 'false'  # Reduce tokenizer memory
    os.environ['OMP_NUM_THREADS'] = '1'  # Limit OpenMP threads
    
    logger.info("🧠 Memory optimization configured")

app = FastAPI(
    title="Multi-Agent Research API",
    description="API for the Multi-Agent Research Paper Analysis System",
    version="1.0.0"
)

# Configure CORS - Production and development origins
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001").split(",")

# Add current domain for production
if os.getenv("RENDER_EXTERNAL_URL"):
    cors_origins.append(os.getenv("RENDER_EXTERNAL_URL"))

# In production, also allow the render domain
if os.getenv("ENVIRONMENT") == "production":
    cors_origins.extend(["*"])  # Allow all origins in production (can be restricted later)
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
static_dir = "frontend/dist"
if os.path.exists(static_dir):
    # Mount static assets
    app.mount("/assets", StaticFiles(directory=f"{static_dir}/assets"), name="assets")
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    
    # Import FileResponse for serving HTML
    from fastapi.responses import FileResponse
    
    @app.get("/")
    async def serve_frontend():
        """Serve the React frontend"""
        return FileResponse(f"{static_dir}/index.html")
    
    @app.get("/{path:path}")
    async def serve_frontend_routes(path: str):
        """Serve React frontend for all routes (SPA support)"""
        # Don't intercept API routes
        if path.startswith("api/") or path.startswith("socket.io/") or path.startswith("docs") or path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        # For all other routes, serve the React app
        return FileResponse(f"{static_dir}/index.html")
else:
    logger.warning("⚠️ Frontend dist directory not found - API only mode")

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

# Global variables
research_system = None
rag_agent = None
rag_config = None

# Initialize the research system
def get_rag_agent():
    """Lazy initialize RAG agent when first needed"""
    global rag_agent, rag_config
    if rag_agent is None and rag_config is not None:
        logger.info("🔄 Initializing RAG agent on first use...")
        rag_agent = RAGAgent(
            groq_llm=rag_config['groq_llm'],
            s3_bucket=rag_config['s3_bucket'],
            s3_prefix=rag_config['s3_prefix']
        )
        logger.info("✅ RAG agent initialized successfully")
    return rag_agent

async def initialize_system():
    global research_system, rag_agent
    try:
        research_system = RateLimitedResearchSystem(max_papers=5)
        logger.info("✅ Enhanced Multi-Agent Research System initialized")
        
        # Store RAG configuration for lazy initialization
        try:
            groq_llm = GroqLLM()
            s3_bucket = os.getenv('RAG_S3_BUCKET')
            s3_prefix = os.getenv('RAG_S3_PREFIX', 'knowledge_base')
            
            if s3_bucket:
                # Store config for lazy initialization
                global rag_config
                rag_config = {
                    'groq_llm': groq_llm,
                    's3_bucket': s3_bucket,
                    's3_prefix': s3_prefix
                }
                logger.info(f"✅ RAG system configured for lazy loading: {s3_bucket}/{s3_prefix}")
                rag_agent = None  # Will be initialized on first use
            else:
                logger.error("❌ S3 bucket configuration required - RAG agent now requires S3 storage")
                rag_agent = None
                
        except Exception as e:
            logger.warning(f"⚠️ RAG system configuration failed: {e}")
            rag_agent = None
        
        return True
    except Exception as e:
        logger.error(f"❌ Failed to initialize research system: {e}")
        return False

@app.on_event("startup")
async def startup_event():
    """Initialize the research system on startup with memory optimization"""
    # Setup memory optimization first
    setup_memory_optimization()
    
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

# RAG Chat Models
class RAGChatRequest(BaseModel):
    question: str
    research_topic: Optional[str] = None  # If provided, will first research this topic

class RAGChatResponse(BaseModel):
    status: str
    response: str
    confidence_score: float
    referenced_papers: List[dict]
    execution_time: float
    knowledge_base_stats: Optional[dict] = None

@app.post("/api/rag/chat", response_model=RAGChatResponse)
async def rag_chat(request: RAGChatRequest):
    """
    RAG-powered chat endpoint for research questions
    """
    if not rag_config:
        raise HTTPException(status_code=503, detail="RAG system not initialized")
    
    try:
        start_time = time.time()
        
        # If research topic provided, first add papers to knowledge base
        if request.research_topic:
            logger.info(f"🔬 Researching topic: {request.research_topic}")
            
            # Use the research system to find papers
            if research_system:
                research_results = await research_system.research_topic_with_progress(
                    request.research_topic, 
                    save_report=False
                )
                
                if research_results['status'] == 'success' and 'research_results' in research_results:
                    # Add papers to RAG knowledge base
                    papers = research_results['research_results']['papers']
                    if papers:
                        add_result = get_rag_agent().add_papers_to_knowledge_base(papers, request.research_topic)
                        logger.info(f"📚 Added {len(papers)} papers to knowledge base")
                    else:
                        logger.warning("No papers found in research results")
        
        # Answer the question using RAG
        rag_response = get_rag_agent().answer_question(request.question)
        
        # Get knowledge base stats
        kb_stats = get_rag_agent().get_knowledge_base_stats()
        
        execution_time = time.time() - start_time
        
        # Cleanup memory after heavy RAG operations
        gc.collect()
        
        return RAGChatResponse(
            status=rag_response['status'],
            response=rag_response['response'],
            confidence_score=rag_response.get('confidence_score', 0.0),
            referenced_papers=rag_response.get('retrieved_papers', []),
            execution_time=execution_time,
            knowledge_base_stats=kb_stats
        )
        
    except Exception as e:
        logger.error(f"RAG chat error: {e}")
        raise HTTPException(status_code=500, detail=f"RAG chat failed: {str(e)}")

@app.get("/api/rag/stats")
async def rag_stats():
    """Get RAG knowledge base statistics"""
    if not rag_config:
        raise HTTPException(status_code=503, detail="RAG system not initialized")
    
    try:
        stats = get_rag_agent().get_knowledge_base_stats()
        return {
            "status": "success",
            "stats": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting RAG stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@app.get("/api/rag/papers")
async def rag_papers():
    """Get list of papers in knowledge base"""
    if not rag_config:
        raise HTTPException(status_code=503, detail="RAG system not initialized")
    
    try:
        # Get papers from knowledge base metadata
        stats = get_rag_agent().get_knowledge_base_stats()
        paper_info = []
        
        # Extract unique papers from metadata
        if hasattr(get_rag_agent().vector_store, 'chunk_metadata'):
            seen_papers = set()
            for chunk_meta in get_rag_agent().vector_store.chunk_metadata.values():
                paper_id = chunk_meta.get('paper_id', 'unknown')
                if paper_id not in seen_papers:
                    seen_papers.add(paper_id)
                    paper_info.append({
                        'paper_id': paper_id,
                        'title': chunk_meta.get('paper_title', 'Unknown'),
                        'authors': chunk_meta.get('authors', []),
                        'source': chunk_meta.get('source', 'unknown')
                    })
        
        return {
            "status": "success",
            "papers": paper_info,
            "total_papers": len(paper_info),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting papers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get papers: {str(e)}")

@app.get("/api/rag/search-test")
async def test_search(query: str = "reinforcement learning", limit: int = 5):
    """Test search functionality"""
    if not rag_config:
        raise HTTPException(status_code=503, detail="RAG system not initialized")
    
    try:
        # Test vector search
        results = get_rag_agent().vector_store.search_by_text(
            query, 
            get_rag_agent().embedding_service, 
            k=limit
        )
        
        return {
            "status": "success",
            "query": query,
            "results": results,
            "total_found": len(results),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error testing search: {e}")
        raise HTTPException(status_code=500, detail=f"Search test failed: {str(e)}")

@app.get("/api/")
async def api_root():
    """API root endpoint"""
    return {
        "message": "Multi-Agent Research API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
        "rag_chat": "/api/rag/chat",
        "rag_stats": "/api/rag/stats",
        "frontend": "Frontend served at /" if os.path.exists("frontend/dist") else "No frontend available"
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