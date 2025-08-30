#!/usr/bin/env python3
"""
Vector store using FAISS for fast similarity search
Handles storage and retrieval of embeddings with metadata
"""

import os
import json
import pickle
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import faiss
import logging
from dataclasses import asdict
from .text_processor import TextChunk

logger = logging.getLogger(__name__)

class VectorStore:
    """
    FAISS-based vector store for research paper chunks
    """
    
    def __init__(self, storage_path: str, embedding_dimension: int = 384):
        """
        Initialize vector store
        
        Args:
            storage_path: Directory to store FAISS index and metadata
            embedding_dimension: Dimension of embeddings (384 for all-MiniLM-L6-v2)
        """
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        self.embedding_dimension = embedding_dimension
        self.index = None
        self.chunk_metadata = {}  # Maps FAISS index IDs to chunk metadata
        self.chunk_id_to_index = {}  # Maps chunk IDs to FAISS index IDs
        
        # File paths
        self.index_path = self.storage_path / "faiss_index.bin"
        self.metadata_path = self.storage_path / "chunk_metadata.json"
        self.mapping_path = self.storage_path / "id_mapping.json"
        
        self._initialize_index()
        self._load_existing_data()
    
    def _initialize_index(self):
        """Initialize FAISS index"""
        # Use IndexFlatIP for cosine similarity (Inner Product)
        # We'll normalize vectors to unit length for cosine similarity
        self.index = faiss.IndexFlatIP(self.embedding_dimension)
        logger.info(f"Initialized FAISS index with dimension {self.embedding_dimension}")
    
    def _load_existing_data(self):
        """Load existing index and metadata if they exist"""
        try:
            if self.index_path.exists():
                logger.info("Loading existing FAISS index...")
                self.index = faiss.read_index(str(self.index_path))
                logger.info(f"Loaded index with {self.index.ntotal} vectors")
            
            if self.metadata_path.exists():
                logger.info("Loading chunk metadata...")
                with open(self.metadata_path, 'r') as f:
                    self.chunk_metadata = json.load(f)
                logger.info(f"Loaded metadata for {len(self.chunk_metadata)} chunks")
            
            if self.mapping_path.exists():
                logger.info("Loading ID mappings...")
                with open(self.mapping_path, 'r') as f:
                    self.chunk_id_to_index = json.load(f)
                logger.info(f"Loaded {len(self.chunk_id_to_index)} ID mappings")
                
        except Exception as e:
            logger.error(f"Error loading existing data: {e}")
            # Reset on error
            self._initialize_index()
            self.chunk_metadata = {}
            self.chunk_id_to_index = {}
    
    def _normalize_vector(self, vector: np.ndarray) -> np.ndarray:
        """Normalize vector to unit length for cosine similarity"""
        norm = np.linalg.norm(vector)
        if norm == 0:
            return vector
        return vector / norm
    
    def add_chunks(self, chunks: List[TextChunk], embeddings: Dict[str, np.ndarray]):
        """
        Add text chunks and their embeddings to the vector store
        
        Args:
            chunks: List of TextChunk objects
            embeddings: Dictionary mapping chunk_id to embedding vector
        """
        if not chunks:
            logger.warning("No chunks to add")
            return
        
        vectors_to_add = []
        chunk_metadata_to_add = {}
        id_mapping_to_add = {}
        
        starting_index = self.index.ntotal
        
        for i, chunk in enumerate(chunks):
            chunk_id = chunk.chunk_id
            
            # Skip if chunk already exists
            if chunk_id in self.chunk_id_to_index:
                logger.debug(f"Chunk {chunk_id} already exists, skipping")
                continue
            
            # Get embedding for this chunk
            if chunk_id not in embeddings:
                logger.warning(f"No embedding found for chunk {chunk_id}, skipping")
                continue
            
            embedding = embeddings[chunk_id]
            
            # Normalize embedding for cosine similarity
            normalized_embedding = self._normalize_vector(embedding)
            vectors_to_add.append(normalized_embedding)
            
            # Store metadata
            faiss_index = starting_index + len(vectors_to_add) - 1
            chunk_metadata_to_add[str(faiss_index)] = {
                'chunk_id': chunk.chunk_id,
                'text': chunk.text,
                'paper_id': chunk.paper_id,
                'paper_title': chunk.paper_title,
                'authors': chunk.authors,
                'source': chunk.source,
                'chunk_type': chunk.chunk_type,
                'metadata': chunk.metadata
            }
            
            id_mapping_to_add[chunk_id] = faiss_index
        
        if not vectors_to_add:
            logger.warning("No new vectors to add")
            return
        
        # Add vectors to FAISS index
        vectors_array = np.array(vectors_to_add, dtype=np.float32)
        self.index.add(vectors_array)
        
        # Update metadata and mappings
        self.chunk_metadata.update(chunk_metadata_to_add)
        self.chunk_id_to_index.update(id_mapping_to_add)
        
        logger.info(f"Added {len(vectors_to_add)} new chunks to vector store. Total: {self.index.ntotal}")
        
        # Save to disk
        self.save()
    
    def search(self, query_embedding: np.ndarray, k: int = 5, score_threshold: float = 0.0) -> List[Dict[str, Any]]:
        """
        Search for similar chunks
        
        Args:
            query_embedding: Query vector
            k: Number of results to return
            score_threshold: Minimum similarity score
            
        Returns:
            List of search results with metadata and scores
        """
        if self.index.ntotal == 0:
            logger.warning("Vector store is empty")
            return []
        
        # Normalize query vector
        normalized_query = self._normalize_vector(query_embedding).reshape(1, -1).astype(np.float32)
        
        # Search
        scores, indices = self.index.search(normalized_query, k)
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:  # FAISS returns -1 for empty results
                continue
            
            if score < score_threshold:
                continue
            
            # Get metadata
            metadata = self.chunk_metadata.get(str(idx), {})
            if not metadata:
                logger.warning(f"No metadata found for index {idx}")
                continue
            
            result = {
                'score': float(score),
                'chunk_id': metadata.get('chunk_id', ''),
                'text': metadata.get('text', ''),
                'paper_id': metadata.get('paper_id', ''),
                'paper_title': metadata.get('paper_title', ''),
                'authors': metadata.get('authors', []),
                'source': metadata.get('source', ''),
                'chunk_type': metadata.get('chunk_type', ''),
                'paper_metadata': metadata.get('metadata', {})
            }
            results.append(result)
        
        logger.info(f"Found {len(results)} results for query")
        return results
    
    def search_by_text(self, query_text: str, embedding_service, k: int = 5, score_threshold: float = 0.0) -> List[Dict[str, Any]]:
        """
        Search using text query (convenience method)
        
        Args:
            query_text: Text query
            embedding_service: EmbeddingService instance
            k: Number of results
            score_threshold: Minimum score
            
        Returns:
            Search results
        """
        query_embedding = embedding_service.encode_text(query_text)
        return self.search(query_embedding, k, score_threshold)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector store"""
        chunk_types = {}
        sources = {}
        
        for metadata in self.chunk_metadata.values():
            chunk_type = metadata.get('chunk_type', 'unknown')
            source = metadata.get('source', 'unknown')
            
            chunk_types[chunk_type] = chunk_types.get(chunk_type, 0) + 1
            sources[source] = sources.get(source, 0) + 1
        
        return {
            'total_chunks': self.index.ntotal,
            'chunk_types': chunk_types,
            'sources': sources,
            'embedding_dimension': self.embedding_dimension,
            'storage_path': str(self.storage_path),
            'unique_papers': len(set(m.get('paper_id', '') for m in self.chunk_metadata.values() if m.get('paper_id')))
        }
    
    def save(self):
        """Save index and metadata to disk"""
        try:
            # Save FAISS index
            faiss.write_index(self.index, str(self.index_path))
            
            # Save metadata
            with open(self.metadata_path, 'w') as f:
                json.dump(self.chunk_metadata, f, indent=2)
            
            # Save ID mappings
            with open(self.mapping_path, 'w') as f:
                json.dump(self.chunk_id_to_index, f, indent=2)
            
            logger.info(f"Saved vector store with {self.index.ntotal} vectors to {self.storage_path}")
            
        except Exception as e:
            logger.error(f"Error saving vector store: {e}")
            raise