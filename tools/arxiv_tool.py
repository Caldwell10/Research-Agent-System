# tools/arxiv_search.py
import arxiv
from typing import List, Dict
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ArxivSearchTool:
    """Tool for searching and retrieving papers from arXiv"""
    
    def __init__(self, max_results: int = 5):
        self.max_results = max_results
        self.client = arxiv.Client()
    
    def search_papers(self, query: str, max_results: int = None) -> List[Dict]:
        """
        Search for papers on arXiv
        
        Args:
            query: Search query string
            max_results: Maximum number of results to return
            
        Returns:
            List of paper dictionaries with metadata
        """
        if max_results is None:
            max_results = self.max_results
            
        try:
            # Create search query
            search = arxiv.Search(
                query=query,
                max_results=max_results,
                sort_by=arxiv.SortCriterion.SubmittedDate,
                sort_order=arxiv.SortOrder.Descending
            )
            
            papers = []
            for result in self.client.results(search):
                paper_data = {
                    'title': result.title,
                    'authors': [author.name for author in result.authors],
                    'abstract': result.summary,
                    'published': result.published.strftime('%Y-%m-%d'),
                    'pdf_url': result.pdf_url,
                    'arxiv_id': result.entry_id.split('/')[-1],
                    'categories': result.categories,
                    'primary_category': result.primary_category
                }
                papers.append(paper_data)
                
            logger.info(f"Found {len(papers)} papers for query: {query}")
            return papers
            
        except Exception as e:
            logger.error(f"Error searching arXiv: {str(e)}")
            return []
    
    def get_recent_papers(self, query: str, days_back: int = 30) -> List[Dict]:
        """Get papers published in the last N days"""
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        papers = self.search_papers(query)
        recent_papers = []
        
        for paper in papers:
            published_date = datetime.strptime(paper['published'], '%Y-%m-%d')
            if published_date >= cutoff_date:
                recent_papers.append(paper)
                
        return recent_papers

# Test function
if __name__ == "__main__":
    tool = ArxivSearchTool(max_results=3)
    papers = tool.search_papers("transformer architecture")
    for paper in papers:
        print(f"Title: {paper['title']}")
        print(f"Published: {paper['published']}")
        print(f"Authors: {', '.join(paper['authors'][:3])}")
        print("-" * 50)