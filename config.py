import os
from dotenv import load_dotenv

class Config:
    # API keys
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")

    # Model settings
    MODEL_NAME = "llama3-8b-8192"
    TEMPERATURE = 0.1
    MAX_TOKENS = 1024

    # Research settings
    MAX_PAPERS_PER_SEARCH = 5
    MAX_PAPERS_AGE_DAYS = 365

    @classmethod
    def validate(cls):
        """Validate that required environment variables are set"""
        if not cls.GROQ_API_KEY:
            raise ValueError(
                "GROQ_API_KEY not found in environment variables. "
                "Please set it in your .env file or environment."
            )
        return True