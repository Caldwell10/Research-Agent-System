#!/usr/bin/env python3
"""
S3-backed vector store using FAISS for fast similarity search
Handles storage and retrieval of embeddings with metadata from AWS S3
"""

import os
import json
import tempfile
import shutil
from pathlib import Path
import numpy as np
from typing import List, Dict, Any, Optional
import faiss
import boto3
from botocore.exceptions import ClientError
import logging
from dataclasses import asdict
from .text_processor import TextChunk

logger = logging.getLogger(__name__)

class S3VectorStore:
    """
    S3-backed FAISS vector store for research paper chunks
    """
    
    def __init__(self, s3_bucket: str, s3_prefix: str = "knowledge_base", 
                 embedding_dimension: int = 384, local_cache_dir: str = None):
        """
        Initialize S3 vector store
        
        Args:
            s3_bucket: S3 bucket name
            s3_prefix: Prefix for S3 objects (like folder name)
            embedding_dimension: Dimension of embeddings (384 for all-MiniLM-L6-v2)
            local_cache_dir: Local directory for caching (defaults to temp dir)
        """
        self.s3_bucket = s3_bucket
        self.s3_prefix = s3_prefix
        self.embedding_dimension = embedding_dimension
        
        # Set up local cache directory
        if local_cache_dir:
            self.cache_dir = Path(local_cache_dir)
        else:
            self.cache_dir = Path(tempfile.gettempdir()) / "rag_cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # S3 client
        try:
            self.s3_client = boto3.client('s3')
            logger.info(f"Initialized S3 client for bucket: {s3_bucket}")
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            raise
        
        # File paths (S3 and local)
        self.s3_index_key = f"{s3_prefix}/faiss_index.bin"
        self.s3_metadata_key = f"{s3_prefix}/chunk_metadata.json"
        self.s3_mapping_key = f"{s3_prefix}/id_mapping.json"
        
        self.local_index_path = self.cache_dir / "faiss_index.bin"
        self.local_metadata_path = self.cache_dir / "chunk_metadata.json"
        self.local_mapping_path = self.cache_dir / "id_mapping.json"
        
        # Initialize
        self.index = None
        self.chunk_metadata = {}
        self.chunk_id_to_index = {}
        self._is_synced = False
        
        self._initialize_index()
        self._download_and_load()
    
    def _initialize_index(self):
        """Initialize FAISS index"""
        self.index = faiss.IndexFlatIP(self.embedding_dimension)
        logger.info(f"Initialized FAISS index with dimension {self.embedding_dimension}")
    
    def _s3_object_exists(self, key: str) -> bool:
        """Check if S3 object exists"""
        try:
            self.s3_client.head_object(Bucket=self.s3_bucket, Key=key)
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            raise
    
    def _download_file_from_s3(self, s3_key: str, local_path: Path) -> bool:
        """Download file from S3 to local path"""
        try:
            if self._s3_object_exists(s3_key):
                self.s3_client.download_file(self.s3_bucket, s3_key, str(local_path))
                logger.info(f"Downloaded {s3_key} from S3")
                return True
            else:
                logger.info(f"S3 object {s3_key} does not exist")
                return False
        except Exception as e:
            logger.error(f"Failed to download {s3_key}: {e}")
            return False
    
    def _upload_file_to_s3(self, local_path: Path, s3_key: str) -> bool:
        """Upload file from local path to S3"""
        try:
            self.s3_client.upload_file(str(local_path), self.s3_bucket, s3_key)
            logger.info(f"Uploaded {s3_key} to S3")
            return True
        except Exception as e:
            logger.error(f"Failed to upload {s3_key}: {e}")
            return False
    
    def _download_and_load(self):
        """Download knowledge base from S3 and load into memory"""
        try:
            # Download FAISS index
            if self._download_file_from_s3(self.s3_index_key, self.local_index_path):
                self.index = faiss.read_index(str(self.local_index_path))
                logger.info(f"Loaded S3 index with {self.index.ntotal} vectors")
            else:
                logger.info("No existing S3 index found, starting with empty index")
            
            # Download metadata
            if self._download_file_from_s3(self.s3_metadata_key, self.local_metadata_path):
                with open(self.local_metadata_path, 'r') as f:
                    self.chunk_metadata = json.load(f)
                logger.info(f"Loaded metadata for {len(self.chunk_metadata)} chunks from S3")
            
            # Download ID mappings
            if self._download_file_from_s3(self.s3_mapping_key, self.local_mapping_path):
                with open(self.local_mapping_path, 'r') as f:
                    self.chunk_id_to_index = json.load(f)
                logger.info(f"Loaded {len(self.chunk_id_to_index)} ID mappings from S3")
            
            self._is_synced = True
            
        except Exception as e:
            logger.error(f"Error downloading from S3: {e}")
            # Reset to empty state
            self._initialize_index()
            self.chunk_metadata = {}
            self.chunk_id_to_index = {}
            self._is_synced = False
    
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
        
        # Upload to S3
        self._upload_to_s3()
    
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
            's3_bucket': self.s3_bucket,
            's3_prefix': self.s3_prefix,
            'is_synced': self._is_synced,
            'unique_papers': len(set(m.get('paper_id', '') for m in self.chunk_metadata.values() if m.get('paper_id')))
        }
    
    def _upload_to_s3(self):
        """Upload current state to S3"""
        try:
            # Save FAISS index locally first
            faiss.write_index(self.index, str(self.local_index_path))
            
            # Save metadata locally
            with open(self.local_metadata_path, 'w') as f:
                json.dump(self.chunk_metadata, f, indent=2)
            
            # Save ID mappings locally
            with open(self.local_mapping_path, 'w') as f:
                json.dump(self.chunk_id_to_index, f, indent=2)
            
            # Upload to S3
            success = True
            success &= self._upload_file_to_s3(self.local_index_path, self.s3_index_key)
            success &= self._upload_file_to_s3(self.local_metadata_path, self.s3_metadata_key)
            success &= self._upload_file_to_s3(self.local_mapping_path, self.s3_mapping_key)
            
            if success:
                logger.info(f"Successfully uploaded vector store with {self.index.ntotal} vectors to S3")
                self._is_synced = True
            else:
                logger.error("Failed to upload some files to S3")
                self._is_synced = False
            
        except Exception as e:
            logger.error(f"Error uploading to S3: {e}")
            self._is_synced = False
            raise
    
    def force_sync_from_s3(self):
        """Force re-download from S3 (useful for distributed scenarios)"""
        logger.info("Force syncing from S3...")
        self._download_and_load()
    
    def clear_local_cache(self):
        """Clear local cache files"""
        try:
            for file_path in [self.local_index_path, self.local_metadata_path, self.local_mapping_path]:
                if file_path.exists():
                    file_path.unlink()
            logger.info("Cleared local cache")
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")