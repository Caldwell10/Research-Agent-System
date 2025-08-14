from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from utils.groq_llm import GroqLLM
from typing import Dict, List
import json
import logging
from datetime import datetime
import os

logger = logging.getLogger(__name__)

class ReporterAgent:
    """
    Agent responsible for creating comprehensive research reports
    
    Role: Technical Writer & Synthesizer
    - Synthesizes research and analysis into coherent reports
    - Creates executive summaries
    - Formats findings for different audiences
    - Generates actionable recommendations
    """
    
    def __init__(self, llm: GroqLLM):
        self.llm = llm
        self.report_chain = self._create_report_chain()
        self.summary_chain = self._create_summary_chain()
        
    def _create_report_chain(self) -> LLMChain:
        """Create chain for generating comprehensive reports"""
        
        template = """You are an expert technical writer creating a research literature review.

        Research Query: {research_query}
        Papers Analyzed: {num_papers}
        Analysis Date: {date}

        Research Data:
        {research_summary}

        Analysis Results:
        {analysis_summary}

        Create a comprehensive research report with the following structure:

        # Literature Review: {research_query}

        ## Executive Summary
        [3-4 sentence overview of the field and key findings]

        ## Research Landscape
        [Overview of the current state of research in this area]

        ## Key Papers and Contributions
        [Highlight the most important papers and their contributions]

        ## Methodological Approaches
        [Summary of the main methods and techniques being used]

        ## Current Trends and Patterns
        [What trends are emerging in the research]

        ## Research Gaps and Opportunities
        [What questions remain unanswered and where future research should focus]

        ## Technical Recommendations
        [Specific recommendations for researchers or practitioners]

        ## Conclusion
        [Synthesis of findings and future outlook]

        Write in a clear, professional academic style. Include specific details and insights from the analysis.
        Make it useful for researchers, students, and practitioners in the field."""

        prompt = PromptTemplate(
            input_variables=["research_query", "num_papers", "date", "research_summary", "analysis_summary"],
            template=template
        )
        
        return LLMChain(llm=self.llm, prompt=prompt)
    
    def _create_summary_chain(self) -> LLMChain:
        """Create chain for generating executive summaries"""
        
        template = """Create a concise executive summary for busy researchers and decision-makers.

        Research Topic: {research_query}
        Key Findings: {key_findings}

        Create a 2-3 paragraph executive summary that covers:

        1. WHAT: What research area was analyzed and why it matters
        2. HOW: Brief overview of the analysis approach  
        3. KEY FINDINGS: The most important discoveries and insights
        4. SO WHAT: Why these findings matter and what should be done next

        Write for an audience of researchers, funding agencies, and tech leaders who need to quickly understand the current state and future directions of this research area.

        Keep it concise but informative - someone should be able to read this in 2 minutes and understand the essential points."""

        prompt = PromptTemplate(
            input_variables=["research_query", "key_findings"],
            template=template
        )
        
        return LLMChain(llm=self.llm, prompt=prompt)
    
    def generate_report(self, research_results: Dict, analysis_results: Dict) -> Dict:
        """
        Generate comprehensive research report
        
        Args:
            research_results: Output from ResearcherAgent
            analysis_results: Output from AnalyzerAgent
            
        Returns:
            Dictionary with complete report and metadata
        """
        logger.info(" Reporter Agent generating comprehensive report...")

        try:
            # Prepare data for report generation 
            research_query = research_results['query', 'Unknown']
            num_papers = len(research_results['papers'])
            
            # Create summaries for the report
            research_summary = self.create_research_summary(research_results)
            analysis_summary = self.create_analysis_summary(analysis_results)

            # Generate the main report
            report_content = self.report_chain.run(
                research_query=research_query,
                num_papers=num_papers,
                date=datetime.now().strftime('%Y-%m-%d'),
                research_summary=research_summary,
                analysis_summary=analysis_summary
            )
            
            # Generate an executive summary
            key_findings = self.extract_key_findings(analysis_results)
            executive_summary = self.summary_chain.run(
                research_query=research_query,
                key_findings=key_findings
            )

            # Create structured report
            report = {
                "metadata": {
                    "research_query": research_query,
                    "papers_analyzed": num_papers,
                    "generated_date": datetime.now().isoformat(),
                    "agent_version": "1.0"
                },
                "executive_summary": executive_summary,
                "full_report": report_content,
                "research_data": {
                    "papers": research_results.get('papers', []),
                    "research_summary": research_results.get('summary', '')
                },
                "analysis_data": {
                    "detailed_analyses": analysis_results.get('detailed_analyses', []),
                    "comparative_analysis": analysis_results.get('comparative_analysis', {}),
                    "insights": analysis_results.get('insights', {})
                },
                "recommendations": self._generate_recommendations(analysis_results),
                "status": "success"
            }
            # Save report to file
            report_filename = self.save_report(report)
            report["saved to"] = report_filename

            logger.info(f"✅ Report generated successfully: {report_filename}")
            return report
        
        except Exception as e:
            logger.error(f"Error generating report: {e}")
            return {
                "status": "error",
                "message": str(e),
                "metadata": {
                    "research_query": research_results.get('query', 'Unknown'),
                    "generated_date": datetime.now().isoformat(),
                }
            }
    def _create_research_summary(self, research_results: Dict) -> str:
        """Create summary of research findings"""
        
        papers = research_results.get('papers', [])
        if not papers:
            return "No papers found for analysis."
        
        summary_parts = []
        
        # Overall stats
        summary_parts.append(f"Found {len(papers)} relevant papers")
        
        # Top papers
        summary_parts.append("\nTop papers by relevance:")
        for i, paper in enumerate(papers[:3], 1):
            score = paper.get('evaluation', {}).get('relevance_score', 'N/A')
            summary_parts.append(f"{i}. {paper['title']} (Score: {score}/10)")
            summary_parts.append(f"   Published: {paper['published']}")
            summary_parts.append(f"   Authors: {', '.join(paper['authors'][:2])}...")
        
        return "\n".join(summary_parts)
    
    def _create_analysis_summary(self, analysis_results: Dict) -> str:
        """Create summary of analysis findings"""

        if analysis_results.get('status') != 'success':
            return "Analysis could not be completed successfully."
        
        summary_parts = []

        # Analysis overview
        summary_parts.append(f"Analyzed {analysis_results.get('papers_analyzed', 0)} papers in detail")

        # Key insights
        insights = analysis_results.get('insights', {})
        if insights.get('trending_methods'):
            summary_parts.append("\nTrending methods:")
            for method in insights['trending_methods'][:3]:
                summary_parts.append(f"- {method}")
        
        if insights.get('top_contributions'):
            summary_parts.append("\nKey contributions:")
            for contrib in insights['top_contributions'][:3]:
                summary_parts.append(f"- {contrib}")

        return "\n".join(summary_parts)
    
    def extract_key_findings(self, analysis_results: Dict) -> str:
        """Extract key findings for executive summary"""
        if analysis_results.get('status') != 'success':
            return "Analysis not completed successfully."
        
        findings = []

        comp_analysis = analysis_results.get('comparative_analysis', {})
        if comp_analysis.get('comparison_text'):
            # Extract first few senteneces as key findings
            text = comp_analysis['comparison_text']
            sentences = text.split('. ')[:3]
            findings.extend([s.strip() + '.' for s in sentences if s.strip()])
        
        # From insights 
        insights = analysis_results.get('insights', {})
        if insights.get('trending_methods'):
            findings.append("Trending methods: " + ", ".join(insights['trending_methods'][:2]))

        return ''.join(findings) 
    
    def _generate_recommendations(self, analysis_results: Dict) -> List[str]:
        """Generate actionable recommendations"""
        
        recommendations = []
        
        if analysis_results.get('status') != 'success':
            return ["Complete analysis required for recommendations"]
        
        insights = analysis_results.get('insights', {})
        
        # Method-based recommendations
        if insights.get('trending_methods'):
            recommendations.append("Focus research on trending methodologies identified in current literature")
        
        # Gap-based recommendations
        if insights.get('research_gaps'):
            recommendations.append("Address identified research gaps for novel contributions")
        
        # General recommendations
        recommendations.extend([
            "Consider cross-paper methodology comparisons for comprehensive understanding",
            "Investigate practical applications of theoretical contributions",
            "Explore interdisciplinary approaches combining insights from multiple papers"
        ])
        
        return recommendations[:5]  # Limit to 5 recommendations
    
    def _save_report(self, report: Dict) -> str:
        """Save report to file"""
        
        # Create outputs directory if it doesn't exist
        outputs_dir = "outputs"
        os.makedirs(outputs_dir, exist_ok=True)
        
        # Generate filename
        query = report["metadata"]["research_query"]
        clean_query = "".join(c for c in query if c.isalnum() or c in (' ', '-', '_')).rstrip()
        clean_query = clean_query.replace(' ', '_')[:50]  # Limit length
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{outputs_dir}/research_report_{clean_query}_{timestamp}.json"
        
        # Save as JSON for structured data
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            
            # Also save a readable text version
            text_filename = filename.replace('.json', '.txt')
            self._save_readable_report(report, text_filename)
            
            return filename
            
        except Exception as e:
            logger.error(f"Error saving report: {e}")
            return f"Error saving: {e}"
    
    if __name__ == "__main__":
        import sys
        from pathlib import Path
        
        # Add project root to path
        project_root = Path(__file__).parent.parent
        sys.path.insert(0, str(project_root))
        
        print("=== REPORTER TEST ===")
        print("Reporter agent ready for integration testing!")
        print("Run the full multi-agent system to see complete report generation.")
        
        
