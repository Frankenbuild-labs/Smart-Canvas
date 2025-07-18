"""
Video Meeting API Routes for Unified Backend
Integrates VideoSDK functionality for video conferencing
"""

import logging
import uuid
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, HTTPException, status, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from core.database import get_db_dependency
from core.auth import get_current_user_required, get_current_user_optional
from core.config import get_api_key
from .service import videosdk_manager
from .models import (
    CreateRoomRequest,
    RoomResponse,
    TokenRequest,
    TokenResponse,
    ParticipantInfo,
    RoomParticipantsResponse,
    RecordingRequest,
    RecordingResponse,
    MessageResponse
)

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/video", tags=["video-meetings"])

# VideoSDK API configuration
VIDEOSDK_API_BASE = "https://api.videosdk.live"
VIDEOSDK_API_KEY = get_api_key("videosdk")

# In-memory storage for demo (in production, use database)
active_rooms: Dict[str, Dict[str, Any]] = {}
room_participants: Dict[str, List[Dict[str, Any]]] = {}
active_connections: Dict[str, List[WebSocket]] = {}


# Use the enhanced VideoSDK manager from service module


@router.post("/rooms", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    room_data: CreateRoomRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_required)
):
    """Create a new video meeting room"""
    try:
        # Create room with VideoSDK
        videosdk_response = await videosdk_manager.create_room()
        videosdk_room_id = videosdk_response.get("roomId")
        
        if not videosdk_room_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create video room"
            )
        
        # Store room information
        room_info = {
            "room_id": videosdk_room_id,
            "name": room_data.name,
            "description": room_data.description,
            "created_by": current_user["id"],
            "created_at": datetime.utcnow(),
            "max_participants": room_data.max_participants,
            "recording_enabled": room_data.recording_enabled,
            "is_active": True
        }
        
        active_rooms[videosdk_room_id] = room_info
        room_participants[videosdk_room_id] = []
        active_connections[videosdk_room_id] = []
        
        logger.info(f"Video room created: {videosdk_room_id} by user {current_user['id']}")
        
        return RoomResponse(**room_info)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Room creation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create video room"
        )


@router.get("/rooms/{room_id}", response_model=RoomResponse)
async def get_room_details(
    room_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_optional)
):
    """Get video room details"""
    try:
        if room_id not in active_rooms:
            # Try to validate with VideoSDK
            is_valid = await videosdk_manager.validate_room(room_id)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Video room not found"
                )
            
            # Create minimal room info for external rooms
            room_info = {
                "room_id": room_id,
                "name": "External Room",
                "description": "Room created outside this system",
                "created_by": "external",
                "created_at": datetime.utcnow(),
                "max_participants": 10,
                "recording_enabled": False,
                "is_active": True
            }
            active_rooms[room_id] = room_info
        
        return RoomResponse(**active_rooms[room_id])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get room details error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve room details"
        )


@router.post("/rooms/{room_id}/token", response_model=TokenResponse)
async def get_room_token(
    room_id: str,
    token_request: TokenRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_required)
):
    """Generate access token for joining a video room"""
    try:
        # Validate room exists
        if room_id not in active_rooms:
            is_valid = await videosdk_manager.validate_room(room_id)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Video room not found"
                )
        
        # Generate participant ID
        participant_id = f"participant_{uuid.uuid4().hex[:8]}"
        
        # Generate VideoSDK token
        participant_name = token_request.participant_name or current_user.get("username", "Anonymous")
        access_token = videosdk_manager.generate_jwt_token(room_id, participant_id, ["allow_join", "allow_mod"])
        
        # Set token expiration (4 hours from now)
        expires_at = datetime.utcnow() + timedelta(hours=4)
        
        logger.info(f"Token generated for user {current_user['id']} in room {room_id}")
        
        return TokenResponse(
            token=access_token,
            room_id=room_id,
            participant_id=participant_id,
            expires_at=expires_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token generation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate room token"
        )


@router.get("/rooms/{room_id}/participants", response_model=RoomParticipantsResponse)
async def get_room_participants(
    room_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_required)
):
    """Get list of participants in a video room"""
    try:
        if room_id not in room_participants:
            room_participants[room_id] = []
        
        participants = [
            ParticipantInfo(**participant) 
            for participant in room_participants[room_id]
        ]
        
        return RoomParticipantsResponse(
            room_id=room_id,
            participants=participants,
            total_count=len(participants)
        )
        
    except Exception as e:
        logger.error(f"Get participants error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve participants"
        )


