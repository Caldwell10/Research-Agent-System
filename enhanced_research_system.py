
import asyncio
import time
import logging
from typing import Dict, Any, Callable
from main import MultiAgentResearchSystem

logger = logging.getLogger(__name__)

class RateLimitedResearchSystem:
    """Enhanced research system with rate limiting and progress callbacks"""
    
    def __init__(self, max_papers: int = 5):
        self.base_system = MultiAgentResearchSystem(max_papers=max_papers)
        self.last_request_time = 0
        self.min_request_interval = 1.0  
        
    async def research_topic_with_progress(
        self, 
        query: str, 
        save_report: bool = True,
        progress_callback: Callable[[str, str], None] = None
    ) -> Dict[str, Any]:
        """
        Research with progress updates and rate limiting
        
        Args:
            query: Research question
            save_report: Whether to save the report
            progress_callback: Async function to call with progress updates
        """
        start_time = time.time()
        
        try:
            # Stage 1: Research
            if progress_callback:
                await progress_callback("researcher", f"🔬 Searching for papers about '{query}'...")
            
            research_results = await self._safe_api_call(
                self.base_system.researcher.research, 
                query
            )
            
            if research_results['status'] != 'success':
                return research_results
            
            papers_found = research_results['papers_found']
            if progress_callback:
                await progress_callback("researcher", f"✅ Found {papers_found} relevant papers")
            
            # Stage 2: Analysis
            if progress_callback:
                await progress_callback("analyzer", f"🔍 Analyzing {papers_found} papers...")
            
            analysis_results = await self._safe_api_call(
                self.base_system.analyzer.analyze_papers,
                research_results
            )
            
            if analysis_results['status'] != 'success':
                return {
                    "status": "failed_analysis",
                    "message": "Could not analyze papers",
                    "query": query,
                    "research_results": research_results,
                    "error": analysis_results.get('message', 'Unknown error')
                }
            
            if progress_callback:
                await progress_callback("analyzer", "✅ Paper analysis complete")
            
            # Stage 3: Reporting
            if progress_callback:
                await progress_callback("reporter", "📝 Generating comprehensive report...")
            
            report_results = await self._safe_api_call(
                self.base_system.reporter.generate_report,
                research_results,
                analysis_results
            )
            
            if report_results['status'] != 'success':
                return {
                    "status": "failed_reporting",
                    "message": "Could not generate report",
                    "query": query,
                    "research_results": research_results,
                    "analysis_results": analysis_results,
                    "error": report_results.get('message', 'Unknown error')
                }
            
            if progress_callback:
                await progress_callback("reporter", "✅ Report generation complete")
            
            # Calculate execution time
            execution_time = time.time() - start_time
            
            # Compile final results
            final_results = {
                "status": "success",
                "query": query,
                "execution_time_seconds": execution_time,
                "papers_analyzed": papers_found,
                "research_results": research_results,
                "analysis_results": analysis_results,
                "report": report_results,
                "summary": {
                    "papers_found": papers_found,
                    "top_paper": research_results['papers'][0]['title'] if research_results['papers'] else "None",
                    "report_saved_to": report_results.get('saved_to', 'Not saved'),
                    "key_insights": len(analysis_results.get('insights', {}).get('trending_methods', [])),
                    "recommendations": len(report_results.get('recommendations', []))
                }
            }
            
            return final_results
            
        except Exception as e:
            logger.error(f" Error in research pipeline: {e}")
            return {
                "status": "error",
                "message": str(e),
                "query": query,
                "execution_time_seconds": time.time() - start_time
            }
    
    async def _safe_api_call(self, func, *args, max_retries: int = 3, retry_delay: float = 2.0):
        """
        Make API calls with rate limiting and retry logic
        """
        for attempt in range(max_retries):
            try:
                # Rate limiting
                current_time = time.time()
                time_since_last_request = current_time - self.last_request_time
                
                if time_since_last_request < self.min_request_interval:
                    sleep_time = self.min_request_interval - time_since_last_request
                    logger.info(f"⏱️ Rate limiting: waiting {sleep_time:.1f}s before next API call")
                    await asyncio.sleep(sleep_time)
                
                # Run the function in a thread pool to avoid blocking
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(None, func, *args)
                
                self.last_request_time = time.time()
                return result
                
            except Exception as e:
                if "429" in str(e) or "Too Many Requests" in str(e):
                    # Handle rate limiting
                    wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
                    logger.warning(f"⚠️ Rate limited (attempt {attempt + 1}/{max_retries}). Waiting {wait_time}s...")
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    # Other errors - don't retry
                    raise e
        
        # All retries exhausted
        raise Exception(f"Max retries ({max_retries}) exhausted due to rate limiting")
    
    def get_research_summary(self, query: str):
        """Quick research summary (synchronous)"""
        return self.base_system.get_research_summary(query)
    
    def quick_research(self, query: str, max_papers: int = 3):
        """Quick research mode (synchronous)"""
        return self.base_system.quick_research(query, max_papers)
    
    async def research_papers_async(
        self, 
        query: str, 
        max_papers: int = 5,
        filters: dict = None
    ) -> Dict[str, Any]:
        """
        Async research method for Lambda backend compatibility
        
        Args:
            query: Research question
            max_papers: Maximum number of papers to research
            filters: Optional filters to apply
        
        Returns:
            Dict containing research results
        """
        try:
            logger.info(f"Starting async research for: {query}")
            
            # Use the existing research_topic_with_progress method
            # Note: max_papers and filters parameters are for future enhancement
            results = await self.research_topic_with_progress(
                query=query,
                save_report=False  # Don't save reports in Lambda
            )
            
            # Format results for API response
            if results.get('status') == 'success':
                return {
                    'status': 'success',
                    'query': query,
                    'results': results.get('results', {}),
                    'papers_found': results.get('papers_found', 0),
                    'summary': results.get('summary', ''),
                    'timestamp': results.get('timestamp')
                }
            else:
                return {
                    'status': 'error',
                    'query': query,
                    'error': results.get('error', 'Unknown error occurred'),
                    'timestamp': time.time()
                }
                
        except Exception as e:
            logger.error(f"Async research failed: {str(e)}")
            return {
                'status': 'error',
                'query': query,
                'error': str(e),
                'timestamp': time.time()
            }