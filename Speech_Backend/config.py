"""Production and development configuration"""
import os
from functools import lru_cache

class Settings:
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./speech_therapy.db")
    
    # JWT
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = ENVIRONMENT == "development"
    
    # CORS
    if ENVIRONMENT == "production":
        ALLOWED_ORIGINS = [
            "https://speechcare-frontend.onrender.com",
            "https://speechcare-backend.onrender.com",
        ]
    else:
        ALLOWED_ORIGINS = [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ]

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
