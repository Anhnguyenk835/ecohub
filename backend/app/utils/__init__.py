import logging
import sys
from typing import Optional

from app.config import settings


def setup_logger(name: Optional[str] = None) -> logging.Logger:
    """
    Set up and configure a logger with the specified name.
    
    Args:
        name: Logger name. If None, returns the root logger.
        
    Returns:
        Configured logger instance.
    """
    logger = logging.getLogger(name)
    
    # Avoid adding multiple handlers to the same logger
    if logger.handlers:
        return logger
    
    # Set log level from settings
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logger.setLevel(log_level)
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    
    # Create formatter
    formatter = logging.Formatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    console_handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(console_handler)
    
    # Prevent logging from propagating to the root logger
    logger.propagate = False
    
    return logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger with the specified name.
    
    Args:
        name: Logger name.
        
    Returns:
        Logger instance.
    """
    return setup_logger(name)
