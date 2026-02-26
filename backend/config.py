"""Configuration module for the Mass Messaging System."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Server
    port: int = 8001
    host: str = "0.0.0.0"
    
    # Webhooks
    webhook_whatsapp: str = ""
    webhook_email: str = ""
    webhook_assistant: str = ""
    
    # External API - OWO
    owo_api_login_url: str = ""
    owo_api_contacts_url: str = ""
    owo_api_email: str = ""
    owo_api_password: str = ""
    
    # File Upload
    max_file_size_mb: int = 15
    upload_dir: str = "./uploads"
    
    # CORS
    frontend_url: str = "http://localhost:3000"
    
    # WhatsApp Business API
    whatsapp_access_token: str = ""
    whatsapp_business_account_id: str = ""
    whatsapp_phone_number_id: str = ""
    
    # LabsMobile SMS API
    labsmobile_api_url: str = "https://api.labsmobile.com/json/send"
    labsmobile_username: str = ""
    labsmobile_token: str = ""
    labsmobile_sender: str = ""
    
    # Database
    database_url: str = "sqlite+aiosqlite:///./messaging.db"
    
    # SSL
    ssl_verify: bool = True
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
