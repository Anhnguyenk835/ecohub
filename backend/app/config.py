import os
from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Firebase Configuration
    firebase_credentials_path: str = os.getenv("FIREBASE_CREDENTIALS_PATH")
    firebase_project_id: str = os.getenv("FIREBASE_PROJECT_ID", "your-project-id")
    firestore_collection: str = os.getenv("FIRESTORE_COLLECTION", "mqtt_messages")

    # Application Configuration
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    environment: str = os.getenv("ENVIRONMENT", "development")
    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = os.getenv("API_PORT", 8000)
    
    # API Configuration
    api_title: str = os.getenv("API_TITLE", "FastAPI MQTT Firebase Integration")
    api_description: str = os.getenv("API_DESCRIPTION", "A FastAPI application with MQTT and Firebase integration")
    api_version: str = os.getenv("API_VERSION", "1.0.0")

    # MQTT Configuration
    mqtt_broker_host: str = os.getenv("MQTT_BROKER_HOST", "localhost")
    mqtt_port: int = int(os.getenv("MQTT_PORT", 1883))
    mqtt_topic: str = os.getenv("MQTT_TOPIC", "default/topic")
    mqtt_client_id: str = os.getenv("MQTT_CLIENT_ID", "fastapi_client")
    mqtt_command_topic: str = os.getenv("MQTT_COMMAND_TOPIC", "default/command_topic")

    # Threshold Configuration
    TEMP_THRESHOLD_HIGH: float = 35.0  # Bật quạt nếu nhiệt độ > 35
    TEMP_THRESHOLD_LOW: float = 25.0   # Bật đèn sưởi nếu nhiệt độ < 25
    SOIL_MOISTURE_THRESHOLD_LOW: int = 65 # Bật bơm nếu độ ẩm đất < 65
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        
    def __init__(self, **kwargs):
        """Initialize settings and validate required fields."""
        super().__init__(**kwargs)
        self.validate_settings()
    
    def validate_settings(self):
        """Validate critical settings and provide helpful error messages."""
        errors = []
        
        # Check if Firebase project ID is set
        if self.firebase_project_id == "your-project-id":
            errors.append("FIREBASE_PROJECT_ID must be set to your actual Firebase project ID")
        
        # Check if Firebase credentials file exists
        if not os.path.exists(self.firebase_credentials_path):
            errors.append(f"Firebase credentials file not found: {self.firebase_credentials_path}")
        
        # Check if .env file exists
        if not os.path.exists(".env"):
            errors.append(".env file not found. Configure your settings")
        
        if errors:
            error_message = "Configuration errors found:\n" + "\n".join(f"  - {error}" for error in errors)
            print(f"⚠️  {error_message}")
            # Don't raise an exception during import, just warn


@lru_cache()
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()

# Global settings instance
settings = get_settings()

