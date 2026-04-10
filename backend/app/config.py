from pydantic_settings import BaseSettings
from pydantic import field_validator, ConfigDict
from functools import lru_cache
from pathlib import Path

class Settings(BaseSettings):
    model_config = ConfigDict(
        env_file=str(Path(__file__).resolve().parents[1] / ".env"),
        env_file_encoding='utf-8'
    )
    
    APP_NAME: str = "Bharat Benefits Navigator"
    DEBUG: bool = True
    
    # Database
    MONGO_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "bbn_db"
    
    # LLM
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_STT_MODEL: str = "whisper-large-v3-turbo"
    OPENAI_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    LLM_MODE: str = "auto"  # auto | online | offline
    
    # Auth
    FIREBASE_CREDENTIALS_PATH: str = "./firebase_credentials.json"
    SECRET_KEY: str = "supersecret"

    # OTP / Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_VERIFY_SERVICE_SID: str = ""

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production", "0", "false", "off", "no"}:
                return False
            if normalized in {"debug", "dev", "development", "1", "true", "on", "yes"}:
                return True
        return value

@lru_cache()
def get_settings():
    return Settings()
