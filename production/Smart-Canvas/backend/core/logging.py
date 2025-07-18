"""
Centralized Logging Configuration for Metatron Backend
Provides unified logging across all services with structured output
"""

import os
import logging
import logging.handlers
from typing import Dict, Any
from datetime import datetime

def setup_logging(config: Dict[str, Any]) -> None:
    """Setup centralized logging configuration"""
    
    # Create logs directory if it doesn't exist
    log_file_path = config.get('file_path', './logs/metatron.log')
    log_dir = os.path.dirname(log_file_path)
    if log_dir and not os.path.exists(log_dir):
        os.makedirs(log_dir, exist_ok=True)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, config.get('level', 'INFO')))
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Create formatter
    formatter = MetatronFormatter(config.get('format', 
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    
    # Console handler with UTF-8 encoding
    if 'console' in config.get('handlers', ['console']):
        import sys
        console_handler = logging.StreamHandler(sys.stdout)

        # Use a simple formatter for Windows compatibility
        if sys.platform.startswith('win'):
            # Windows-compatible formatter without emojis
            simple_formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            console_handler.setFormatter(simple_formatter)
        else:
            # Unix systems can handle emojis
            console_handler.setFormatter(formatter)

        console_handler.setLevel(getattr(logging, config.get('level', 'INFO')))
        root_logger.addHandler(console_handler)
    
    # File handler with rotation and UTF-8 encoding
    if 'file' in config.get('handlers', ['console']):
        file_handler = logging.handlers.RotatingFileHandler(
            log_file_path,
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5,
            encoding='utf-8'  # Explicit UTF-8 encoding for file logs
        )

        # Use structured formatter for file logs
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_formatter)
        file_handler.setLevel(getattr(logging, config.get('level', 'INFO')))
        root_logger.addHandler(file_handler)
    
    # Set specific logger levels
    logging.getLogger('uvicorn').setLevel(logging.INFO)
    logging.getLogger('uvicorn.access').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
    
    # Log startup message (Windows-compatible)
    logger = logging.getLogger(__name__)
    import sys
    if sys.platform.startswith('win'):
        logger.info("Logging system initialized")
    else:
        logger.info("🔧 Logging system initialized")

class MetatronFormatter(logging.Formatter):
    """Custom formatter for Metatron logs with emojis and colors"""
    
    # Color codes
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green  
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
        'RESET': '\033[0m'      # Reset
    }
    
    # Emoji mapping
    EMOJIS = {
        'DEBUG': '🔍',
        'INFO': '✅', 
        'WARNING': '⚠️',
        'ERROR': '❌',
        'CRITICAL': '🚨'
    }
    
    def format(self, record):
        # Check if we're on Windows and handle encoding
        try:
            # Add emoji to the message
            emoji = self.EMOJIS.get(record.levelname, '📝')
        except UnicodeEncodeError:
            # Fallback for Windows console encoding issues
            emoji_fallback = {
                'DEBUG': '[DEBUG]',
                'INFO': '[INFO]',
                'WARNING': '[WARN]',
                'ERROR': '[ERROR]',
                'CRITICAL': '[CRIT]'
            }
            emoji = emoji_fallback.get(record.levelname, '[LOG]')

        # Create colored log level
        color = self.COLORS.get(record.levelname, '')
        reset = self.COLORS['RESET']
        colored_levelname = f"{color}{record.levelname}{reset}"

        # Store original levelname
        original_levelname = record.levelname
        record.levelname = colored_levelname

        # Format the message
        formatted = super().format(record)

        # Restore original levelname
        record.levelname = original_levelname

        # Add emoji prefix
        try:
            return f"{emoji} {formatted}"
        except UnicodeEncodeError:
            # Fallback without emoji for Windows console
            return formatted

class ServiceLogger:
    """Service-specific logger with context"""
    
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.logger = logging.getLogger(f"metatron.{service_name}")
    
    def info(self, message: str, **kwargs):
        """Log info message with service context"""
        self.logger.info(f"[{self.service_name.upper()}] {message}", extra=kwargs)
    
    def debug(self, message: str, **kwargs):
        """Log debug message with service context"""
        self.logger.debug(f"[{self.service_name.upper()}] {message}", extra=kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message with service context"""
        self.logger.warning(f"[{self.service_name.upper()}] {message}", extra=kwargs)
    
    def error(self, message: str, **kwargs):
        """Log error message with service context"""
        self.logger.error(f"[{self.service_name.upper()}] {message}", extra=kwargs)
    
    def critical(self, message: str, **kwargs):
        """Log critical message with service context"""
        self.logger.critical(f"[{self.service_name.upper()}] {message}", extra=kwargs)

def get_service_logger(service_name: str) -> ServiceLogger:
    """Get a service-specific logger"""
    return ServiceLogger(service_name)

def log_request(method: str, path: str, status_code: int, duration: float):
    """Log HTTP request with structured format"""
    logger = logging.getLogger("metatron.requests")
    
    # Choose emoji based on status code
    if status_code < 300:
        emoji = "✅"
    elif status_code < 400:
        emoji = "↩️"
    elif status_code < 500:
        emoji = "⚠️"
    else:
        emoji = "❌"
    
    logger.info(
        f"{emoji} {method} {path} - {status_code} ({duration:.2f}ms)"
    )

def log_service_health(service_name: str, status: str, details: Dict[str, Any] = None):
    """Log service health status"""
    logger = logging.getLogger("metatron.health")
    
    emoji = "✅" if status == "healthy" else "❌"
    message = f"{emoji} {service_name.upper()} - {status}"
    
    if details:
        message += f" | {details}"
    
    logger.info(message)

# Export commonly used items
__all__ = [
    'setup_logging',
    'MetatronFormatter', 
    'ServiceLogger',
    'get_service_logger',
    'log_request',
    'log_service_health'
]
