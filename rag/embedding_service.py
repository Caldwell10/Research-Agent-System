#!/usr/bin/env python3
"""
Embedding service for RAG pipeline
Uses sentence-transformers to generate embeddings locally
"""

import os
import gc
import numpy as np
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
import logging
import psutil
from pathlib import Path

logger = logging.getLogger(__name__)

class EmbeddingService:
    """
    Service for generating embeddings using sentence-transformers
    """
    
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2', cache_dir: Optional[str] = None, lazy_load: bool = True):
        """
        Initialize embedding service with memory optimization
        
        Args:
            model_name: Sentence transformer model name (default: lighter model)
            cache_dir: Directory to cache the model
            lazy_load: If True, load model only when needed
        """
        self.model_name = model_name
        self.model = None
        self.lazy_load = lazy_load
        self._model_loaded = False
        
        # Set cache directory - use temp directory on deployment to avoid disk space issues
        if cache_dir:
            self.cache_dir = Path(cache_dir)
        elif os.getenv('ENVIRONMENT') == 'production':
            # Use temp directory in production to avoid disk space issues
            import tempfile
            self.cache_dir = Path(tempfile.gettempdir()) / 'embeddings'
        else:
            # Use project's models directory in development
            project_root = Path(__file__).parent.parent
            self.cache_dir = project_root / 'models' / 'embeddings'
        
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Set environment variable for transformers cache
        os.environ['TRANSFORMERS_CACHE'] = str(self.cache_dir)
        
        logger.info(f"Initializing embedding service with model: {model_name} (lazy_load={lazy_load})")
        
        if not lazy_load:
            self._load_model()
    
    def _load_model(self):
        """Load the sentence transformer model with memory monitoring"""
        if self._model_loaded:
            return
            
        try:
            # Monitor memory before loading
            memory_before = self._get_memory_usage()
            logger.info(f"Loading model {self.model_name}... (Memory usage: {memory_before:.1f}MB)")
            
            self.model = SentenceTransformer(
                self.model_name,
                cache_folder=str(self.cache_dir)
            )
            self._model_loaded = True
            
            # Monitor memory after loading
            memory_after = self._get_memory_usage()
            memory_used = memory_after - memory_before
            
            logger.info(f"Model loaded successfully. Embedding dimension: {self.get_embedding_dimension()}")
            logger.info(f"Memory usage: {memory_after:.1f}MB (model used: +{memory_used:.1f}MB)")
            
        except Exception as e:
            logger.error(f"Failed to load model {self.model_name}: {e}")
            raise
    
    def _ensure_model_loaded(self):
        """Ensure model is loaded (for lazy loading)"""
        if not self._model_loaded:
            self._load_model()
    
    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB"""
        try:
            process = psutil.Process(os.getpid())
            return process.memory_info().rss / 1024 / 1024
        except:
            return 0.0
    
    def _cleanup_memory(self):
        """Force garbage collection to free memory"""
        gc.collect()
        memory_after_gc = self._get_memory_usage()
        logger.debug(f"Memory after cleanup: {memory_after_gc:.1f}MB")
    
    def get_embedding_dimension(self) -> int:
        """Get the embedding dimension of the model"""
        self._ensure_model_loaded()
        if self.model is None:
            return 384  # Default dimension for paraphrase-MiniLM-L3-v2
        return self.model.get_sentence_embedding_dimension()
    
    def encode_text(self, text: str) -> np.ndarray:
        """
        Generate embedding for a single text with lazy loading
        
        Args:
            text: Input text
            
        Returns:
            Embedding vector as numpy array
        """
        if not text or not text.strip():
            # Return zero vector for empty text
            return np.zeros(self.get_embedding_dimension(), dtype=np.float32)
        
        self._ensure_model_loaded()
        
        try:
            embedding = self.model.encode(text, convert_to_numpy=True)
            result = embedding.astype(np.float32)
            
            # Cleanup after single encoding
            if self.lazy_load:
                self._cleanup_memory()
                
            return result
            
        except Exception as e:
            logger.error(f"Error encoding text: {e}")
            # Return zero vector on error
            return np.zeros(self.get_embedding_dimension(), dtype=np.float32)
    
    def encode_batch(self, texts: List[str], batch_size: int = 16) -> np.ndarray:
        """
        Generate embeddings for multiple texts with memory optimization
        
        Args:
            texts: List of input texts
            batch_size: Smaller batch size for memory efficiency (default: 16)
            
        Returns:
            Array of embeddings with shape (len(texts), embedding_dim)
        """
        if not texts:
            return np.array([], dtype=np.float32).reshape(0, self.get_embedding_dimension())
        
        self._ensure_model_loaded()
        
        try:
            memory_before = self._get_memory_usage()
            logger.debug(f"Starting batch encoding of {len(texts)} texts (Memory: {memory_before:.1f}MB)")
            
            embeddings = self.model.encode(
                texts,
                batch_size=batch_size,  # Smaller batch size
                convert_to_numpy=True,
                show_progress_bar=len(texts) > 10
            )
            
            result = embeddings.astype(np.float32)
            
            # Memory cleanup after batch processing
            self._cleanup_memory()
            memory_after = self._get_memory_usage()
            logger.debug(f"Batch encoding complete (Memory: {memory_after:.1f}MB)")
            
            return result
            
        except Exception as e:
            logger.error(f"Error encoding batch: {e}")
            self._cleanup_memory()
            # Return zero vectors on error
            return np.zeros((len(texts), self.get_embedding_dimension()), dtype=np.float32)
    
    def compute_similarity(self, text1: str, text2: str) -> float:
        """
        Compute cosine similarity between two texts with memory cleanup
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Cosine similarity score
        """
        self._ensure_model_loaded()
        
        emb1 = self.encode_text(text1)
        emb2 = self.encode_text(text2)
        
        # Compute cosine similarity
        similarity = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
        
        # Cleanup after computation
        self._cleanup_memory()
        
        return float(similarity)
    
    def find_most_similar(self, query: str, candidates: List[str], top_k: int = 5) -> List[tuple]:
        """
        Find most similar texts to a query with memory optimization
        
        Args:
            query: Query text
            candidates: List of candidate texts
            top_k: Number of top results to return
            
        Returns:
            List of (index, similarity_score, text) tuples
        """
        if not candidates:
            return []
        
        self._ensure_model_loaded()
        
        query_embedding = self.encode_text(query)
        candidate_embeddings = self.encode_batch(candidates)
        
        # Compute similarities
        similarities = []
        for i, candidate_emb in enumerate(candidate_embeddings):
            similarity = np.dot(query_embedding, candidate_emb) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(candidate_emb)
            )
            similarities.append((i, float(similarity), candidates[i]))
        
        # Sort by similarity and return top k
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        # Cleanup after operation
        self._cleanup_memory()
        
        return similarities[:top_k]
    
    def create_embeddings_for_chunks(self, chunks: List[Dict[str, Any]]) -> Dict[str, np.ndarray]:
        """
        Create embeddings for text chunks with memory optimization
        
        Args:
            chunks: List of chunk dictionaries with 'chunk_id' and 'text' keys
            
        Returns:
            Dictionary mapping chunk_id to embedding
        """
        if not chunks:
            return {}
        
        self._ensure_model_loaded()
        
        texts = []
        chunk_ids = []
        
        for chunk in chunks:
            chunk_id = chunk.get('chunk_id', '')
            text = chunk.get('text', '')
            
            if chunk_id and text:
                texts.append(text)
                chunk_ids.append(chunk_id)
        
        if not texts:
            return {}
        
        memory_before = self._get_memory_usage()
        logger.info(f"Creating embeddings for {len(texts)} chunks... (Memory: {memory_before:.1f}MB)")
        
        # Generate embeddings in smaller batches to manage memory
        batch_size = 8  # Smaller batches for memory efficiency
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            batch_embeddings = self.encode_batch(batch_texts, batch_size=8)
            all_embeddings.append(batch_embeddings)
            
            # Periodic cleanup during large operations
            if i % 32 == 0:  # Every 4 batches
                self._cleanup_memory()
        
        # Concatenate all embeddings
        if all_embeddings:
            embeddings = np.vstack(all_embeddings)
        else:
            embeddings = np.array([])
        
        # Create mapping
        embedding_map = {}
        for chunk_id, embedding in zip(chunk_ids, embeddings):
            embedding_map[chunk_id] = embedding
        
        # Final cleanup
        self._cleanup_memory()
        memory_after = self._get_memory_usage()
        
        logger.info(f"Created embeddings for {len(embedding_map)} chunks (Memory: {memory_after:.1f}MB)")
        return embedding_map
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model"""
        if self.model is None:
            return {}
        
        return {
            'model_name': self.model_name,
            'embedding_dimension': self.get_embedding_dimension(),
            'model_path': str(self.cache_dir),
            'max_sequence_length': getattr(self.model, 'max_seq_length', 'unknown')
        }