# tools/semantic_scholar_tool.py
import requests
import logging
from typing import List, Dict, Optional
import time
from dataclasses import dataclass
import asyncio
import aiohttp

logger = logging.getLogger(__name__)

@dataclass
class SemanticScholarPaper:
    """Semantic Scholar paper data structure"""
    paper_id: str
    title: str
    abstract: str
    authors: List[str] 
    venue: str
    year: int
    citation_count: int
    reference_count: int
    influential_citation_count: int
    fields_of_study: List[str]
    url: str
    pdf_url: Optional[str] = None
    doi: Optional[str] = None
    arxiv_id: Optional[str] = None
    publication_date: Optional[str] = None
    
class SemanticScholarTool:
    """
    Semantic Scholar API integration for academic paper search
    
    Provides access to 200M+ papers across all academic fields
    with citation data, author information, and full metadata.
    
    API Documentation: https://api.semanticscholar.org/
    """
    
    def __init__(self, max_results: int = 20, api_key: Optional[str] = None):
        self.base_url = "https://api.semanticscholar.org/graph/v1"
        self.max_results = min(max_results, 100)  # API limit is 100 per request
        self.api_key = api_key  # Optional but gives higher rate limits
        
        # Rate limiting
        self.last_request_time = 0
        self.min_request_interval = 1.0  # 1 request per second (free tier)
        
        # Session for connection pooling
        self.session = None
        
        # Paper fields to retrieve
        self.paper_fields = [
            'paperId',
            'title', 
            'abstract',
            'authors',
            'venue',
            'year',
            'citationCount',
            'referenceCount',
            'influentialCitationCount',
            'fieldsOfStudy',
            'url',
            'openAccessPdf',
            'externalIds'
        ]
        
    async def _ensure_session(self):
        """Ensure aiohttp session exists"""
        if self.session is None:
            headers = {}
            if self.api_key:
                headers['x-api-key'] = self.api_key
                
            self.session = aiohttp.ClientSession(
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=30)
            )
            
    async def _rate_limit(self):
        """Enforce rate limiting"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.min_request_interval:
            sleep_time = self.min_request_interval - time_since_last
            await asyncio.sleep(sleep_time)
            
        self.last_request_time = time.time()
        
    async def _make_request(self, endpoint: str, params: Dict) -> Dict:
        """Make rate-limited request to Semantic Scholar API"""
        await self._ensure_session()
        await self._rate_limit()
        
        url = f"{self.base_url}/{endpoint}"
        
        try:
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"Semantic Scholar request successful: {len(data.get('data', []))} results")
                    return data
                elif response.status == 429:
                    logger.warning("Rate limit hit, waiting longer...")
                    await asyncio.sleep(5)
                    return await self._make_request(endpoint, params)
                else:
                    logger.error(f"Semantic Scholar API error: {response.status}")
                    return {'data': []}
                    
        except Exception as e:
            logger.error(f"Error making request to Semantic Scholar: {e}")
            return {'data': []}
    
    async def search(self, query: str, limit: Optional[int] = None) -> List[SemanticScholarPaper]:
        """
        Search for papers using Semantic Scholar API
        
        Args:
            query: Search query string
            limit: Maximum number of results (default uses self.max_results)
            
        Returns:
            List of SemanticScholarPaper objects
        """
        search_limit = limit or self.max_results
        
        params = {
            'query': query,
            'limit': min(search_limit, 100),
            'fields': ','.join(self.paper_fields),
            'sort': 'citationCount:desc'  # Sort by most cited first
        }
        
        logger.info(f"Searching Semantic Scholar for: '{query}' (limit: {search_limit})")
        
        response = await self._make_request('paper/search', params)
        papers = response.get('data', [])
        
        # Convert to our paper format
        semantic_papers = []
        for paper_data in papers:
            try:
                paper = self._convert_to_paper(paper_data)
                if paper:
                    semantic_papers.append(paper)
            except Exception as e:
                logger.warning(f"Error parsing paper data: {e}")
                continue
                
        logger.info(f"Successfully parsed {len(semantic_papers)} papers from Semantic Scholar")
        return semantic_papers[:search_limit]
    
    async def get_paper_details(self, paper_id: str) -> Optional[SemanticScholarPaper]:
        """
        Get detailed information for a specific paper
        
        Args:
            paper_id: Semantic Scholar paper ID
            
        Returns:
            SemanticScholarPaper object or None if not found
        """
        params = {
            'fields': ','.join(self.paper_fields)
        }
        
        response = await self._make_request(f'paper/{paper_id}', params)
        
        if response and 'paperId' in response:
            return self._convert_to_paper(response)
        return None
    
    async def get_citations(self, paper_id: str, limit: int = 20) -> List[SemanticScholarPaper]:
        """
        Get papers that cite this paper
        
        Args:
            paper_id: Semantic Scholar paper ID
            limit: Maximum number of citations to retrieve
            
        Returns:
            List of citing papers
        """
        params = {
            'fields': ','.join(self.paper_fields),
            'limit': min(limit, 100)
        }
        
        response = await self._make_request(f'paper/{paper_id}/citations', params)
        citations = response.get('data', [])
        
        citing_papers = []
        for citation in citations:
            if 'citingPaper' in citation:
                paper = self._convert_to_paper(citation['citingPaper'])
                if paper:
                    citing_papers.append(paper)
                    
        return citing_papers
    
    async def get_references(self, paper_id: str, limit: int = 20) -> List[SemanticScholarPaper]:
        """
        Get papers referenced by this paper
        
        Args:
            paper_id: Semantic Scholar paper ID  
            limit: Maximum number of references to retrieve
            
        Returns:
            List of referenced papers
        """
        params = {
            'fields': ','.join(self.paper_fields),
            'limit': min(limit, 100)
        }
        
        response = await self._make_request(f'paper/{paper_id}/references', params)
        references = response.get('data', [])
        
        referenced_papers = []
        for reference in references:
            if 'citedPaper' in reference:
                paper = self._convert_to_paper(reference['citedPaper'])
                if paper:
                    referenced_papers.append(paper)
                    
        return referenced_papers
    
    def _convert_to_paper(self, paper_data: Dict) -> Optional[SemanticScholarPaper]:
        """Convert Semantic Scholar API response to SemanticScholarPaper"""
        try:
            # Handle missing or null fields
            title = paper_data.get('title', 'No Title')
            abstract = paper_data.get('abstract') or 'No abstract available'
            
            # Extract authors
            authors = []
            for author in paper_data.get('authors', []):
                if isinstance(author, dict) and 'name' in author:
                    authors.append(author['name'])
                elif isinstance(author, str):
                    authors.append(author)
            
            # Handle external IDs
            external_ids = paper_data.get('externalIds', {}) or {}
            doi = external_ids.get('DOI')
            arxiv_id = external_ids.get('ArXiv')
            
            # Handle PDF URL
            pdf_url = None
            if paper_data.get('openAccessPdf'):
                pdf_url = paper_data['openAccessPdf'].get('url')
            
            # Fields of study
            fields = paper_data.get('fieldsOfStudy') or []
            
            return SemanticScholarPaper(
                paper_id=paper_data.get('paperId', ''),
                title=title,
                abstract=abstract,
                authors=authors,
                venue=paper_data.get('venue') or 'Unknown Venue',
                year=paper_data.get('year') or 0,
                citation_count=paper_data.get('citationCount') or 0,
                reference_count=paper_data.get('referenceCount') or 0,
                influential_citation_count=paper_data.get('influentialCitationCount') or 0,
                fields_of_study=fields,
                url=paper_data.get('url') or '',
                pdf_url=pdf_url,
                doi=doi,
                arxiv_id=arxiv_id,
                publication_date=paper_data.get('publicationDate')
            )
            
        except Exception as e:
            logger.error(f"Error converting paper data: {e}")
            return None
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None
    
    def __del__(self):
        """Cleanup on deletion"""
        if self.session:
            try:
                asyncio.create_task(self.close())
            except:
                pass

# Helper function for testing
async def test_semantic_scholar():
    """Test function for Semantic Scholar integration"""
    tool = SemanticScholarTool(max_results=5)
    
    try:
        print("Testing Semantic Scholar API...")
        
        # Test search
        papers = await tool.search("machine learning transformers", limit=3)
        print(f"\nFound {len(papers)} papers:")
        
        for i, paper in enumerate(papers, 1):
            print(f"\n{i}. {paper.title}")
            print(f"   Authors: {', '.join(paper.authors[:3])}...")
            print(f"   Year: {paper.year} | Citations: {paper.citation_count}")
            print(f"   Fields: {', '.join(paper.fields_of_study[:3])}")
            if paper.abstract:
                print(f"   Abstract: {paper.abstract[:150]}...")
        
        # Test getting citations for first paper
        if papers:
            first_paper = papers[0]
            print(f"\n\nGetting citations for: {first_paper.title}")
            citations = await tool.get_citations(first_paper.paper_id, limit=2)
            print(f"Found {len(citations)} citing papers:")
            
            for citation in citations:
                print(f"- {citation.title} ({citation.year})")
        
    except Exception as e:
        print(f"Test failed: {e}")
        
    finally:
        await tool.close()

if __name__ == "__main__":
    asyncio.run(test_semantic_scholar())