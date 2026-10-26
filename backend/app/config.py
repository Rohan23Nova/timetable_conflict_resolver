"""Application configuration and environment settings for SLOTWISE."""

import os
from typing import List


class Settings:
    """Central configuration class."""

    def __init__(self) -> None:
        self.app_name: str = os.getenv("APP_NAME", "SLOTWISE")
        self.descriptor: str = "Exam Scheduling Studio"
        self.version: str = "0.1.0"
        self.environment: str = os.getenv("ENVIRONMENT", "development")
        self.api_prefix: str = os.getenv("API_PREFIX", "/api")
        self.database_url: str = os.getenv("DATABASE_URL", "sqlite:///./slotwise.db")
        
        # Parse CORS origins from comma-separated string or default to local Vite ports
        origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
        self.cors_origins: List[str] = [
            origin.strip() for origin in origins_env.split(",") if origin.strip()
        ]


settings = Settings()