@router.delete("/rooms/{room_id}")
async def end_room(
    room_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_required)
):
    """End a video meeting room"""
    try:
        if room_id not in active_rooms:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video room not found"
            )
        
        room_info = active_rooms[room_id]
        
        # Check if user is the creator or admin
        if (room_info["created_by"] != current_user["id"] and 
            not current_user.get("is_admin", False)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only room creator or admin can end the meeting"
            )
        
        # Mark room as inactive
        active_rooms[room_id]["is_active"] = False
        
        # Close all WebSocket connections for this room
        if room_id in active_connections:
            for websocket in active_connections[room_id]:
                try:
                    await websocket.close()
                except:
                    pass
            active_connections[room_id] = []
        
        logger.info(f"Video room ended: {room_id} by user {current_user['id']}")
        
        return MessageResponse(
            message="Video room ended successfully",
            success=True,
            data={"room_id": room_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"End room error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to end video room"
        )


@router.websocket("/rooms/{room_id}/ws")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    """WebSocket endpoint for real-time video meeting signaling"""
    await websocket.accept()

    # Add connection to room
    if room_id not in active_connections:
        active_connections[room_id] = []
    active_connections[room_id].append(websocket)

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()

            # Broadcast message to all other participants in the room
            for connection in active_connections[room_id]:
                if connection != websocket:
                    try:
                        await connection.send_json(data)
                    except:
                        # Remove dead connections
                        active_connections[room_id].remove(connection)

    except WebSocketDisconnect:
        # Remove connection when client disconnects
        if websocket in active_connections[room_id]:
            active_connections[room_id].remove(websocket)
        logger.info(f"WebSocket disconnected from room {room_id}")


@router.post("/rooms/{room_id}/recording/start", response_model=RecordingResponse)
async def start_recording(
    room_id: str,
    recording_request: RecordingRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_required)
):
    """Start recording a video meeting"""
    try:
        if room_id not in active_rooms:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video room not found"
            )

        room_info = active_rooms[room_id]

        if not room_info["recording_enabled"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recording is not enabled for this room"
            )

        # Generate recording ID
        recording_id = f"rec_{uuid.uuid4().hex[:12]}"

        # In a real implementation, you would start recording with VideoSDK
        # For now, we'll simulate the recording start

        logger.info(f"Recording started: {recording_id} for room {room_id}")

        return RecordingResponse(
            recording_id=recording_id,
            room_id=room_id,
            status="started",
            started_at=datetime.utcnow(),
            stopped_at=None,
            download_url=None
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Start recording error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start recording"
        )


@router.post("/rooms/{room_id}/recording/stop", response_model=RecordingResponse)
async def stop_recording(
    room_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_required)
):
    """Stop recording a video meeting"""
    try:
        if room_id not in active_rooms:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video room not found"
            )

        # In a real implementation, you would stop recording with VideoSDK
        # For now, we'll simulate the recording stop

        recording_id = f"rec_{uuid.uuid4().hex[:12]}"

        logger.info(f"Recording stopped: {recording_id} for room {room_id}")

        return RecordingResponse(
            recording_id=recording_id,
            room_id=room_id,
            status="stopped",
            started_at=datetime.utcnow() - timedelta(minutes=30),  # Simulate 30 min recording
            stopped_at=datetime.utcnow(),
            download_url=f"/api/video/recordings/{recording_id}/download"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stop recording error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to stop recording"
        )


@router.get("/health")
async def video_health_check():
    """Health check endpoint for video service"""
    try:
        # Check if VideoSDK API key is configured
        if not VIDEOSDK_API_KEY:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "status": "unhealthy",
                    "message": "VideoSDK API key not configured",
                    "service": "video-meetings"
                }
            )

        return {
            "status": "healthy",
            "message": "Video meeting service is operational",
            "service": "video-meetings",
            "active_rooms": len(active_rooms),
            "total_connections": sum(len(connections) for connections in active_connections.values())
        }

    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "message": str(e),
                "service": "video-meetings"
            }
        )
