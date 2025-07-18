"""
SQLAlchemy Models for Metatron Platform
Provides user authentication and session management models
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import Column, String, DateTime, Boolean, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class User(Base):
    """User model for authentication and user management"""
    __tablename__ = 'users'
    
    # Primary key - using UUID for better security and distribution
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # User credentials and basic info
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    username = Column(String(100), unique=True, nullable=True, index=True)
    
    # User status and metadata
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # User preferences and settings (JSON-like storage)
    preferences = Column(Text, nullable=True)  # JSON string for user preferences
    
    # Relationships
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', active={self.is_active})>"
    
    def to_dict(self):
        """Convert user to dictionary (excluding sensitive data)"""
        return {
            'id': str(self.id),
            'email': self.email,
            'username': self.username,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }


class UserSession(Base):
    """User session model for JWT token management and session tracking"""
    __tablename__ = 'user_sessions'
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign key to user
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    
    # Session data
    token_jti = Column(String(255), unique=True, nullable=False, index=True)  # JWT ID for token revocation
    refresh_token = Column(String(255), unique=True, nullable=True, index=True)
    
    # Session metadata
    ip_address = Column(String(45), nullable=True)  # IPv4/IPv6 address
    user_agent = Column(Text, nullable=True)
    device_info = Column(Text, nullable=True)  # JSON string for device information
    
    # Session status and timing
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_accessed = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    
    def __repr__(self):
        return f"<UserSession(id={self.id}, user_id={self.user_id}, active={self.is_active})>"
    
    def is_expired(self):
        """Check if session is expired"""
        return datetime.utcnow() > self.expires_at
    
    def to_dict(self):
        """Convert session to dictionary"""
        return {
            'id': str(self.id),
            'user_id': str(self.user_id),
            'is_active': self.is_active,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_expired': self.is_expired()
        }


class APIKey(Base):
    """API Key model for service-to-service authentication"""
    __tablename__ = 'api_keys'
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign key to user (optional - some API keys might be system-level)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True, index=True)
    
    # API Key data
    key_hash = Column(String(255), unique=True, nullable=False, index=True)  # Hashed API key
    key_prefix = Column(String(20), nullable=False)  # First few characters for identification
    name = Column(String(100), nullable=False)  # Human-readable name for the key
    description = Column(Text, nullable=True)
    
    # Permissions and scope
    scopes = Column(Text, nullable=True)  # JSON string for API scopes/permissions
    rate_limit = Column(Integer, nullable=True)  # Custom rate limit for this key
    
    # Status and timing
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Optional expiration
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_used = Column(DateTime(timezone=True), nullable=True)
    
    # Usage tracking
    usage_count = Column(Integer, default=0, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="api_keys")
    
    def __repr__(self):
        return f"<APIKey(id={self.id}, name='{self.name}', active={self.is_active})>"
    
    def is_expired(self):
        """Check if API key is expired"""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at
    
    def to_dict(self):
        """Convert API key to dictionary (excluding sensitive data)"""
        return {
            'id': str(self.id),
            'user_id': str(self.user_id) if self.user_id else None,
            'key_prefix': self.key_prefix,
            'name': self.name,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_used': self.last_used.isoformat() if self.last_used else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_expired': self.is_expired(),
            'usage_count': self.usage_count
        }


# Export models for easy importing
__all__ = ['User', 'UserSession', 'APIKey']
