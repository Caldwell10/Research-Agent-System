# agents/researcher.py
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from tools.arxiv_tool import ArxivSearchTool
from tools.semantic_scholar_tool import SemanticScholarTool
from utils.groq_llm import GroqLLM
from typing import List, Dict, Optional
import json
import logging
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

class ResearcherAgent:
    """
    Agent responsible for finding and evaluating relevant research papers
    
    Role: Research Specialist
    - Searches for relevant papers based on user query
    - Evaluates paper relevance and quality
    - Provides structured output for next agent
    """
    
    def __init__(self, llm: GroqLLM, max_papers: int = 5, sources: List[str] = None):
        self.llm = llm
        self.max_papers = max_papers
        
        # Configure sources (default to arxiv only for backward compatibility)
        self.enabled_sources = sources or ['arxiv']
        
        # Initialize search tools based on enabled sources
        if 'arxiv' in self.enabled_sources:
            self.arxiv_tool = ArxivSearchTool(max_results=max_papers * 2)  # Get more for deduplication
        
        if 'semantic_scholar' in self.enabled_sources:
            self.semantic_scholar_tool = SemanticScholarTool(max_results=max_papers * 2)
        
        # Create the research evaluation chain
        self.evaluation_chain = self._create_evaluation_chain()
        
        logger.info(f"ResearcherAgent initialized with sources: {self.enabled_sources}")
        
    def _create_evaluation_chain(self) -> LLMChain:
        """Create a chain for evaluating paper relevance"""
        
        template = """You are an expert research assistant evaluating academic papers.

            Given a research query and a paper's information, evaluate how relevant this paper is.

            Research Query: {query}

            Paper Information:
            Title: {title}
            Authors: {authors}
            Abstract: {abstract}
            Published: {published}
            Venue: {venue}
            Citation Count: {citation_count}
            Sources: {sources}

            Your task:
            1. Rate relevance (1-10, where 10 is highly relevant)
            2. Identify key contributions
            3. Note potential limitations
            4. Suggest why this paper is important for the research topic

            Provide your evaluation in this format:

            RELEVANCE_SCORE: [1-10]
            KEY_CONTRIBUTIONS: [bullet points]
            LIMITATIONS: [potential issues or scope limitations]
            IMPORTANCE: [why this matters for the research topic]
            """
        
        prompt = PromptTemplate(
            input_variables=["query", "title", "authors", "abstract", "published", "venue", "citation_count", "sources"],
            template=template
        )
        
        return LLMChain(llm=self.llm, prompt=prompt)
    
    def research(self, query: str, sources: List[str] = None) -> Dict:
        """
        Main research method - finds and evaluates papers
        
        Args:
            query: Research topic/question
            sources: Optional list to override default sources for this search
            
        Returns:
            Dictionary with research results
        """
        # Use sync wrapper for async research to maintain backward compatibility
        try:
            # Try to get the existing event loop
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is running, create a task
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, self.research_async(query, sources))
                    return future.result()
            else:
                return asyncio.run(self.research_async(query, sources))
        except RuntimeError:
            # No event loop, create new one
            return asyncio.run(self.research_async(query, sources))
    
    async def research_async(self, query: str, sources: List[str] = None) -> Dict:
        """
        Async research method with multi-source support
        """
        start_time = datetime.now()
        search_sources = sources or self.enabled_sources
        
        logger.info(f"🔬 Researcher Agent starting research on: {query}")
        logger.info(f"📚 Using sources: {search_sources}")
        
        try:
            # Step 1: Search all enabled sources concurrently
            search_tasks = []
            
            if 'arxiv' in search_sources and hasattr(self, 'arxiv_tool'):
                search_tasks.append(self._search_arxiv(query))
            
            if 'semantic_scholar' in search_sources and hasattr(self, 'semantic_scholar_tool'):
                search_tasks.append(self._search_semantic_scholar(query))
            
            if not search_tasks:
                return {
                    "query": query,
                    "status": "no_sources_available",
                    "message": f"No search sources available for query: {query}",
                    "papers": [],
                    "papers_found": 0
                }
            
            # Execute searches in parallel
            search_results = await asyncio.gather(*search_tasks, return_exceptions=True)
            
            # Step 2: Combine results from all sources
            all_papers = []
            source_stats = {}
            
            for result in search_results:
                if isinstance(result, Exception):
                    logger.error(f"Search failed: {result}")
                    continue
                
                papers, source_name = result
                all_papers.extend(papers)
                source_stats[source_name] = len(papers)
                
                logger.info(f"📄 Found {len(papers)} papers from {source_name}")
            
            if not all_papers:
                return {
                    "query": query,
                    "status": "no_papers_found",
                    "message": f"No papers found for query: {query}",
                    "papers": [],
                    "papers_found": 0,
                    "source_breakdown": source_stats
                }
            
            # Step 3: Deduplicate papers if multiple sources
            if len(search_sources) > 1:
                unique_papers = self._deduplicate_papers(all_papers)
                logger.info(f"📊 Deduplicated {len(all_papers)} papers to {len(unique_papers)} unique papers")
            else:
                unique_papers = all_papers
            
            # Step 4: Sort and limit papers
            unique_papers.sort(key=self._paper_sort_key, reverse=True)
            final_papers = unique_papers[:self.max_papers]
            
            # Step 5: Evaluate each paper
            evaluated_papers = []
            
            for i, paper in enumerate(final_papers, 1):
                try:
                    logger.info(f"🔍 Evaluating paper {i}/{len(final_papers)}: {paper.get('title', 'Unknown')[:50]}...")
                    evaluation = await self._evaluate_paper_async(query, paper)
                    logger.info(f"✅ Paper {i} evaluation complete - Score: {evaluation.get('relevance_score', 'N/A')}")
                    
                    paper_with_eval = {
                        **paper,  # Original paper data + enhancements
                        "evaluation": evaluation
                    }
                    evaluated_papers.append(paper_with_eval)
                    
                except Exception as e:
                    logger.error(f"❌ Error evaluating paper {paper.get('title', 'Unknown')}: {e}")
                    # Include paper without evaluation rather than skip
                    paper_with_eval = {
                        **paper,
                        "evaluation": {
                            "relevance_score": 5,
                            "key_contributions": [],
                            "limitations": [],
                            "importance": f"Error during evaluation: {str(e)}",
                            "error": str(e)
                        }
                    }
                    evaluated_papers.append(paper_with_eval)
            
            # Step 6: Final sort by relevance score
            evaluated_papers.sort(
                key=lambda p: p.get("evaluation", {}).get("relevance_score", 0), 
                reverse=True
            )
            
            # Step 7: Create summary
            summary = self._create_research_summary(query, evaluated_papers)
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            result = {
                "query": query,
                "status": "success",
                "papers_found": len(evaluated_papers),
                "papers": evaluated_papers,
                "summary": summary,
                "source_breakdown": source_stats,
                "total_before_dedup": len(all_papers),
                "duplicates_removed": len(all_papers) - len(unique_papers),
                "execution_time": execution_time,
                "sources_used": search_sources
            }
            
            logger.info(f"✅ Research complete: found {len(evaluated_papers)} papers in {execution_time:.2f}s")
            return result
            
        except Exception as e:
            logger.error(f"Research failed: {e}")
            return {
                "query": query,
                "status": "error",
                "message": str(e),
                "papers": [],
                "papers_found": 0,
                "execution_time": (datetime.now() - start_time).total_seconds()
            }
        
        finally:
            # Cleanup async resources
            if hasattr(self, 'semantic_scholar_tool'):
                await self.semantic_scholar_tool.close()
    
    def _evaluate_paper(self, query: str, paper: Dict) -> Dict:
        """Evaluate a single paper's relevance (sync version for backward compatibility)"""
        try:
            # Try to get the existing event loop
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is running, create a task
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, self._evaluate_paper_async(query, paper))
                    return future.result()
            else:
                return asyncio.run(self._evaluate_paper_async(query, paper))
        except RuntimeError:
            # No event loop, create new one
            return asyncio.run(self._evaluate_paper_async(query, paper))
    
    async def _evaluate_paper_async(self, query: str, paper: Dict) -> Dict:
        """Async version of paper evaluation"""
        
        authors_str = ", ".join(paper.get('authors', [])[:3])
        if len(paper.get('authors', [])) > 3:
            authors_str += " et al."
        
        # Get LLM evaluation with enhanced metadata
        evaluation_text = await self.evaluation_chain.arun(
            query=query,
            title=paper.get('title', ''),
            authors=authors_str,
            abstract=paper.get('abstract', '')[:1000],  # Limit abstract length
            published=paper.get('published', 'Unknown'),
            venue=paper.get('venue', 'Unknown'),
            citation_count=paper.get('citation_count', 'Unknown'),
            sources=', '.join(paper.get('sources', ['Unknown']))
        )
        
        # Parse the evaluation
        parsed_eval = self._parse_evaluation(evaluation_text)
        return parsed_eval
    
    def _parse_evaluation(self, evaluation_text: str) -> Dict:
        """Parse the LLM's evaluation into structured data"""
        
        evaluation = {
            "relevance_score": 5,  # default
            "key_contributions": [],
            "limitations": [],
            "importance": "",
            "raw_evaluation": evaluation_text
        }
        
        try:
            lines = evaluation_text.split('\n')
            current_section = None
            
            for line in lines:
                line = line.strip()
                
                if line.startswith("RELEVANCE_SCORE:"):
                    # Extract score
                    score_text = line.replace("RELEVANCE_SCORE:", "").strip()
                    try:
                        score = int(score_text.split()[0])  # Get first number
                        evaluation["relevance_score"] = max(1, min(10, score))
                    except:
                        pass
                        
                elif line.startswith("KEY_CONTRIBUTIONS:"):
                    current_section = "contributions"
                elif line.startswith("LIMITATIONS:"):
                    current_section = "limitations"
                elif line.startswith("IMPORTANCE:"):
                    current_section = "importance"
                elif line.startswith("-") or line.startswith("•"):
                    # Bullet point
                    content = line.lstrip("-•").strip()
                    if current_section == "contributions":
                        evaluation["key_contributions"].append(content)
                    elif current_section == "limitations":
                        evaluation["limitations"].append(content)
                elif current_section == "importance" and line:
                    evaluation["importance"] += line + " "
                    
        except Exception as e:
            logger.warning(f"Error parsing evaluation: {e}")
        
        return evaluation
    
    def _create_research_summary(self, query: str, papers: List[Dict]) -> str:
        """Create a summary of the research findings"""
        
        if not papers:
            return "No papers found for the research query."
        
        high_relevance = [p for p in papers if p.get("evaluation", {}).get("relevance_score", 0) >= 8]
        medium_relevance = [p for p in papers if 5 <= p.get("evaluation", {}).get("relevance_score", 0) < 8]
        
        summary = f"""Research Summary for: "{query}"

Papers Found: {len(papers)}
High Relevance (≥8): {len(high_relevance)} papers
Medium Relevance (5-7): {len(medium_relevance)} papers

Top Papers:"""
        
        # Add top 3 papers
        for i, paper in enumerate(papers[:3], 1):
            score = paper.get("evaluation", {}).get("relevance_score", 0)
            summary += f"""

{i}. {paper['title']} (Score: {score}/10)
   Authors: {', '.join(paper['authors'][:2])}{'...' if len(paper['authors']) > 2 else ''}
   Published: {paper['published']}"""
        
        return summary
    
    async def _search_arxiv(self, query: str) -> tuple[List[Dict], str]:
        """Search ArXiv and convert to unified format"""
        try:
            papers = self.arxiv_tool.search_papers(query, self.max_papers * 2)
            
            # Convert to unified format
            unified_papers = []
            for paper in papers:
                unified = {
                    **paper,  # Keep all original ArXiv data
                    'sources': ['arxiv'],
                    'citation_count': None,  # ArXiv doesn't provide citation data
                    'venue': 'arXiv preprint',
                    'fields_of_study': paper.get('categories', [])
                }
                unified_papers.append(unified)
            
            return unified_papers, 'arxiv'
            
        except Exception as e:
            logger.error(f"ArXiv search failed: {e}")
            return [], 'arxiv'
    
    async def _search_semantic_scholar(self, query: str) -> tuple[List[Dict], str]:
        """Search Semantic Scholar and convert to unified format"""
        try:
            ss_papers = await self.semantic_scholar_tool.search(query, self.max_papers * 2)
            
            # Convert to unified format
            unified_papers = []
            for paper in ss_papers:
                unified = {
                    'title': paper.title,
                    'authors': paper.authors,
                    'abstract': paper.abstract,
                    'published': paper.publication_date or f"{paper.year}" if paper.year else 'Unknown',
                    'venue': paper.venue,
                    'year': paper.year,
                    'pdf_url': paper.pdf_url,
                    'arxiv_id': paper.arxiv_id,
                    'doi': paper.doi,
                    'citation_count': paper.citation_count,
                    'reference_count': paper.reference_count,
                    'influential_citation_count': paper.influential_citation_count,
                    'fields_of_study': paper.fields_of_study,
                    'sources': ['semantic_scholar'],
                    'semantic_scholar_url': paper.url
                }
                unified_papers.append(unified)
            
            return unified_papers, 'semantic_scholar'
            
        except Exception as e:
            logger.error(f"Semantic Scholar search failed: {e}")
            return [], 'semantic_scholar'
    
    def _deduplicate_papers(self, papers: List[Dict]) -> List[Dict]:
        """Remove duplicate papers using title and author similarity"""
        unique_papers = []
        
        for paper in papers:
            is_duplicate = False
            
            for existing_paper in unique_papers:
                if self._are_papers_similar(paper, existing_paper):
                    # Merge information from duplicate
                    self._merge_paper_info(existing_paper, paper)
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique_papers.append(paper)
        
        return unique_papers
    
    def _are_papers_similar(self, paper1: Dict, paper2: Dict, threshold: float = 0.85) -> bool:
        """Check if two papers are likely duplicates"""
        
        # Check exact matches on identifiers first
        if paper1.get('arxiv_id') and paper2.get('arxiv_id'):
            if paper1['arxiv_id'] == paper2['arxiv_id']:
                return True
        
        if paper1.get('doi') and paper2.get('doi'):
            if paper1['doi'] == paper2['doi']:
                return True
        
        # Title similarity
        title1_words = set(paper1.get('title', '').lower().split())
        title2_words = set(paper2.get('title', '').lower().split())
        
        if not title1_words or not title2_words:
            return False
            
        title_intersection = title1_words.intersection(title2_words)
        title_union = title1_words.union(title2_words)
        title_sim = len(title_intersection) / len(title_union) if title_union else 0.0
        
        # Author similarity
        authors1 = set(author.lower() for author in paper1.get('authors', []))
        authors2 = set(author.lower() for author in paper2.get('authors', []))
        
        author_sim = 0.0
        if authors1 and authors2:
            author_intersection = authors1.intersection(authors2)
            author_union = authors1.union(authors2)
            author_sim = len(author_intersection) / len(author_union)
        
        # Combined similarity (title weighted more heavily)
        combined_sim = (title_sim * 0.8) + (author_sim * 0.2)
        return combined_sim >= threshold
    
    def _merge_paper_info(self, primary: Dict, secondary: Dict) -> Dict:
        """Merge information from duplicate papers"""
        # Add source tracking
        if 'sources' not in primary:
            primary['sources'] = []
        if 'sources' not in secondary:
            secondary['sources'] = []
            
        # Merge sources
        for source in secondary['sources']:
            if source not in primary['sources']:
                primary['sources'].append(source)
        
        # Use better metadata when available
        if not primary.get('citation_count') and secondary.get('citation_count'):
            primary['citation_count'] = secondary['citation_count']
        
        if not primary.get('pdf_url') and secondary.get('pdf_url'):
            primary['pdf_url'] = secondary['pdf_url']
        
        if not primary.get('venue') and secondary.get('venue'):
            primary['venue'] = secondary['venue']
            
        if not primary.get('doi') and secondary.get('doi'):
            primary['doi'] = secondary['doi']
            
        return primary
    
    def _paper_sort_key(self, paper: Dict) -> tuple:
        """Generate sort key for paper ranking"""
        citation_count = paper.get('citation_count') or 0
        year = paper.get('year') or 0
        has_pdf = 1 if paper.get('pdf_url') else 0
        
        return (citation_count, year, has_pdf)

