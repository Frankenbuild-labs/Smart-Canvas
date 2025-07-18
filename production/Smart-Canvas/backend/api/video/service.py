"""
Video Meeting Service Utilities
Provides enhanced VideoSDK integration and meeting management
"""

import logging
import jwt
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from core.config import get_api_key

logger = logging.getLogger(__name__)


class VideoSDKManager:
    """Enhanced VideoSDK service manager"""
    
    def __init__(self):
        self.api_key = get_api_key("videosdk")
        self.secret_key = get_api_key("videosdk_secret") or self.api_key  # Fallback to API key
        self.base_url = "https://api.videosdk.live"
        self.headers = {
            "Authorization": self.api_key,
            "Content-Type": "application/json"
        }
    
    def generate_jwt_token(self, room_id: str, participant_id: str, permissions: List[str] = None) -> str:
        """Generate JWT token for VideoSDK authentication"""
        try:
            if permissions is None:
                permissions = ["allow_join", "allow_mod"]
            
            payload = {
                "iss": "videosdk",
                "sub": participant_id,
                "room": room_id,
                "permissions": permissions,
                "iat": datetime.utcnow(),
                "exp": datetime.utcnow() + timedelta(hours=4)
            }
            
            token = jwt.encode(payload, self.secret_key, algorithm="HS256")
            return token
            
        except Exception as e:
            logger.error(f"JWT token generation failed: {e}")
            # Fallback to API key for basic authentication
            return self.api_key
    
    async def create_room(self, custom_room_id: str = None) -> Dict[str, Any]:
        """Create a new VideoSDK room"""
        try:
            url = f"{self.base_url}/v2/rooms"
            payload = {}
            
            if custom_room_id:
                payload["customRoomId"] = custom_room_id
            
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Failed to create VideoSDK room: {e}")
            raise Exception(f"VideoSDK room creation failed: {str(e)}")
    
    async def validate_room(self, room_id: str) -> bool:
        """Validate if a VideoSDK room exists and is active"""
        try:
            url = f"{self.base_url}/v2/rooms/validate/{room_id}"
            response = requests.get(url, headers=self.headers)
            return response.status_code == 200
            
        except requests.RequestException as e:
            logger.error(f"Room validation failed: {e}")
            return False
    
    async def get_room_details(self, room_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a VideoSDK room"""
        try:
            url = f"{self.base_url}/v2/rooms/{room_id}"
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Failed to get room details: {e}")
            return None
    
    async def start_recording(self, room_id: str, webhook_url: str = None) -> Dict[str, Any]:
        """Start recording a VideoSDK room"""
        try:
            url = f"{self.base_url}/v2/recordings/start"
            payload = {
                "roomId": room_id,
                "config": {
                    "layout": {
                        "type": "GRID",
                        "priority": "SPEAKER",
                        "gridSize": 4
                    },
                    "theme": "DARK",
                    "mode": "video-and-audio",
                    "quality": "high",
                    "orientation": "landscape"
                }
            }
            
            if webhook_url:
                payload["webhookUrl"] = webhook_url
            
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Failed to start recording: {e}")
            raise Exception(f"Recording start failed: {str(e)}")
    
    async def stop_recording(self, room_id: str) -> Dict[str, Any]:
        """Stop recording a VideoSDK room"""
        try:
            url = f"{self.base_url}/v2/recordings/stop"
            payload = {"roomId": room_id}
            
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Failed to stop recording: {e}")
            raise Exception(f"Recording stop failed: {str(e)}")
    
    async def get_recordings(self, room_id: str) -> List[Dict[str, Any]]:
        """Get all recordings for a room"""
        try:
            url = f"{self.base_url}/v2/recordings"
            params = {"roomId": room_id}
            
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            data = response.json()
            return data.get("recordings", [])
            
        except requests.RequestException as e:
            logger.error(f"Failed to get recordings: {e}")
            return []
    
    async def start_livestream(self, room_id: str, stream_config: Dict[str, Any]) -> Dict[str, Any]:
        """Start livestreaming a VideoSDK room"""
        try:
            url = f"{self.base_url}/v2/livestreams/start"
            payload = {
                "roomId": room_id,
                "config": stream_config
            }
            
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Failed to start livestream: {e}")
            raise Exception(f"Livestream start failed: {str(e)}")
    
    async def stop_livestream(self, room_id: str) -> Dict[str, Any]:
        """Stop livestreaming a VideoSDK room"""
        try:
            url = f"{self.base_url}/v2/livestreams/stop"
            payload = {"roomId": room_id}
            
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Failed to stop livestream: {e}")
            raise Exception(f"Livestream stop failed: {str(e)}")
    
    def is_configured(self) -> bool:
        """Check if VideoSDK is properly configured"""
        return bool(self.api_key and self.api_key != "")


# Global VideoSDK manager instance
videosdk_manager = VideoSDKManager()
