# working_test.py - This will work with your setup
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Load environment variables FIRST
from dotenv import load_dotenv
load_dotenv()

def test_researcher_agent():
    """Test just the researcher agent that we know works"""
    print("🔍 Testing Researcher Agent...")
    
    try:
        from utils.groq_llm import GroqLLM
        from agents.researcher import ResearcherAgent
        
        # Create LLM and agent
        llm = GroqLLM()
        researcher = ResearcherAgent(llm, max_papers=2)
        
        print("✅ Agents created successfully")
        
        # Test research
        print("🔍 Searching for papers on 'neural networks'...")
        results = researcher.research("neural networks")
        
        if results['status'] == 'success':
            print(f"✅ Success! Found {results['papers_found']} papers")
            if results['papers']:
                top_paper = results['papers'][0]
                print(f"📄 Top paper: {top_paper['title'][:60]}...")
                print(f"📊 Relevance score: {top_paper.get('evaluation', {}).get('relevance_score', 'N/A')}/10")
            return results
        else:
            print(f"❌ Research failed: {results.get('message')}")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_full_system():
    """Test the complete system if analyzer and reporter exist"""
    print("\n🚀 Testing Complete Multi-Agent System...")
    
    try:
        # Check if all agent files exist
        agent_files = ['researcher.py', 'analyzer.py', 'reporter.py']
        missing_files = []
        
        for file in agent_files:
            if not (Path('agents') / file).exists():
                missing_files.append(file)
        
        if missing_files:
            print(f"❌ Missing agent files: {missing_files}")
            print("Please create these files first!")
            return False
        
        # Import main system
        from main import MultiAgentResearchSystem
        
        # Initialize system
        system = MultiAgentResearchSystem(max_papers=2)
        print("✅ Complete system initialized")
        
        # Test quick research
        print("⚡ Testing quick research...")
        summary = system.quick_research("deep learning", max_papers=2)
        
        if summary and not summary.startswith("Research failed"):
            print("✅ Quick research successful!")
            print(f"📝 Summary preview: {summary[:200]}...")
            return True
        else:
            print(f"❌ Quick research failed: {summary}")
            return False
            
    except Exception as e:
        print(f"❌ Complete system test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main test function"""
    print("🧪 Multi-Agent Research System Test")
    print("=" * 50)
    
    # Verify environment
    api_key = os.getenv('GROQ_API_KEY')
    if not api_key:
        print("❌ GROQ_API_KEY not found after load_dotenv()")
        return
    
    print(f"✅ Environment loaded (key length: {len(api_key)})")
    
    # Test 1: Researcher (we know this works)
    research_results = test_researcher_agent()
    if not research_results:
        print("❌ Basic test failed")
        return
    
    # Test 2: Complete system (if files exist)
    if test_full_system():
        print("\n🎉 All tests passed!")
        print("\n🚀 Your system is ready! Try:")
        print("python main.py")
    else:
        print("\n⚠️  Basic agent works, but complete system needs setup")
        print("1. Copy analyzer.py and reporter.py files")
        print("2. Then run: python main.py")

if __name__ == "__main__":
    main()