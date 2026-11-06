from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "postgresql+psycopg://sheready:sheready@localhost:5432/sheready"
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
        if self.database_url.startswith(("postgres://", "postgresql://")):
            return "postgresql+psycopg://" + self.database_url.split("://", 1)[1]
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
