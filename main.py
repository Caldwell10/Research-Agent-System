import sys
import os
from pathlib import Path
import logging
from datetime import datetime
from dotenv import load_dotenv

# Project root to path for imports
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Load environment variables 
load_dotenv()

# Import agents and utilities
from utils.groq_llm import GroqLLM
from agents.researcher import ResearcherAgent
from agents.analyzer import AnalyzerAgent
from agents.reporter import ReporterAgent

#  logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
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
        logger.info(" Initializing Multi-Agent Research System...")
        
        # Load environment variables
        load_dotenv()
        
        # Initialize LLM
        self.llm = GroqLLM(api_key=groq_api_key)
        logger.info(" LLM initialized")
        
        # Initialize agents
        self.researcher = ResearcherAgent(self.llm, max_papers=max_papers)
        self.analyzer = AnalyzerAgent(self.llm)
        self.reporter = ReporterAgent(self.llm)
        
        logger.info(" All agents initialized")
        logger.info(" Multi-Agent Research System ready!")
    
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
        logger.info(f" Starting research analysis for: '{query}'")
        
        try:
            # Stage 1: Research - Find relevant papers
            logger.info(" Stage 1: Researcher Agent - Finding papers...")
            research_results = self.researcher.research(query)
            
            if research_results['status'] != 'success':
                return {
                    "status": "failed_research",
                    "message": "Could not find relevant papers",
                    "query": query,
                    "error": research_results.get('message', 'Unknown error')
                }
            
            papers_found = research_results['papers_found']
            logger.info(f" Found {papers_found} papers")
            
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
            
            logger.info(" Analysis complete")
            
            # Stage 3: Reporting - Generate comprehensive report
            logger.info(" Stage 3: Reporter Agent - Generating report...")
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
            
            logger.info(f" Research complete! Analyzed {papers_found} papers in {execution_time:.1f} seconds")
            if save_report and report_results.get('saved_to'):
                logger.info(f" Report saved to: {report_results['saved_to']}")
            
            return final_results
            
        except Exception as e:
            logger.error(f" Error in research pipeline: {e}")
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

def main():
    """Main function for command-line usage"""
    
    print(" Multi-Agent Research Paper Analysis System")
    print("=" * 60)
    
    # Check environment
    if not os.getenv("GROQ_API_KEY"):
        print(" Error: GROQ_API_KEY not found in environment variables")
        print("Please set your Groq API key in the .env file")
        return
    
    try:
        # Initialize system
        system = MultiAgentResearchSystem(max_papers=5)
        
        # Interactive mode
        print("\n🎯 System ready! Enter your research queries.")
        print("Commands:")
        print("  'quit' or 'exit' - Exit the program")
        print("  'quick [query]' - Quick analysis (3 papers)")
        print("  'summary [query]' - Research summary only")
        print("  '[query]' - Full analysis")
        print("-" * 60)
        
        while True:
            try:
                query = input("\n Enter research query: ").strip()
                
                if query.lower() in ['quit', 'exit', 'q']:
                    print(" Goodbye!")
                    break
                
                if not query:
                    print("Please enter a research query.")
                    continue
                
                # Handle different command modes
                if query.startswith('quick '):
                    research_query = query[6:].strip()
                    print(f"\n⚡ Quick analysis for: '{research_query}'")
                    result = system.quick_research(research_query)
                    print("\n📋 Executive Summary:")
                    print("-" * 40)
                    print(result)
                
                elif query.startswith('summary '):
                    research_query = query[8:].strip()
                    print(f"\n📊 Research summary for: '{research_query}'")
                    result = system.get_research_summary(research_query)
                    
                    if result['status'] == 'success':
                        print(f"\n Found {result['papers_found']} papers")
                        print("\n Top Papers:")
                        for i, paper in enumerate(result['top_papers'], 1):
                            print(f"{i}. {paper['title']}")
                            print(f"   Authors: {', '.join(paper['authors'])}")
                            print(f"   Score: {paper['relevance_score']}/10")
                    else:
                        print(f" Error: {result.get('message', 'Unknown error')}")
                
                else:
                    # Full analysis
                    print(f"\n🔬 Full analysis for: '{query}'")
                    print("This may take a few minutes...")
                    
                    result = system.research_topic(query)
                    
                    if result['status'] == 'success':
                        print(f"\n  Analysis complete!")
                        print(f" Papers analyzed: {result['papers_analyzed']}")
                        print(f" Execution time: {result['execution_time_seconds']:.1f} seconds")
                        print(f" Report saved to: {result['summary']['report_saved_to']}")
                        
                        print("\n Executive Summary:")
                        print("-" * 40)
                        print(result['report']['executive_summary'])
                        
                        print(f"\n💡 Recommendations ({len(result['report']['recommendations'])}):")
                        for i, rec in enumerate(result['report']['recommendations'], 1):
                            print(f"{i}. {rec}")
                    
                    else:
                        print(f" Analysis failed: {result.get('message', 'Unknown error')}")
                
            except KeyboardInterrupt:
                print("\n\n👋 Interrupted. Goodbye!")
                break
            except Exception as e:
                print(f"\n Error: {e}")
                print("Please try again or type 'quit' to exit.")
    
    except Exception as e:
        print(f" Failed to initialize system: {e}")
        print("Please check your environment setup and API keys.")

if __name__ == "__main__":
    main()