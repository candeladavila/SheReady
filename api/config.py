from functools import lru_cache
from typing import Literal
from zoneinfo import ZoneInfo

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "postgresql+psycopg://sheready:sheready@localhost:5432/sheready"
    migration_database_url: str = ""
    database_pooling: Literal["queue", "null"] = "queue"
    ai_provider: Literal["gemini", "ollama", "groq"] = "gemini"
    groq_api_key: SecretStr = SecretStr("")
    groq_model: str = "openai/gpt-oss-120b"
    groq_audio_model: str = "whisper-large-v3-turbo"
    ollama_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen3:4b"
    ollama_timeout_seconds: int = Field(default=180, ge=5, le=600)
    gemini_api_key: SecretStr = SecretStr("")
    gemini_model: str = "gemini-3.5-flash-lite"
    gemini_audio_model: str = "gemini-3.5-flash-lite"
    gemini_tts_model: str = "gemini-3.8-flash-lite-tts"
    gemini_voice: str = "Kore"
    ai_timeout_seconds: int = Field(default=60, ge=5, le=180)
    max_audio_bytes: int = Field(default=8 * 1024 * 1024, ge=1024, le=15 * 1024 * 1024)
    cors_origins: str = "http://localhost:8081,http://localhost:19006"
    demo_access_token: SecretStr = SecretStr("")
    app_timezone: str = "Europe/Madrid"

    @field_validator("app_timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        ZoneInfo(value)
        return value

    @property
    def sqlalchemy_url(self) -> str:
        return self.normalize_database_url(self.database_url)

    @property
    def migration_sqlalchemy_url(self) -> str:
        return self.normalize_database_url(self.migration_database_url or self.database_url)

    @staticmethod
    def normalize_database_url(url: str) -> str:
        if url.startswith(("postgres://", "postgresql://")):
            return "postgresql+psycopg://" + url.split("://", 1)[1]
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
