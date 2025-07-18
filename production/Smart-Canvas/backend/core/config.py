"""
Unified Configuration Management for Metatron Backend
Extends existing configuration patterns from orchestrator and memory services
"""

import os
from typing import Dict, Any, List

# Import existing configurations
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Note: Old orchestrator config removed - using unified config only
from memory.config.memory_config import config as memory_config

class UnifiedConfig:
    """Unified configuration for all Metatron services"""
    
    def __init__(self):
        # Server Configuration
        self.HOST = os.getenv('METATRON_HOST', '0.0.0.0')
        self.PORT = int(os.getenv('METATRON_PORT', 8000))
        self.DEBUG = os.getenv('METATRON_DEBUG', 'False').lower() == 'true'
        
        # API Keys (centralized)
        self.API_KEYS = {
            'google_gemini': os.getenv('GOOGLE_GEMINI_API_KEY', ''),
            'openai': os.getenv('OPENAI_API_KEY', ''),
            'anthropic': os.getenv('ANTHROPIC_API_KEY', ''),
            'jina': os.getenv('JINA_API_KEY', ''),
            'segmind': os.getenv('SEGMIND_API_KEY', ''),
            'fal': os.getenv('FAL_KEY', ''),
            'composio': os.getenv('COMPOSIO_API_KEY', ''),
            'videosdk': os.getenv('VIDEOSDK_API_KEY', ''),
            'videosdk_secret': os.getenv('VIDEOSDK_SECRET_KEY', ''),
        }
        
        # Set environment variables for compatibility
        if self.API_KEYS['google_gemini']:
            os.environ['GOOGLE_API_KEY'] = self.API_KEYS['google_gemini']
        if not self.API_KEYS['openai']:
            os.environ['OPENAI_API_KEY'] = 'not-needed-using-gemini'
        
        # Database Configuration
        self.DATABASE_CONFIG = {
            'url': os.getenv('DATABASE_URL', 'sqlite:///./metatron.db'),
            'echo': self.DEBUG,
            'pool_size': 10,
            'max_overflow': 20,
            'pool_timeout': 30,
            'pool_recycle': 3600
        }
        
        # CORS Configuration
        self.CORS_ORIGINS = [
            'http://localhost:*',
            'http://127.0.0.1:*',
            'http://localhost:9001',  # Frontend
            'http://127.0.0.1:9001',
            'file://*'
        ]
        
        # Service URLs (for internal communication)
        self.SERVICE_URLS = {
            'orchestrator': f'http://{self.HOST}:{self.PORT}/api/orchestrator',
            'creative': f'http://{self.HOST}:{self.PORT}/api',
            'social': f'http://{self.HOST}:{self.PORT}/api',
            'agent_flow': f'http://{self.HOST}:{self.PORT}/api',
            'model_merger': f'http://{self.HOST}:{self.PORT}/api',
            'video': f'http://{self.HOST}:{self.PORT}/api',
            'app_builder': f'http://{self.HOST}:{self.PORT}/api'
        }
        
        # Jina AI Configuration
        self.JINA_CONFIG = {
            'api_key': self.API_KEYS['jina'],
            'timeout': 30.0,
            'max_retries': 3,
            'base_urls': {
                'reader': 'https://r.jina.ai',
                'search': 'https://s.jina.ai',
                'deepsearch': 'https://api.jina.ai/v1/deepsearch',
                'embeddings': 'https://api.jina.ai/v1/embeddings',
                'reranker': 'https://api.jina.ai/v1/rerank',
                'classifier': 'https://api.jina.ai/v1/classify',
                'segmenter': 'https://api.jina.ai/v1/segment'
            }
        }

        # Logging Configuration
        self.LOGGING_CONFIG = {
            'level': 'INFO' if not self.DEBUG else 'DEBUG',
            'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            'handlers': ['console', 'file'],
            'file_path': './logs/metatron.log'
        }
        
        # Load existing service configurations
        # Note: Old orchestrator config removed - using unified config only
        self.memory_config = memory_config.get_config()
        
    def get_service_config(self, service_name: str) -> Dict[str, Any]:
        """Get configuration for a specific service"""
        base_config = {
            'api_keys': self.API_KEYS,
            'database': self.DATABASE_CONFIG,
            'logging': self.LOGGING_CONFIG,
            'debug': self.DEBUG
        }

        if service_name == 'orchestrator':
            return {**base_config, 'jina': self.JINA_CONFIG}
        elif service_name == 'memory':
            return {**base_config, **self.memory_config}
        elif service_name == 'jina':
            return {**base_config, 'jina': self.JINA_CONFIG}
        else:
            return base_config
    
    def get_unified_config(self) -> Dict[str, Any]:
        """Get complete unified configuration"""
        return {
            'server': {
                'host': self.HOST,
                'port': self.PORT,
                'debug': self.DEBUG
            },
            'api_keys': self.API_KEYS,
            'database': self.DATABASE_CONFIG,
            'cors': {
                'origins': self.CORS_ORIGINS
            },
            'services': self.SERVICE_URLS,
            'logging': self.LOGGING_CONFIG,
            'jina': self.JINA_CONFIG,
            'memory': self.memory_config
        }

# Global configuration instance
unified_config = UnifiedConfig()

def get_unified_config() -> Dict[str, Any]:
    """Get the unified configuration dictionary"""
    return unified_config.get_unified_config()

def get_service_config(service_name: str) -> Dict[str, Any]:
    """Get configuration for a specific service"""
    return unified_config.get_service_config(service_name)

def get_api_key(provider: str) -> str:
    """Get API key for a specific provider"""
    return unified_config.API_KEYS.get(provider, '')

def get_database_url() -> str:
    """Get database URL"""
    return unified_config.DATABASE_CONFIG['url']
