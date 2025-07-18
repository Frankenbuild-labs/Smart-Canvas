"""
Metatron Core Module
Provides shared infrastructure for all services
"""

from .config import get_unified_config, get_service_config, get_api_key
from .database import init_database, get_db, get_db_session, get_db_dependency, Base
from .logging import setup_logging, get_service_logger
from .auth import get_current_user_optional, get_current_user_required, require_permission

__all__ = [
    # Configuration
    'get_unified_config',
    'get_service_config', 
    'get_api_key',
    
    # Database
    'init_database',
    'get_db',
    'get_db_session',
    'get_db_dependency',
    'Base',
    
    # Logging
    'setup_logging',
    'get_service_logger',
    
    # Authentication
    'get_current_user_optional',
    'get_current_user_required',
    'require_permission'
]
