from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "MedLingo - Multilingual Medical Report Explainer"
    PORT: int = 3000
    LLM_PROVIDER: str = "gemini" # 'gemini', 'ollama', or 'mock'
    GEMINI_API_KEY: str = ""
    MAX_FILE_SIZE_MB: int = 10
    OCR_CONFIDENCE_THRESHOLD: float = 0.60
    TARGET_READING_GRADE_MAX: int = 8

    class Config:
        env_file = ".env"
        extra = "allow"

@lru_cache()
def get_settings():
    return Settings()
