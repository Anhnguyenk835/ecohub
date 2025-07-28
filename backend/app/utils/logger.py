import logging
import sys
from typing import Optional
from app.config import get_settings

def get_logger(name: Optional[str] = None) -> logging.Logger:
    """
    Get a logger instance with proper configuration.
    
    Args:
        name (Optional[str]): Logger name, defaults to None
        
    Returns:
        logging.Logger: Configured logger instance
    """
    settings = get_settings()
    
    # Create logger
    logger = logging.getLogger(name)
    
    # Set level based on settings
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logger.setLevel(log_level)
    
    # Check if handler already exists to avoid duplicate handlers
    if not logger.handlers:
        # Create console handler
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(log_level)
        
        # Create formatter
        formatter = logging.Formatter(
            '[%(asctime)s] %(levelname)s in %(name)s: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        
        # Add handler to logger
        logger.addHandler(handler)
    
    return logger