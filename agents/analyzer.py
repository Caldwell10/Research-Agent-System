from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from utils.groq_llm import GroqLLM
from typing import List, Dict, Any
import json
import logging

logger = logging.getLogger(__name__)

class AnalyzerAgent:
    """
    Agent responsible for deep analysis of research papers
    
    Role: Technical Analyst
    - Analyzes paper content in detail
    - Extracts methodologies and results
    - Identifies relationships between papers
    - Provides structured insights
    """
    
    def __init__(self, llm: GroqLLM):
        self.llm = llm
        self.analysis_chain = self._create_analysis_chain()
        self.comparison_chain = self._create_comparison_chain()
    
    def _create_analysis_chain(self) -> LLMChain:
        """Create chain for detailed paper analysis"""
        template = """You are an expert technical analyst specializing in research paper analysis.

            Analyze this research paper in depth:

            Title: {title}
            Authors: {authors}
            Abstract: {abstract}
            Published: {published}
            Relevance Score: {relevance_score}/10

            Provide a comprehensive technical analysis:

            METHODOLOGY:
            - What methods/algorithms are used?
            - What datasets or experimental setup?
            - Key technical innovations?

            RESULTS & CONTRIBUTIONS:
            - Main findings and results
            - Performance metrics (if any)
            - Key contributions to the field

            TECHNICAL STRENGTHS:
            - What makes this work strong?
            - Novel aspects or improvements

            LIMITATIONS & GAPS:
            - What are the limitations?
            - What questions remain unanswered?
            - Areas for future work

            IMPACT ASSESSMENT:
            - Potential impact on the field
            - Practical applications
            - Follow-up research opportunities

            Keep your analysis technical but accessible. Focus on concrete details."""
        prompt = PromptTemplate(
            input_variables=["title", "authors", "abstract", "published", "relevance_score"],
            template=template
        )
    
        return LLMChain(llm=self.llm, prompt=prompt)
    
    def _create_comparison_chain(self) -> LLMChain:
        """Create chain for comparing multiple papers"""
        template = """You are analyzing multiple research papers on the same topic. 

            Papers analyzed:
            {paper_summaries}

            Research Focus: {research_focus}

            Provide a comparative analysis:

            COMMON THEMES:
            - What approaches/methods appear across multiple papers?
            - Shared challenges or limitations
            - Consistent findings

            METHODOLOGICAL DIFFERENCES:
            - How do the approaches differ?
            - Different datasets, metrics, or experimental setups
            - Trade-offs between different methods

            EVOLUTION OF IDEAS:
            - How has thinking evolved over time? (consider publication dates)
            - Building upon previous work
            - New directions emerging

            RESEARCH GAPS:
            - What important questions remain unanswered?
            - Areas where more research is needed
            - Contradictory findings that need resolution

            FUTURE DIRECTIONS:
            - Most promising research directions
            - Potential breakthrough opportunities
            - Practical applications ready for development

            Focus on insights that emerge from comparing the papers, not just summarizing each one."""

        prompt = PromptTemplate(
            input_variables=["paper_summaries", "research_focus"],
            template=template
        )
        
        return LLMChain(llm=self.llm, prompt=prompt)
    
    def analyze_paper(self, research_results:Dict) -> Dict[str, Any]:
        """Analyze papers from researcher agent
        
        Args:
            research_results: Output from ResearcherAgent
            
        Returns:
            Dictionary with detailed analysis
        """
        logger.info(f"🔬 Analyzer Agent starting analysis of {len(research_results.get('papers', []))} papers")
        papers = research_results.get('papers', [])
        
        if not papers:
            return {
                "status": "no_papers",
                "message": "No papers to analyze",
                "analysis": {}
            }
        
        # 1. Analyze each paper individually
        detailed_analyses = []

        for i, paper in enumerate(papers):
            try:
                logger.info(f"Analyzing paper {i+1}/{len(papers)}: {paper['title'][":50"]}")
                analysis = self.analyze_single_paper(paper)
                detailed_analyses.append({
                    "paper": paper,
                    "analysis": analysis
                })
            except Exception as e:
                logger.error(f"Error analyzing paper {paper['title']}: {e}")
                detailed_analyses.append({
                    "paper": paper,
                    "analysis": {
                        "error": str(e)
                    }
                })
        # 2. Comparative analysis across all papers
        comparative_analysis = self._compare_papers(papers, research_results.get('query', ''))
    
        
        # Step 3: Generate insights and trends
        insights = self._generate_insights(detailed_analyses, comparative_analysis)

        result = {
            "status": "success",
            "research_query": research_results.get('query', ''),
            "papers_analyzed": len(papers),
            "detailed_analyses": detailed_analyses,
            "comparative_analysis": comparative_analysis,
            "insights": insights,
            "summary": self._create_analysis_summary(detailed_analyses, comparative_analysis)
        }
        logger.info("Analysis complete")
        return result
    
        def _analyze_single_paper(self, paper: Dict) -> Dict:
            """Analyze a single paper in detail"""
            
            authors_str = ", ".join(paper['authors'][:3])
            if len(paper['authors']) > 3:
                authors_str += " et al."
            
            relevance_score = paper.get('evaluation', {}).get('relevance_score', 'N/A')
        
            analysis_text = self.analysis_chain.run(
                title=paper['title'],
                authors=authors_str,
                abstract=paper['abstract'][:1500],  # Limit length
                published=paper['published'],
                relevance_score=relevance_score
            )
        
            # Parse the analysis into structured format
            parsed_analysis = self._parse_analysis(analysis_text)
            return parsed_analysis
        
        def _parse_analysis(self, analysis_text: str) -> Dict:
            """Parse the analysis text into a structured format"""

            analysis = {
                "methodology": [],
                "results_contributions": [],
                "strengths": [],
                "limitations": [],
                "raw_analysis": analysis_text
            }
            try:
                lines = analysis_text.split('\n')
                current_section = None

                for line in lines:
                    line = line.strip()
                    
                    if "METHODOLOGY:" in line:
                        current_section = "methodology"
                    elif "RESULTS & CONTRIBUTIONS:" in line:
                        current_section = "results_contributions"
                    elif "TECHNICAL STRENGTHS:" in line:
                        current_section = "strengths"
                    elif "LIMITATIONS" in line:
                        current_section = "limitations"
                    elif "IMPACT ASSESSMENT:" in line:
                        current_section = "impact_assessment"
                    elif line.startswith("-") and current_section in ["methodology", "results_contributions", "strengths", "limitations"]:
                        content = line.lstrip("-").strip()
                        if content:
                            analysis[current_section].append(content)
                    elif current_section == "impact_assessment" and line:
                        analysis["impact_assessment"] += line + " "

            except Exception as e:
                logger.error(f"Error parsing analysis : {e}")
            
            return analysis
    
    def _compare_papers(self, papers: List[Dict], research_focus: str) -> Dict:
        """Compare multiple papers to find common themes and differences"""

        # create summaries for comparison
        paper_summaries = []
        for i, paper in enumerate(papers, 1):
            summary = f"""
                Paper {i}: {paper['title']}
                Authors: {', '.join(paper['authors'][:2])}...
                Published: {paper['published']}
                Key insight: {paper.get('evaluation', {}).get('key_contributions', [''])[0] if paper.get('evaluation', {}).get('key_contributions') else 'N/A'}
                """
            
            paper_summaries.append(summary.strip())
        
        combined_summaries = "\n".join(paper_summaries)

        comparison_text = self.comparison_chain.run(
            paper_summaries=combined_summaries,
            research_focus=research_focus
        )

        return {
            "comparison": comparison_text,
            "papers_compared": len(papers)
        }

    def _extract_insights(self, detailed_analyses: List[Dict], comparative_analysis: Dict) -> Dict:
        """Extract key insights and trends from analysis"""

        insights = {
            "trending_methods": [],
            "common_limitations": [],
            "research_gaps": [],
            "top_contributions": [],
        }

        # Extract trending methods
        all_methodologies = []
        for analysis in detailed_analyses:
            methods = analysis.get('analysis', {}).get('methodology', [])
            all_methodologies.extend(methods)
        
        # Simple keyword extraction for trending methods
        method_keywords = ["transformer", "attention", "neural", "deep learning", "machine learning", "CNN", "RNN", "BERT", "GPT"]

        for keyword in method_keywords:
            count = sum(1 for method in all_methodologies if keyword.lower() in method.lower())
            if count > 0:
                insights["trending_methods"].append(f"{keyword} (mentioned {count} papers")

        # Extract top contributions
        for analysis in detailed_analyses:
            contributions = analysis.get('analysis', {}).get('results_contributions', [])
            if contributions:
                insights["top_contributions"].append(contributions[0])
            
            return insights
    
    def _create_analysis_summary(self, detailed_analyses: List[Dict], comparative_analysis: Dict) -> str:
        """Create a summary of the analysis"""
        
        num_papers = len(detailed_analyses)
        
        summary = f"""Analysis Summary:

        Papers Analyzed: {num_papers}

        Key Findings:
        - Analyzed {num_papers} research papers in detail
        - Identified common methodologies and approaches
        - Extracted key contributions and limitations
        - Found research gaps and future opportunities

        The analysis reveals trends in the research area and provides insights for future work.
        Detailed technical analysis available for each paper with comparative insights across the corpus.
        """
        
        return summary


# Test the analyzer
if __name__ == "__main__":
    import sys
    from pathlib import Path
    
    # Add project root to path
    project_root = Path(__file__).parent.parent
    sys.path.insert(0, str(project_root))
    
    from config import Config
    Config.validate()
    
    # Test analyzer
    llm = GroqLLM()
    analyzer = AnalyzerAgent(llm)
    
    # Mock research results for testing
    mock_results = {
        "query": "transformer attention",
        "status": "success",
        "papers": [
            {
                "title": "Attention Is All You Need",
                "authors": ["Ashish Vaswani", "Noam Shazeer"],
                "abstract": "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms...",
                "published": "2017-06-12",
                "evaluation": {
                    "relevance_score": 10,
                    "key_contributions": ["Self-attention mechanism", "Transformer architecture"]
                }
            }
        ]
    }
    
    results = analyzer.analyze_papers(mock_results)
    print("=== ANALYZER TEST ===")
    print(f"Status: {results['status']}")
    print(f"Papers analyzed: {results['papers_analyzed']}")
    print(f"Summary: {results['summary']}")
    