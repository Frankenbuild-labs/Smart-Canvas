"""
Authentication API Routes for Unified Backend
Provides user registration, login, and authentication management
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from core.database import get_db_dependency
from core.auth import auth_manager, get_current_user_required, security
from .models import (
    UserRegistrationRequest,
    UserLoginRequest,
    TokenResponse,
    UserResponse,
    PasswordChangeRequest,
    MessageResponse
)

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserRegistrationRequest,
    db: Session = Depends(get_db_dependency)
):
    """Register a new user account"""
    try:
        # Register user using AuthManager
        user = auth_manager.register_user(
            db=db,
            email=user_data.email,
            password=user_data.password,
            username=user_data.username
        )
        
        # Create access token
        access_token = auth_manager.create_user_token(user)
        
        # Prepare user data for response
        user_dict = user.to_dict()
        
        logger.info(f"User registered successfully: {user.email}")
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=auth_manager.token_expire_minutes * 60,  # Convert to seconds
            user=user_dict
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again."
        )


@router.post("/login", response_model=TokenResponse)
async def login_user(
    login_data: UserLoginRequest,
    db: Session = Depends(get_db_dependency)
):
    """Authenticate user and return access token"""
    try:
        # Authenticate user
        user = auth_manager.authenticate_user(
            db=db,
            email=login_data.email,
            password=login_data.password
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # Create access token
        access_token = auth_manager.create_user_token(user)
        
        # Prepare user data for response
        user_dict = user.to_dict()
        
        logger.info(f"User logged in successfully: {user.email}")
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=auth_manager.token_expire_minutes * 60,  # Convert to seconds
            user=user_dict
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again."
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Dict[str, Any] = Depends(get_current_user_required),
    db: Session = Depends(get_db_dependency)
):
    """Get current user information"""
    try:
        # Get user from database to ensure fresh data
        user = auth_manager.get_user_from_db(db, current_user["id"])
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse(**user.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user info error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user information"
        )


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_required),
    db: Session = Depends(get_db_dependency)
):
    """Change user password"""
    try:
        # Get user from database
        user = auth_manager.get_user_from_db(db, current_user["id"])
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify current password
        if not auth_manager.verify_password(password_data.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Hash new password
        new_password_hash = auth_manager.hash_password(password_data.new_password)
        
        # Update password in database
        user.password_hash = new_password_hash
        user.updated_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Password changed successfully for user: {user.email}")
        
        return MessageResponse(
            message="Password changed successfully",
            success=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Change password error: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )


@router.post("/logout", response_model=MessageResponse)
async def logout_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: Dict[str, Any] = Depends(get_current_user_required)
):
    """Logout user (invalidate token)"""
    try:
        # In a production system, you would:
        # 1. Add the token to a blacklist
        # 2. Remove the session from the database
        # 3. Clear any cached user data
        
        # For now, we'll just log the logout
        logger.info(f"User logged out: {current_user.get('email', 'unknown')}")
        
        return MessageResponse(
            message="Logged out successfully",
            success=True
        )
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@router.get("/verify-token")
async def verify_token(
    current_user: Dict[str, Any] = Depends(get_current_user_required)
):
    """Verify if the current token is valid"""
    return {
        "valid": True,
        "user": current_user,
        "message": "Token is valid"
    }
