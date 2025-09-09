
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
            # Create search query with better relevance
            search = arxiv.Search(
                query=query,
                max_results=max_results * 2,  # Get more results to filter for relevance
                sort_by=arxiv.SortCriterion.Relevance,  # Sort by relevance, not date
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
            
            # Filter papers by relevance to query
            relevant_papers = self._filter_by_relevance(papers, query, max_results)
            
            logger.info(f"Found {len(relevant_papers)} papers for query: {query}")
            return relevant_papers
            
        except Exception as e:
            logger.error(f"Error searching arXiv: {str(e)}")
            return []
    
    def _filter_by_relevance(self, papers: List[Dict], query: str, max_results: int) -> List[Dict]:
        """
        Filter papers by relevance to the search query
        """
        import re
        
        # Extract keywords from query
        query_words = set(re.findall(r'\b\w+\b', query.lower()))
        
        # Score papers based on keyword matches
        scored_papers = []
        for paper in papers:
            score = 0
            title_words = set(re.findall(r'\b\w+\b', paper['title'].lower()))
            abstract_words = set(re.findall(r'\b\w+\b', paper['abstract'].lower()))
            
            # Score based on title matches (higher weight)
            title_matches = len(query_words.intersection(title_words))
            score += title_matches * 10
            
            # Score based on abstract matches
            abstract_matches = len(query_words.intersection(abstract_words))
            score += abstract_matches * 3
            
            # Boost for exact phrase matches in title
            if query.lower() in paper['title'].lower():
                score += 50
            
            # Boost for exact phrase matches in abstract
            if query.lower() in paper['abstract'].lower():
                score += 20
            
            # Boost for topic-relevant categories
            relevant_categories = self._get_relevant_categories(query)
            for category in paper['categories']:
                if category in relevant_categories:
                    score += 15
            
            scored_papers.append((score, paper))
        
        # Sort by relevance score and return top results
        scored_papers.sort(reverse=True, key=lambda x: x[0])
        # More lenient threshold 
        filtered_papers = [paper for score, paper in scored_papers[:max_results] if score > 0]
        
        # If still no papers, return top papers regardless of score
        if not filtered_papers and scored_papers:
            filtered_papers = [paper for score, paper in scored_papers[:max_results]]
            
        return filtered_papers
    
    def _get_relevant_categories(self, query: str) -> List[str]:
        """
        Map query terms to arXiv categories for better relevance
        """
        category_mapping = {
            'machine learning': ['cs.LG', 'stat.ML'],
            'deep learning': ['cs.LG', 'cs.NE'],
            'reinforcement learning': ['cs.LG', 'cs.AI'],
            'artificial intelligence': ['cs.AI', 'cs.LG'],
            'neural networks': ['cs.NE', 'cs.LG'],
            'transformer': ['cs.CL', 'cs.LG'],
            'nlp': ['cs.CL'],
            'computer vision': ['cs.CV'],
            'robotics': ['cs.RO'],
            'ai agents': ['cs.AI', 'cs.MA'],
            'multiagent': ['cs.MA', 'cs.AI']
        }
        
        query_lower = query.lower()
        relevant_cats = []
        
        for term, categories in category_mapping.items():
            if term in query_lower:
                relevant_cats.extend(categories)
        
        return list(set(relevant_cats))  # Remove duplicates

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