# agents/researcher.py
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from tools.arxiv_tool import ArxivSearchTool
from utils.groq_llm import GroqLLM
from typing import List, Dict
import json
import logging

logger = logging.getLogger(__name__)

class ResearcherAgent:
    """
    Agent responsible for finding and evaluating relevant research papers
    
    Role: Research Specialist
    - Searches for relevant papers based on user query
    - Evaluates paper relevance and quality
    - Provides structured output for next agent
    """
    
    def __init__(self, llm: GroqLLM, max_papers: int = 5):
        self.llm = llm
        self.arxiv_tool = ArxivSearchTool(max_results=max_papers)
        self.max_papers = max_papers
        
        # Create the research evaluation chain
        self.evaluation_chain = self._create_evaluation_chain()
        
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
            input_variables=["query", "title", "authors", "abstract", "published"],
            template=template
        )
        
        return LLMChain(llm=self.llm, prompt=prompt)
    
    def research(self, query: str) -> Dict:
        """
        Main research method - finds and evaluates papers
        
        Args:
            query: Research topic/question
            
        Returns:
            Dictionary with research results
        """
        logger.info(f" Researcher Agent starting research on: {query}")
        
        # Step 1: Search for papers
        papers = self.arxiv_tool.search_papers(query, self.max_papers)
        
        if not papers:
            return {
                "query": query,
                "status": "no_papers_found",
                "message": f"No papers found for query: {query}",
                "papers": []
            }
        
        # Step 2: Evaluate each paper
        evaluated_papers = []
        
        for paper in papers:
            try:
                evaluation = self._evaluate_paper(query, paper)
                paper_with_eval = {
                    **paper,  # Original paper data
                    "evaluation": evaluation
                }
                evaluated_papers.append(paper_with_eval)
                
            except Exception as e:
                logger.error(f"Error evaluating paper {paper['title']}: {e}")
                # Include paper without evaluation rather than skip
                paper_with_eval = {
                    **paper,
                    "evaluation": {
                        "relevance_score": 5,
                        "error": str(e)
                    }
                }
                evaluated_papers.append(paper_with_eval)
        
        # Step 3: Sort by relevance score
        evaluated_papers.sort(
            key=lambda p: p.get("evaluation", {}).get("relevance_score", 0), 
            reverse=True
        )
        
        # Step 4: Create summary
        summary = self._create_research_summary(query, evaluated_papers)
        
        result = {
            "query": query,
            "status": "success",
            "papers_found": len(evaluated_papers),
            "papers": evaluated_papers,
            "summary": summary
        }
        
        logger.info(f"✅ Research complete: found {len(evaluated_papers)} papers")
        return result
    
    def _evaluate_paper(self, query: str, paper: Dict) -> Dict:
        """Evaluate a single paper's relevance"""
        
        authors_str = ", ".join(paper['authors'][:3])
        if len(paper['authors']) > 3:
            authors_str += " et al."
        
        # Get LLM evaluation
        evaluation_text = self.evaluation_chain.run(
            query=query,
            title=paper['title'],
            authors=authors_str,
            abstract=paper['abstract'][:1000],  # Limit abstract length
            published=paper['published']
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

# Test the researcher agent
if __name__ == "__main__":
    from config import Config
    
    # Validate config
    Config.validate()
    
    # Create LLM and agent
    llm = GroqLLM()
    researcher = ResearcherAgent(llm, max_papers=3)
    
    # Test research
    results = researcher.research("transformer attention mechanisms")
    
    print("=== RESEARCH RESULTS ===")
    print(f"Status: {results['status']}")
    print(f"Papers found: {results['papers_found']}")
    print(f"\nSummary:\n{results['summary']}")
    
    # Show first paper details
    if results['papers']:
        first_paper = results['papers'][0]
        print(f"\n=== TOP PAPER DETAILS ===")
        print(f"Title: {first_paper['title']}")
        print(f"Relevance Score: {first_paper['evaluation']['relevance_score']}/10")
        print(f"Key Contributions: {first_paper['evaluation']['key_contributions']}")