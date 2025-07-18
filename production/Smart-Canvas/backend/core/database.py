"""
Shared Database Connection and Session Management
Provides unified database access for all Metatron services
"""

import logging
from typing import AsyncGenerator, Dict, Any
from contextlib import asynccontextmanager

from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Database configuration
engine = None
SessionLocal = None
Base = declarative_base()

logger = logging.getLogger(__name__)

async def init_database(config: Dict[str, Any]) -> None:
    """Initialize database connection and create tables"""
    global engine, SessionLocal
    
    try:
        database_url = config['url']
        
        # Create engine with appropriate configuration
        if database_url.startswith('sqlite'):
            # SQLite configuration
            engine = create_engine(
                database_url,
                echo=config.get('echo', False),
                connect_args={"check_same_thread": False},
                poolclass=StaticPool
            )
        else:
            # PostgreSQL/MySQL configuration
            engine = create_engine(
                database_url,
                echo=config.get('echo', False),
                pool_size=config.get('pool_size', 10),
                max_overflow=config.get('max_overflow', 20),
                pool_timeout=config.get('pool_timeout', 30),
                pool_recycle=config.get('pool_recycle', 3600)
            )
        
        # Create session factory
        SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=engine
        )
        
        # Import models to ensure they're registered with SQLAlchemy
        from . import models  # This imports User, UserSession, APIKey models

        # Create all tables
        Base.metadata.create_all(bind=engine)

        logger.info(f"✅ Database initialized: {database_url}")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize database: {e}")
        raise

def get_db() -> Session:
    """Get database session (synchronous)"""
    if SessionLocal is None:
        raise RuntimeError("Database not initialized")
    
    db = SessionLocal()
    try:
        return db
    except Exception as e:
        db.close()
        raise

@asynccontextmanager
async def get_db_session() -> AsyncGenerator[Session, None]:
    """Get database session (async context manager)"""
    if SessionLocal is None:
        raise RuntimeError("Database not initialized")
    
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        logger.error(f"Database session error: {e}")
        raise
    finally:
        db.close()

def get_db_dependency():
    """FastAPI dependency for database session"""
    db = get_db()
    try:
        yield db
    finally:
        db.close()

class DatabaseManager:
    """Database manager for advanced operations"""
    
    @staticmethod
    def create_tables():
        """Create all database tables"""
        if engine is None:
            raise RuntimeError("Database not initialized")
        # Import models to ensure they're registered with SQLAlchemy
        from . import models  # This imports User, UserSession, APIKey models
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created")
    
    @staticmethod
    def drop_tables():
        """Drop all database tables"""
        if engine is None:
            raise RuntimeError("Database not initialized")
        # Import models to ensure they're registered with SQLAlchemy
        from . import models  # This imports User, UserSession, APIKey models
        Base.metadata.drop_all(bind=engine)
        logger.info("⚠️ Database tables dropped")
    
    @staticmethod
    def get_table_info():
        """Get information about database tables"""
        if engine is None:
            raise RuntimeError("Database not initialized")
        
        metadata = MetaData()
        metadata.reflect(bind=engine)
        
        tables_info = {}
        for table_name, table in metadata.tables.items():
            tables_info[table_name] = {
                'columns': [col.name for col in table.columns],
                'primary_keys': [col.name for col in table.primary_key.columns]
            }
        
        return tables_info
    
    @staticmethod
    def health_check() -> Dict[str, Any]:
        """Check database health"""
        try:
            if engine is None:
                return {"status": "error", "message": "Database not initialized"}
            
            # Test connection
            with engine.connect() as conn:
                conn.execute("SELECT 1")
            
            return {
                "status": "healthy",
                "database_url": str(engine.url).split('@')[-1] if '@' in str(engine.url) else str(engine.url),
                "pool_size": engine.pool.size() if hasattr(engine.pool, 'size') else 'N/A',
                "checked_out": engine.pool.checkedout() if hasattr(engine.pool, 'checkedout') else 'N/A'
            }
            
        except Exception as e:
            return {
                "status": "error", 
                "message": str(e)
            }

# Global database manager instance
db_manager = DatabaseManager()

# User management utilities
def create_user(db: Session, email: str, password_hash: str, username: str = None, **kwargs):
    """Create a new user"""
    from .models import User
    user = User(
        email=email,
        password_hash=password_hash,
        username=username,
        **kwargs
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_email(db: Session, email: str):
    """Get user by email"""
    from .models import User
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: str):
    """Get user by ID"""
    from .models import User
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    """Get user by username"""
    from .models import User
    return db.query(User).filter(User.username == username).first()

def update_user_last_login(db: Session, user_id: str):
    """Update user's last login timestamp"""
    from .models import User
    from datetime import datetime
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.last_login = datetime.utcnow()
        db.commit()
    return user

# Export commonly used items
__all__ = [
    'Base',
    'engine',
    'SessionLocal',
    'init_database',
    'get_db',
    'get_db_session',
    'get_db_dependency',
    'DatabaseManager',
    'db_manager',
    'create_user',
    'get_user_by_email',
    'get_user_by_id',
    'get_user_by_username',
    'update_user_last_login'
]
