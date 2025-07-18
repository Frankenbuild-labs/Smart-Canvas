"""
Dependency injection for the Orchestrator service
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


@dataclass
class OrchestratorDependencies:
    """
    Dependencies for the Metatron orchestrator agent
    Provides context and services needed by the agent and tools
    """
    user_id: str
    workspace: str
    config: Dict[str, Any]
    
    # Service connections (to be added as needed)
    memory_service: Optional[Any] = None
    creative_studio: Optional[Any] = None
    social_station: Optional[Any] = None
    video_meeting: Optional[Any] = None
    
    def get_user_context(self) -> Dict[str, Any]:
        """Get user-specific context"""
        return {
            "user_id": self.user_id,
            "workspace": self.workspace,
            "preferences": {},  # Could be loaded from database
            "permissions": []   # Could be loaded from auth system
        }
    
    def get_workspace_info(self) -> Dict[str, Any]:
        """Get workspace-specific information"""
        return {
            "name": self.workspace,
            "tools_enabled": [
                "memory_search",
                "composio_tools", 
                "creative_studio",
                "social_station",
                "video_meeting"
            ],
            "settings": {}
        }
    
    def get_api_keys(self) -> Dict[str, str]:
        """Get API keys for external services"""
        return {
            "gemini": self.config.get("api_keys", {}).get("gemini", ""),
            "composio": self.config.get("api_keys", {}).get("composio", ""),
            "openai": self.config.get("api_keys", {}).get("openai", ""),
            "anthropic": self.config.get("api_keys", {}).get("anthropic", "")
        }
