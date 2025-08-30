#!/usr/bin/env python3
"""
Embedding service for RAG pipeline
Uses sentence-transformers to generate embeddings locally
"""

import os
import numpy as np
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class EmbeddingService:
    """
    Service for generating embeddings using sentence-transformers
    """
    
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2', cache_dir: Optional[str] = None):
        """
        Initialize embedding service
        
        Args:
            model_name: Sentence transformer model name
            cache_dir: Directory to cache the model
        """
        self.model_name = model_name
        self.model = None
        
        # Set cache directory
        if cache_dir:
            self.cache_dir = Path(cache_dir)
            self.cache_dir.mkdir(parents=True, exist_ok=True)
        else:
            # Use project's models directory
            project_root = Path(__file__).parent.parent
            self.cache_dir = project_root / 'models' / 'embeddings'
            self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Set environment variable for transformers cache
        os.environ['TRANSFORMERS_CACHE'] = str(self.cache_dir)
        
        logger.info(f"Initializing embedding service with model: {model_name}")
        self._load_model()
    
    def _load_model(self):
        """Load the sentence transformer model"""
        try:
            logger.info(f"Loading model {self.model_name}...")
            self.model = SentenceTransformer(
                self.model_name,
                cache_folder=str(self.cache_dir)
            )
            logger.info(f"Model loaded successfully. Embedding dimension: {self.get_embedding_dimension()}")
            
        except Exception as e:
            logger.error(f"Failed to load model {self.model_name}: {e}")
            raise
    
    def get_embedding_dimension(self) -> int:
        """Get the embedding dimension of the model"""
        if self.model is None:
            return 0
        return self.model.get_sentence_embedding_dimension()
    
    def encode_text(self, text: str) -> np.ndarray:
        """
        Generate embedding for a single text
        
        Args:
            text: Input text
            
        Returns:
            Embedding vector as numpy array
        """
        if not text or not text.strip():
            # Return zero vector for empty text
            return np.zeros(self.get_embedding_dimension(), dtype=np.float32)
        
        try:
            embedding = self.model.encode(text, convert_to_numpy=True)
            return embedding.astype(np.float32)
            
        except Exception as e:
            logger.error(f"Error encoding text: {e}")
            # Return zero vector on error
            return np.zeros(self.get_embedding_dimension(), dtype=np.float32)
    
    def encode_batch(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """
        Generate embeddings for multiple texts
        
        Args:
            texts: List of input texts
            batch_size: Batch size for processing
            
        Returns:
            Array of embeddings with shape (len(texts), embedding_dim)
        """
        if not texts:
            return np.array([], dtype=np.float32).reshape(0, self.get_embedding_dimension())
        
        try:
            embeddings = self.model.encode(
                texts,
                batch_size=batch_size,
                convert_to_numpy=True,
                show_progress_bar=len(texts) > 10
            )
            return embeddings.astype(np.float32)
            
        except Exception as e:
            logger.error(f"Error encoding batch: {e}")
            # Return zero vectors on error
            return np.zeros((len(texts), self.get_embedding_dimension()), dtype=np.float32)
    
    def compute_similarity(self, text1: str, text2: str) -> float:
        """
        Compute cosine similarity between two texts
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Cosine similarity score
        """
        emb1 = self.encode_text(text1)
        emb2 = self.encode_text(text2)
        
        # Compute cosine similarity
        similarity = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
        return float(similarity)
    
    def find_most_similar(self, query: str, candidates: List[str], top_k: int = 5) -> List[tuple]:
        """
        Find most similar texts to a query
        
        Args:
            query: Query text
            candidates: List of candidate texts
            top_k: Number of top results to return
            
        Returns:
            List of (index, similarity_score, text) tuples
        """
        if not candidates:
            return []
        
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
        return similarities[:top_k]
    
    def create_embeddings_for_chunks(self, chunks: List[Dict[str, Any]]) -> Dict[str, np.ndarray]:
        """
        Create embeddings for text chunks
        
        Args:
            chunks: List of chunk dictionaries with 'chunk_id' and 'text' keys
            
        Returns:
            Dictionary mapping chunk_id to embedding
        """
        if not chunks:
            return {}
        
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
        
        logger.info(f"Creating embeddings for {len(texts)} chunks...")
        
        # Generate embeddings in batches
        embeddings = self.encode_batch(texts)
        
        # Create mapping
        embedding_map = {}
        for chunk_id, embedding in zip(chunk_ids, embeddings):
            embedding_map[chunk_id] = embedding
        
        logger.info(f"Created embeddings for {len(embedding_map)} chunks")
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