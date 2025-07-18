"""
Pydantic models for Video Meeting API
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class CreateRoomRequest(BaseModel):
    """Request model for creating a video meeting room"""
    name: Optional[str] = Field(None, description="Meeting room name")
    description: Optional[str] = Field(None, description="Meeting description")
    max_participants: Optional[int] = Field(10, description="Maximum number of participants")
    recording_enabled: bool = Field(False, description="Enable recording for this meeting")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Team Standup",
                "description": "Daily team standup meeting",
                "max_participants": 10,
                "recording_enabled": True
            }
        }


class RoomResponse(BaseModel):
    """Response model for room creation/details"""
    room_id: str = Field(..., description="Unique room identifier")
    name: Optional[str] = Field(None, description="Meeting room name")
    description: Optional[str] = Field(None, description="Meeting description")
    created_by: str = Field(..., description="User ID who created the room")
    created_at: datetime = Field(..., description="Room creation timestamp")
    max_participants: int = Field(..., description="Maximum participants allowed")
    recording_enabled: bool = Field(..., description="Recording enabled status")
    is_active: bool = Field(..., description="Room active status")
    
    class Config:
        json_schema_extra = {
            "example": {
                "room_id": "abc-123-def",
                "name": "Team Standup",
                "description": "Daily team standup meeting",
                "created_by": "user-123",
                "created_at": "2025-07-08T19:30:00Z",
                "max_participants": 10,
                "recording_enabled": True,
                "is_active": True
            }
        }


class TokenRequest(BaseModel):
    """Request model for generating room access token"""
    room_id: str = Field(..., description="Room ID to join")
    participant_name: Optional[str] = Field(None, description="Participant display name")
    
    class Config:
        json_schema_extra = {
            "example": {
                "room_id": "abc-123-def",
                "participant_name": "John Doe"
            }
        }


class TokenResponse(BaseModel):
    """Response model for room access token"""
    token: str = Field(..., description="VideoSDK access token")
    room_id: str = Field(..., description="Room ID")
    participant_id: str = Field(..., description="Unique participant identifier")
    expires_at: datetime = Field(..., description="Token expiration time")
    
    class Config:
        json_schema_extra = {
            "example": {
                "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "room_id": "abc-123-def",
                "participant_id": "participant-456",
                "expires_at": "2025-07-08T23:30:00Z"
            }
        }


class ParticipantInfo(BaseModel):
    """Participant information model"""
    participant_id: str = Field(..., description="Unique participant identifier")
    user_id: Optional[str] = Field(None, description="Associated user ID")
    name: str = Field(..., description="Participant display name")
    joined_at: datetime = Field(..., description="Join timestamp")
    is_host: bool = Field(False, description="Host status")
    audio_enabled: bool = Field(True, description="Audio enabled status")
    video_enabled: bool = Field(True, description="Video enabled status")
    screen_sharing: bool = Field(False, description="Screen sharing status")


class RoomParticipantsResponse(BaseModel):
    """Response model for room participants"""
    room_id: str = Field(..., description="Room ID")
    participants: List[ParticipantInfo] = Field(..., description="List of participants")
    total_count: int = Field(..., description="Total participant count")


class RecordingRequest(BaseModel):
    """Request model for starting/stopping recording"""
    room_id: str = Field(..., description="Room ID to record")
    recording_type: str = Field("video", description="Recording type (video, audio, screen)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "room_id": "abc-123-def",
                "recording_type": "video"
            }
        }


class RecordingResponse(BaseModel):
    """Response model for recording operations"""
    recording_id: str = Field(..., description="Unique recording identifier")
    room_id: str = Field(..., description="Room ID")
    status: str = Field(..., description="Recording status (started, stopped, processing)")
    started_at: Optional[datetime] = Field(None, description="Recording start time")
    stopped_at: Optional[datetime] = Field(None, description="Recording stop time")
    download_url: Optional[str] = Field(None, description="Download URL when ready")


class MessageResponse(BaseModel):
    """Generic message response model"""
    message: str = Field(..., description="Response message")
    success: bool = Field(default=True, description="Operation success status")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional response data")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "Operation completed successfully",
                "success": True,
                "data": {"room_id": "abc-123-def"}
            }
        }
