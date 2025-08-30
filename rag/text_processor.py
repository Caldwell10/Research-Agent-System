#!/usr/bin/env python3
"""
Text processing utilities for RAG pipeline
Handles text chunking, cleaning, and preprocessing
"""

import re
from typing import List, Dict, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class TextChunk:
    """Represents a chunk of text from a research paper"""
    chunk_id: str
    text: str
    paper_id: str
    paper_title: str
    authors: List[str]
    source: str
    chunk_type: str  # 'abstract', 'summary', 'content'
    metadata: Dict[str, Any]

class TextProcessor:
    """
    Processes research papers into searchable text chunks
    """
    
    def __init__(self, chunk_size: int = 300, overlap: int = 50):
        """
        Initialize text processor
        
        Args:
            chunk_size: Maximum characters per chunk
            overlap: Overlap between consecutive chunks
        """
        self.chunk_size = chunk_size
        self.overlap = overlap
        
    def clean_text(self, text: str) -> str:
        """
        Clean and normalize text
        
        Args:
            text: Raw text to clean
            
        Returns:
            Cleaned text
        """
        if not text:
            return ""
            
        # Remove extra whitespace and newlines
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        # Remove special characters but keep punctuation
        text = re.sub(r'[^\w\s\.\,\!\?\;\:\-\(\)]', '', text)
        
        # Remove very short sentences (likely formatting artifacts)
        sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 10]
        text = '. '.join(sentences)
        
        return text
    
    def split_into_chunks(self, text: str) -> List[str]:
        """
        Split text into overlapping chunks
        
        Args:
            text: Text to chunk
            
        Returns:
            List of text chunks
        """
        if len(text) <= self.chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            # Find the end of this chunk
            end = start + self.chunk_size
            
            if end >= len(text):
                # Last chunk
                chunks.append(text[start:])
                break
            
            # Try to break at sentence boundary
            chunk_text = text[start:end]
            
            # Find the last sentence ending within the chunk
            last_sentence_end = max(
                chunk_text.rfind('.'),
                chunk_text.rfind('!'),
                chunk_text.rfind('?')
            )
            
            if last_sentence_end > self.chunk_size // 2:  # If we found a good break point
                end = start + last_sentence_end + 1
                chunks.append(text[start:end].strip())
                start = end - self.overlap
            else:
                # No good sentence boundary, break at word boundary
                last_space = chunk_text.rfind(' ')
                if last_space > 0:
                    end = start + last_space
                    chunks.append(text[start:end].strip())
                    start = end - self.overlap
                else:
                    # Force break if no word boundary
                    chunks.append(chunk_text)
                    start = end - self.overlap
        
        # Remove empty chunks
        chunks = [chunk for chunk in chunks if chunk.strip()]
        return chunks
    
    def extract_key_sentences(self, text: str, max_sentences: int = 3) -> List[str]:
        """
        Extract key sentences from text (simple heuristic-based)
        
        Args:
            text: Text to extract from
            max_sentences: Maximum sentences to return
            
        Returns:
            List of key sentences
        """
        if not text:
            return []
        
        sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 20]
        
        if len(sentences) <= max_sentences:
            return sentences
        
        # Simple scoring: prioritize sentences with certain keywords
        keyword_patterns = [
            r'\b(novel|new|propose|introduce|present|develop|method|approach|algorithm|model)\b',
            r'\b(results?|findings?|show|demonstrate|reveal|indicate|suggest|conclude)\b',
            r'\b(performance|accuracy|improvement|better|superior|state-of-the-art)\b',
            r'\b(problem|challenge|limitation|issue|difficult)\b'
        ]
        
        scored_sentences = []
        for sentence in sentences:
            score = len(sentence)  # Base score by length
            
            for pattern in keyword_patterns:
                matches = len(re.findall(pattern, sentence, re.IGNORECASE))
                score += matches * 50  # Boost for keywords
            
            scored_sentences.append((score, sentence))
        
        # Sort by score and return top sentences
        scored_sentences.sort(reverse=True, key=lambda x: x[0])
        return [sentence for _, sentence in scored_sentences[:max_sentences]]
    
    def process_paper(self, paper: Dict[str, Any], topic_context: str = None) -> List[TextChunk]:
        """
        Process a research paper into text chunks
        
        Args:
            paper: Paper dictionary with metadata and content
            topic_context: Research topic context for unique chunk IDs
            
        Returns:
            List of TextChunk objects
        """
        chunks = []
        paper_id = paper.get('arxiv_id', paper.get('id', paper.get('paper_id', 'unknown')))
        
        # Create topic-specific paper ID to avoid cross-topic duplication
        if topic_context:
            # Create a short hash of the topic for uniqueness
            import hashlib
            topic_hash = hashlib.md5(topic_context.encode()).hexdigest()[:8]
            topic_paper_id = f"{topic_hash}_{paper_id}"
        else:
            topic_paper_id = paper_id
        
        # Process abstract
        abstract = paper.get('abstract', '')
        if abstract:
            cleaned_abstract = self.clean_text(abstract)
            if cleaned_abstract:
                abstract_chunks = self.split_into_chunks(cleaned_abstract)
                
                for i, chunk_text in enumerate(abstract_chunks):
                    chunk = TextChunk(
                        chunk_id=f"{topic_paper_id}_abstract_{i}",
                        text=chunk_text,
                        paper_id=paper_id,
                        paper_title=paper.get('title', ''),
                        authors=paper.get('authors', []),
                        source=paper.get('source', 'unknown'),
                        chunk_type='abstract',
                        metadata={
                            'published': paper.get('published', ''),
                            'citation_count': paper.get('citation_count', 0),
                            'venue': paper.get('venue', ''),
                            'fields_of_study': paper.get('fields_of_study', [])
                        }
                    )
                    chunks.append(chunk)
        
        # Process summary if available
        summary = paper.get('summary', '')
        if summary:
            cleaned_summary = self.clean_text(summary)
            if cleaned_summary:
                summary_chunks = self.split_into_chunks(cleaned_summary)
                
                for i, chunk_text in enumerate(summary_chunks):
                    chunk = TextChunk(
                        chunk_id=f"{topic_paper_id}_summary_{i}",
                        text=chunk_text,
                        paper_id=paper_id,
                        paper_title=paper.get('title', ''),
                        authors=paper.get('authors', []),
                        source=paper.get('source', 'unknown'),
                        chunk_type='summary',
                        metadata={
                            'published': paper.get('published', ''),
                            'citation_count': paper.get('citation_count', 0),
                            'venue': paper.get('venue', ''),
                            'fields_of_study': paper.get('fields_of_study', [])
                        }
                    )
                    chunks.append(chunk)
        
        # Extract key sentences from abstract for additional searchability
        if abstract:
            key_sentences = self.extract_key_sentences(abstract)
            for i, sentence in enumerate(key_sentences):
                chunk = TextChunk(
                    chunk_id=f"{topic_paper_id}_key_{i}",
                    text=sentence,
                    paper_id=paper_id,
                    paper_title=paper.get('title', ''),
                    authors=paper.get('authors', []),
                    source=paper.get('source', 'unknown'),
                    chunk_type='key_sentence',
                    metadata={
                        'published': paper.get('published', ''),
                        'citation_count': paper.get('citation_count', 0),
                        'venue': paper.get('venue', ''),
                        'fields_of_study': paper.get('fields_of_study', [])
                    }
                )
                chunks.append(chunk)
        
        logger.info(f"Processed paper '{paper.get('title', '')[:50]}...' into {len(chunks)} chunks")
        return chunks
    
    def batch_process_papers(self, papers: List[Dict[str, Any]], topic_context: str = None) -> List[TextChunk]:
        """
        Process multiple papers into chunks
        
        Args:
            papers: List of paper dictionaries
            topic_context: Research topic context for unique chunk IDs
            
        Returns:
            List of all text chunks
        """
        all_chunks = []
        
        for paper in papers:
            try:
                paper_chunks = self.process_paper(paper, topic_context)
                all_chunks.extend(paper_chunks)
            except Exception as e:
                logger.error(f"Error processing paper {paper.get('title', 'unknown')}: {e}")
                continue
        
        logger.info(f"Processed {len(papers)} papers into {len(all_chunks)} total chunks")
        return all_chunks