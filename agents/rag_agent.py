#!/usr/bin/env python3
"""
RAG Agent that combines retrieval and generation for research Q&A
"""

import json
from typing import List, Dict, Any, Optional
from pathlib import Path
import logging
from datetime import datetime
import sys

# Add project root to path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from rag.text_processor import TextProcessor, TextChunk
from rag.embedding_service import EmbeddingService  
from rag.s3_vector_store import S3VectorStore
from utils.groq_llm import GroqLLM

logger = logging.getLogger(__name__)

class RAGAgent:
    """
    Retrieval-Augmented Generation agent for research papers
    """
    
    def __init__(self, groq_llm: GroqLLM, s3_bucket: str = None, s3_prefix: str = "knowledge_base"):
        """
        Initialize RAG agent with S3 storage
        
        Args:
            groq_llm: Groq LLM instance
            s3_bucket: S3 bucket name (required for cloud storage)
            s3_prefix: S3 prefix for objects
        """
        self.llm = groq_llm
        
        # Initialize components
        logger.info("Initializing RAG components...")
        
        self.text_processor = TextProcessor()
        self.embedding_service = EmbeddingService(lazy_load=True)
        
        # Initialize S3 vector store
        if not s3_bucket:
            raise ValueError("s3_bucket is required - RAG agent now uses S3 storage only")
        
        # Use default embedding dimension to avoid loading model during init
        self.vector_store = S3VectorStore(
            s3_bucket=s3_bucket,
            s3_prefix=s3_prefix,
            embedding_dimension=384  # Default for all-MiniLM-L6-v2, will be updated when model loads
        )
        logger.info(f"Using S3 vector store: {s3_bucket}/{s3_prefix}")
        
        # Conversation history
        self.conversation_history = []
        
        logger.info("RAG Agent initialized successfully")
    
    def add_papers_to_knowledge_base(self, papers: List[Dict[str, Any]], research_topic: str = None) -> Dict[str, Any]:
        """
        Add research papers to the knowledge base
        
        Args:
            papers: List of paper dictionaries from ResearcherAgent
            research_topic: Research topic for context-specific chunk IDs
            
        Returns:
            Status dictionary with processing results
        """
        if not papers:
            return {
                "status": "error",
                "message": "No papers provided"
            }
        
        try:
            logger.info(f"Adding {len(papers)} papers to knowledge base...")
            
            # Process papers into chunks with topic context
            all_chunks = self.text_processor.batch_process_papers(papers, research_topic)
            
            if not all_chunks:
                return {
                    "status": "error", 
                    "message": "No text chunks generated from papers"
                }
            
            # Create embeddings for chunks
            chunk_dict = [{"chunk_id": chunk.chunk_id, "text": chunk.text} for chunk in all_chunks]
            embeddings = self.embedding_service.create_embeddings_for_chunks(chunk_dict)
            
            if not embeddings:
                return {
                    "status": "error",
                    "message": "Failed to create embeddings"
                }
            
            # Add to vector store
            self.vector_store.add_chunks(all_chunks, embeddings)
            
            # Get statistics
            stats = self.vector_store.get_stats()
            
            return {
                "status": "success",
                "message": f"Added {len(papers)} papers to knowledge base",
                "papers_added": len(papers),
                "chunks_created": len(all_chunks),
                "chunks_stored": stats['total_chunks'],
                "knowledge_base_stats": stats
            }
            
        except Exception as e:
            logger.error(f"Error adding papers to knowledge base: {e}")
            return {
                "status": "error",
                "message": f"Failed to add papers: {str(e)}"
            }
    
    def retrieve_relevant_context(self, query: str, k: int = 5, score_threshold: float = 0.0) -> List[Dict[str, Any]]:
        """
        Retrieve relevant paper chunks for a query
        
        Args:
            query: User question
            k: Number of chunks to retrieve
            score_threshold: Minimum similarity score
            
        Returns:
            List of relevant chunks with metadata
        """
        try:
            results = self.vector_store.search_by_text(
                query_text=query,
                embedding_service=self.embedding_service,
                k=k,
                score_threshold=score_threshold
            )
            
            logger.info(f"Retrieved {len(results)} relevant chunks for query")
            return results
            
        except Exception as e:
            logger.error(f"Error retrieving context: {e}")
            return []
    
    def _format_context_for_llm(self, retrieved_chunks: List[Dict[str, Any]]) -> str:
        """
        Format retrieved chunks for LLM input
        
        Args:
            retrieved_chunks: List of retrieved chunk dictionaries
            
        Returns:
            Formatted context string
        """
        if not retrieved_chunks:
            return "No relevant research papers found."
        
        context_parts = []
        context_parts.append("RELEVANT RESEARCH PAPERS:")
        context_parts.append("=" * 50)
        
        for i, chunk in enumerate(retrieved_chunks, 1):
            paper_title = chunk.get('paper_title', 'Unknown Title')
            authors = chunk.get('authors', [])
            author_str = ', '.join(authors[:3]) + ('...' if len(authors) > 3 else '')
            source = chunk.get('source', 'unknown')
            chunk_type = chunk.get('chunk_type', 'content')
            score = chunk.get('score', 0)
            text = chunk.get('text', '')
            
            # Add paper metadata
            paper_metadata = chunk.get('paper_metadata', {})
            citation_count = paper_metadata.get('citation_count', 'N/A')
            venue = paper_metadata.get('venue', 'N/A')
            
            context_parts.append(f"\n[Paper {i}] {paper_title}")
            context_parts.append(f"Authors: {author_str}")
            context_parts.append(f"Source: {source} | Citations: {citation_count} | Venue: {venue}")
            context_parts.append(f"Section: {chunk_type} | Relevance: {score:.3f}")
            context_parts.append(f"Content: {text}")
            context_parts.append("-" * 40)
        
        return "\n".join(context_parts)
    
    def _create_rag_prompt(self, query: str, context: str, conversation_history: List[Dict] = None) -> str:
        """
        Create a prompt for the RAG system
        
        Args:
            query: User question
            context: Retrieved context from papers
            conversation_history: Previous conversation context
            
        Returns:
            Formatted prompt for LLM
        """
        prompt_parts = []
        
        # System message
        prompt_parts.append("""You are a research assistant AI that helps users understand academic research papers. Your responses should be:
1. ACCURATE: Only use information from the provided research papers
2. COMPREHENSIVE: Synthesize information across multiple papers when relevant
3. CITED: Always reference specific papers and authors when making claims
4. BALANCED: Present different perspectives when papers disagree
5. HELPFUL: Explain complex concepts clearly and provide actionable insights

When you don't have enough information from the papers to answer a question completely, clearly state what you can and cannot answer based on the available research.""")
        
        # Add conversation history if available
        if conversation_history:
            prompt_parts.append("\nPREVIOUS CONVERSATION:")
            for turn in conversation_history[-3:]:  # Last 3 turns for context
                prompt_parts.append(f"User: {turn.get('query', '')}")
                prompt_parts.append(f"Assistant: {turn.get('response', '')[:200]}...")
        
        # Add retrieved context
        prompt_parts.append(f"\n{context}")
        
        # Add current question
        prompt_parts.append(f"\nUSER QUESTION: {query}")
        
        prompt_parts.append("""\nPlease provide a comprehensive answer based on the research papers above. Include:
- Direct answers with specific citations (Author, Paper Title)
- Key findings and methodologies mentioned
- Any limitations or areas for future research mentioned
- If multiple papers discuss the topic, synthesize their perspectives

Format citations as: (Author et al., "Paper Title")""")
        
        return "\n".join(prompt_parts)
    
    def answer_question(self, query: str, include_context: bool = True, k: int = 5) -> Dict[str, Any]:
        """
        Answer a question using RAG
        
        Args:
            query: User question
            include_context: Whether to include retrieved context in response
            k: Number of papers to retrieve
            
        Returns:
            Answer dictionary with response and metadata
        """
        try:
            start_time = datetime.now()
            
            # Retrieve relevant context
            retrieved_chunks = self.retrieve_relevant_context(query, k=k)
            
            if not retrieved_chunks:
                return {
                    "status": "no_context",
                    "response": "I don't have enough relevant research papers in my knowledge base to answer this question. Please try a different query or add more papers to the knowledge base.",
                    "query": query,
                    "retrieved_papers": [],
                    "execution_time": (datetime.now() - start_time).total_seconds()
                }
            
            # Format context for LLM
            context = self._format_context_for_llm(retrieved_chunks)
            
            # Create RAG prompt
            prompt = self._create_rag_prompt(query, context, self.conversation_history)
            
            # Generate response using Groq
            response = self.llm(prompt)
            
            # Extract unique papers referenced
            referenced_papers = []
            seen_papers = set()
            
            for chunk in retrieved_chunks:
                paper_id = chunk.get('paper_id', '')
                if paper_id and paper_id not in seen_papers:
                    paper_info = {
                        'paper_id': paper_id,
                        'title': chunk.get('paper_title', ''),
                        'authors': chunk.get('authors', []),
                        'source': chunk.get('source', ''),
                        'citation_count': chunk.get('paper_metadata', {}).get('citation_count', 'N/A'),
                        'venue': chunk.get('paper_metadata', {}).get('venue', 'N/A'),
                        'relevance_score': chunk.get('score', 0)
                    }
                    referenced_papers.append(paper_info)
                    seen_papers.add(paper_id)
            
            # Store conversation turn
            conversation_turn = {
                'timestamp': datetime.now().isoformat(),
                'query': query,
                'response': response,
                'referenced_papers': len(referenced_papers),
                'retrieval_score': max(chunk.get('score', 0) for chunk in retrieved_chunks) if retrieved_chunks else 0
            }
            self.conversation_history.append(conversation_turn)
            
            # Keep only last 10 conversation turns
            if len(self.conversation_history) > 10:
                self.conversation_history = self.conversation_history[-10:]
            
            result = {
                "status": "success",
                "response": response,
                "query": query,
                "retrieved_papers": referenced_papers,
                "execution_time": (datetime.now() - start_time).total_seconds(),
                "confidence_score": max(chunk.get('score', 0) for chunk in retrieved_chunks) if retrieved_chunks else 0
            }
            
            # Include raw context if requested
            if include_context:
                result["retrieved_context"] = retrieved_chunks
            
            return result
            
        except Exception as e:
            logger.error(f"Error answering question: {e}")
            return {
                "status": "error",
                "response": f"Sorry, I encountered an error while processing your question: {str(e)}",
                "query": query,
                "retrieved_papers": [],
                "execution_time": (datetime.now() - start_time).total_seconds()
            }
    
    def get_knowledge_base_stats(self) -> Dict[str, Any]:
        """Get statistics about the knowledge base"""
        return self.vector_store.get_stats()
    
    def clear_conversation_history(self):
        """Clear conversation history"""
        self.conversation_history = []
        logger.info("Cleared conversation history")
    
    def export_knowledge_base_summary(self) -> Dict[str, Any]:
        """Export a summary of the knowledge base contents"""
        stats = self.get_knowledge_base_stats()
        
        # Get sample papers
        sample_papers = []
        seen_papers = set()
        
        for metadata in list(self.vector_store.chunk_metadata.values())[:20]:
            paper_id = metadata.get('paper_id', '')
            if paper_id and paper_id not in seen_papers:
                sample_papers.append({
                    'title': metadata.get('paper_title', ''),
                    'authors': metadata.get('authors', [])[:3],
                    'source': metadata.get('source', ''),
                    'chunk_types': []
                })
                seen_papers.add(paper_id)
                
                if len(sample_papers) >= 10:
                    break
        
        return {
            'stats': stats,
            'sample_papers': sample_papers,
            'model_info': self.embedding_service.get_model_info(),
            'last_updated': datetime.now().isoformat()
        }