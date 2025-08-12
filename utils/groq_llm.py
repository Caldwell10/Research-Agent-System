from langchain.llms.base import LLM
from groq import Groq
from typing import Optional, List, Any
import os

class GroqLLM(LLM):
    """Custom LangChain wrapper for Groq API"""
    
    client: Groq = None
    model_name: str = "llama3-8b-8192"
    temperature: float = 0.1
    max_tokens: int = 1024
    
    def __init__(self, api_key: str = None, **kwargs):
        super().__init__(**kwargs)
        
        if api_key is None:
            api_key = os.getenv("GROQ_API_KEY")
            
        if not api_key:
            raise ValueError("Groq API key is required. Set GROQ_API_KEY environment variable.")
            
        self.client = Groq(api_key=api_key)
    
    @property
    def _llm_type(self) -> str:
        return "groq"
    
    def _call(
        self, 
        prompt: str, 
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs
    ) -> str:
        """Call Groq API"""
        try:
            response = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=self.model_name,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                stop=stop
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"Error calling Groq API: {str(e)}"
