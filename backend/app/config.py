import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./archscale.db")
    sync_database_url: str = os.getenv("SYNC_DATABASE_URL", "sqlite:///./archscale.db")

    # Authentication
    jwt_secret_key: str = "dev-secret-key-change-in-production-to-something-random"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # AI - Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # Legacy OpenAI (kept for fallback compatibility during migration)
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # Application
    environment: str = "development"
    debug: bool = True
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ]

    # Optional services
    resend_api_key: str = ""
    cloudinary_url: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
