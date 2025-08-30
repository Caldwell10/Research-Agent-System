
import asyncio
import time
import logging
import sys
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Callable
from dotenv import load_dotenv

# Add project root to path for imports
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Import agents and utilities
from utils.groq_llm import GroqLLM
from agents.researcher import ResearcherAgent
from agents.analyzer import AnalyzerAgent
from agents.reporter import ReporterAgent

logger = logging.getLogger(__name__)


class MultiAgentResearchSystem:
    """
    Complete Multi-Agent Research Paper Analysis System
    
    Orchestrates three specialized agents:
    1. ResearcherAgent - Finds and evaluates papers
    2. AnalyzerAgent - Performs deep technical analysis  
    3. ReporterAgent - Generates comprehensive reports
    """
    
    def __init__(self, groq_api_key: str = None, max_papers: int = 5):
        """
        Initialize the multi-agent system
        
        Args:
            groq_api_key: Groq API key (or will use environment variable)
            max_papers: Maximum papers to analyze per query
        """
        logger.info("🚀 Initializing Multi-Agent Research System...")
        
        # Load environment variables
        load_dotenv()
        
        # Initialize LLM
        self.llm = GroqLLM(api_key=groq_api_key)
        logger.info("🧠 LLM initialized")
        
        # Initialize agents
        self.researcher = ResearcherAgent(self.llm, max_papers=max_papers)
        self.analyzer = AnalyzerAgent(self.llm)
        self.reporter = ReporterAgent(self.llm)
        
        logger.info("🤖 All agents initialized")
        logger.info("✅ Multi-Agent Research System ready!")
    
    def research_topic(self, query: str, save_report: bool = True) -> dict:
        """
        Complete research analysis pipeline
        
        Args:
            query: Research question or topic
            save_report: Whether to save the report to file
            
        Returns:
            Dictionary with complete research results
        """
        start_time = datetime.now()
        logger.info(f"🔬 Starting research analysis for: '{query}'")
        
        try:
            # Stage 1: Research - Find relevant papers
            logger.info("📚 Stage 1: Researcher Agent - Finding papers...")
            research_results = self.researcher.research(query)
            
            if research_results['status'] != 'success':
                return {
                    "status": "failed_research",
                    "message": "Could not find relevant papers",
                    "query": query,
                    "error": research_results.get('message', 'Unknown error')
                }
            
            papers_found = research_results['papers_found']
            logger.info(f"✅ Found {papers_found} papers")
            
            # Stage 2: Analysis - Deep technical analysis
            logger.info("🔍 Stage 2: Analyzer Agent - Analyzing papers...")
            analysis_results = self.analyzer.analyze_papers(research_results)
            
            if analysis_results['status'] != 'success':
                return {
                    "status": "failed_analysis", 
                    "message": "Could not analyze papers",
                    "query": query,
                    "research_results": research_results,
                    "error": analysis_results.get('message', 'Unknown error')
                }
            
            logger.info("✅ Analysis complete")
            
            # Stage 3: Reporting - Generate comprehensive report
            logger.info("📝 Stage 3: Reporter Agent - Generating report...")
            report_results = self.reporter.generate_report(research_results, analysis_results)
            
            if report_results['status'] != 'success':
                return {
                    "status": "failed_reporting",
                    "message": "Could not generate report",
                    "query": query,
                    "research_results": research_results,
                    "analysis_results": analysis_results,
                    "error": report_results.get('message', 'Unknown error')
                }
            
            # Calculate execution time
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            
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
            
            logger.info(f"🎉 Research complete! Analyzed {papers_found} papers in {execution_time:.1f} seconds")
            if save_report and report_results.get('saved_to'):
                logger.info(f"💾 Report saved to: {report_results['saved_to']}")
            
            return final_results
            
        except Exception as e:
            logger.error(f"❌ Error in research pipeline: {e}")
            import traceback
            traceback.print_exc()
            
            return {
                "status": "error",
                "message": str(e),
                "query": query,
                "execution_time_seconds": (datetime.now() - start_time).total_seconds()
            }
    
    def quick_research(self, query: str, max_papers: int = 3) -> str:
        """
        Quick research mode - returns just the executive summary
        
        Args:
            query: Research question
            max_papers: Maximum papers to analyze (default 3 for speed)
            
        Returns:
            Executive summary as string
        """
        # Temporarily adjust max papers for speed
        original_max = self.researcher.max_papers
        self.researcher.max_papers = max_papers
        
        try:
            results = self.research_topic(query, save_report=False)
            
            if results['status'] == 'success':
                return results['report']['executive_summary']
            else:
                return f"Research failed: {results.get('message', 'Unknown error')}"
                
        finally:
            # Restore original setting
            self.researcher.max_papers = original_max
    
    def get_research_summary(self, query: str) -> dict:
        """
        Get a quick summary without full analysis (research only)
        
        Args:
            query: Research question
            
        Returns:
            Research summary dictionary
        """
        logger.info(f"📋 Getting research summary for: '{query}'")
        
        research_results = self.researcher.research(query)
        
        if research_results['status'] == 'success':
            return {
                "status": "success",
                "query": query,
                "papers_found": research_results['papers_found'],
                "summary": research_results['summary'],
                "top_papers": [
                    {
                        "title": paper['title'],
                        "authors": paper['authors'][:2],
                        "published": paper['published'],
                        "relevance_score": paper.get('evaluation', {}).get('relevance_score', 'N/A')
                    }
                    for paper in research_results['papers'][:3]
                ]
            }
        else:
            return research_results

class RateLimitedResearchSystem:
    """Enhanced research system with rate limiting and progress callbacks"""
    
    def __init__(self, max_papers: int = 5):
        self.base_system = MultiAgentResearchSystem(max_papers=max_papers)
        self.last_request_time = 0
        self.min_request_interval = 1.0  # Minimum 1 second between API calls
        
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
            logger.error(f"❌ Error in enhanced research pipeline: {e}")
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