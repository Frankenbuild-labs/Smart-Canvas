"""
Authentication Middleware for Metatron Backend
Provides unified authentication and authorization across all services
"""

import logging
import os
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
try:
    import jwt
except ImportError:
    # Try alternative import for PyJWT
    try:
        import PyJWT as jwt
    except ImportError:
        raise ImportError("PyJWT library is required. Install with: pip install PyJWT")

logger = logging.getLogger(__name__)

# Security configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "metatron-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

security = HTTPBearer(auto_error=False)

class AuthManager:
    """Enhanced authentication and authorization manager"""

    def __init__(self):
        self.secret_key = SECRET_KEY
        self.algorithm = ALGORITHM
        self.token_expire_minutes = ACCESS_TOKEN_EXPIRE_MINUTES
        self.pwd_context = pwd_context
    
    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        return self.pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return self.pwd_context.verify(plain_password, hashed_password)

    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.token_expire_minutes)

        to_encode.update({"exp": expire, "iat": datetime.utcnow()})

        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.JWTError as e:
            logger.warning(f"JWT error: {e}")
            return None
    
    def register_user(self, db, email: str, password: str, username: str = None, **kwargs):
        """Register a new user"""
        from .database import get_user_by_email, create_user

        # Check if user already exists
        existing_user = get_user_by_email(db, email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Hash password
        password_hash = self.hash_password(password)

        # Create user
        user = create_user(
            db=db,
            email=email,
            password_hash=password_hash,
            username=username,
            **kwargs
        )

        return user

    def authenticate_user(self, db, email: str, password: str):
        """Authenticate user with email and password"""
        from .database import get_user_by_email, update_user_last_login

        user = get_user_by_email(db, email)
        if not user:
            return None

        if not user.is_active:
            return None

        if not self.verify_password(password, user.password_hash):
            return None

        # Update last login
        update_user_last_login(db, str(user.id))

        return user

    def create_user_token(self, user) -> str:
        """Create access token for user"""
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "username": user.username,
            "is_admin": user.is_admin,
            "is_verified": user.is_verified
        }
        return self.create_access_token(token_data)

    def get_current_user(self, token: str) -> Optional[Dict[str, Any]]:
        """Get current user from token"""
        payload = self.verify_token(token)
        if payload is None:
            return None

        user_id = payload.get("sub")
        if user_id is None:
            return None

        # Return user info from token payload
        return {
            "id": user_id,
            "username": payload.get("username"),
            "email": payload.get("email"),
            "is_admin": payload.get("is_admin", False),
            "is_verified": payload.get("is_verified", False)
        }

    def get_user_from_db(self, db, user_id: str):
        """Get user from database by ID"""
        from .database import get_user_by_id
        return get_user_by_id(db, user_id)

# Global auth manager
auth_manager = AuthManager()

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """Get current user (for development - returns default user if no token)"""
    if credentials is None:
        # Return default user for development
        return {
            "user_id": "dev_user",
            "username": "developer",
            "email": "dev@metatron.com",
            "is_admin": True,
            "is_verified": True
        }

    user = auth_manager.get_current_user(credentials.credentials)
    if user is None:
        # Return default user for development
        return {
            "user_id": "dev_user",
            "username": "developer",
            "email": "dev@metatron.com",
            "is_admin": True,
            "is_verified": True
        }

    return user

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[Dict[str, Any]]:
    """Get current user (optional - doesn't raise exception if no token)"""
    if credentials is None:
        return None

    user = auth_manager.get_current_user(credentials.credentials)
    return user

async def get_current_user_required(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """Get current user (required - raises exception if no valid token)"""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = auth_manager.get_current_user(credentials.credentials)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

def require_permission(permission: str):
    """Decorator to require specific permission"""
    def permission_checker(user: Dict[str, Any] = Depends(get_current_user_required)):
        # Check if user is admin (admins have all permissions)
        if user.get("is_admin", False):
            return user

        # For now, we'll implement basic permission checking
        # In the future, this can be extended with role-based permissions
        user_permissions = user.get("permissions", [])
        if permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required"
            )
        return user
    return permission_checker

def require_admin():
    """Decorator to require admin privileges"""
    def admin_checker(user: Dict[str, Any] = Depends(get_current_user_required)):
        if not user.get("is_admin", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        return user
    return admin_checker

def require_verified():
    """Decorator to require verified user"""
    def verified_checker(user: Dict[str, Any] = Depends(get_current_user_required)):
        if not user.get("is_verified", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email verification required"
            )
        return user
    return verified_checker

async def api_key_auth(request: Request) -> Optional[str]:
    """API key authentication for service-to-service communication"""
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        return None
    
    # In a real implementation, validate API key against database
    # For now, accept any API key for internal service communication
    return api_key

class RateLimiter:
    """Simple rate limiter for API endpoints"""
    
    def __init__(self):
        self.requests = {}
    
    def is_allowed(self, identifier: str, max_requests: int = 100, window_minutes: int = 1) -> bool:
        """Check if request is allowed based on rate limit"""
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=window_minutes)
        
        # Clean old requests
        if identifier in self.requests:
            self.requests[identifier] = [
                req_time for req_time in self.requests[identifier] 
                if req_time > window_start
            ]
        else:
            self.requests[identifier] = []
        
        # Check if under limit
        if len(self.requests[identifier]) >= max_requests:
            return False
        
        # Add current request
        self.requests[identifier].append(now)
        return True

# Global rate limiter
rate_limiter = RateLimiter()

def rate_limit(max_requests: int = 100, window_minutes: int = 1):
    """Rate limiting dependency"""
    def rate_limit_checker(request: Request):
        client_ip = request.client.host
        if not rate_limiter.is_allowed(client_ip, max_requests, window_minutes):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded"
            )
        return True
    return rate_limit_checker

# Export commonly used items
__all__ = [
    'AuthManager',
    'auth_manager',
    'get_current_user',
    'get_current_user_optional',
    'get_current_user_required',
    'require_permission',
    'api_key_auth',
    'RateLimiter',
    'rate_limiter',
    'rate_limit'
]
