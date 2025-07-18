"""
Social Station API Routes for FastAPI
Converts Flask endpoints to FastAPI for unified backend
"""

import os
import sys
import asyncio
import logging
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

# Add social-station to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'social-station'))

from social_station_unified import get_social_station_service, SocialStationService

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/social", tags=["social"])

# Pydantic models
class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = {}

class PublishRequest(BaseModel):
    content: str
    platforms: List[str]
    hashtags: Optional[List[str]] = []

class ScheduleRequest(BaseModel):
    content: str
    platforms: List[str]
    schedule_time: str
    hashtags: Optional[List[str]] = []

class ConnectPlatformRequest(BaseModel):
    platform: str
    auth_data: Optional[Dict[str, Any]] = {}

class GenerateContentRequest(BaseModel):
    prompt: str
    platform: Optional[str] = None
    content_type: Optional[str] = "post"

class DraftRequest(BaseModel):
    content: str
    platforms: List[str]
    hashtags: Optional[List[str]] = []

class InfluencerConfigRequest(BaseModel):
    schedule: Optional[str] = "daily"
    time_zone: Optional[str] = "UTC"
    time_slots: Optional[List[str]] = []
    persona: Optional[str] = "tech_guru"
    instructions: Optional[str] = ""
    tone: Optional[str] = "professional"

# Global service instance
social_service: Optional[SocialStationService] = None

def get_service() -> SocialStationService:
    """Get or create social station service instance"""
    global social_service
    if social_service is None:
        # Get the correct path to the config file
        config_path = os.path.join(os.path.dirname(__file__), '..', '..', 'social-station', 'config.yaml')
        social_service = get_social_station_service(config_path)
    return social_service

# =============================================================================
# CHAT AND AI AGENT ENDPOINTS
# =============================================================================

@router.post("/chat")
async def chat_with_agent(request: ChatRequest):
    """Chat with the social media AI agent"""
    try:
        if not request.message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        service = get_service()
        result = await service.chat_with_agent(request.message, request.context)
        
        return result
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# CONTENT PUBLISHING ENDPOINTS
# =============================================================================

@router.post("/publish")
async def publish_post(request: PublishRequest):
    """Publish a post to social media platforms"""
    try:
        if not request.content:
            raise HTTPException(status_code=400, detail="Content is required")
        
        if not request.platforms:
            raise HTTPException(status_code=400, detail="At least one platform is required")
        
        service = get_service()
        result = await service.publish_post(request.content, request.platforms, request.hashtags)
        
        return result
        
    except Exception as e:
        logger.error(f"Publish error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/schedule")
async def schedule_post(request: ScheduleRequest):
    """Schedule a post for later publishing"""
    try:
        if not request.content:
            raise HTTPException(status_code=400, detail="Content is required")

        if not request.platforms:
            raise HTTPException(status_code=400, detail="At least one platform is required")

        if not request.schedule_time:
            raise HTTPException(status_code=400, detail="Schedule time is required")

        # Convert ISO string to datetime
        try:
            schedule_time = datetime.fromisoformat(request.schedule_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid schedule time format. Use ISO format.")

        service = get_service()

        # Create a custom result to avoid datetime serialization issues
        try:
            result = await service.schedule_post(request.content, request.platforms, schedule_time, request.hashtags)

            # Return a safe response without datetime objects
            return {
                "success": True,
                "scheduled_id": result.get("scheduled_id", str(uuid.uuid4())),
                "schedule_time": schedule_time.isoformat(),
                "message": f"Post scheduled for {schedule_time.strftime('%B %d, %Y at %I:%M %p')}"
            }
        except Exception as e:
            logger.error(f"Service schedule error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    except Exception as e:
        logger.error(f"Schedule error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-content")
async def generate_content(request: GenerateContentRequest):
    """Generate AI content for social media"""
    try:
        if not request.prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")
        
        service = get_service()
        result = await service.generate_content(request.prompt, request.platform, request.content_type)
        
        return result
        
    except Exception as e:
        logger.error(f"Generate content error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# DRAFT MANAGEMENT ENDPOINTS
# =============================================================================

@router.post("/drafts")
async def save_draft(request: DraftRequest):
    """Save a draft post"""
    try:
        if not request.content:
            raise HTTPException(status_code=400, detail="Content is required")

        if not request.platforms:
            raise HTTPException(status_code=400, detail="At least one platform is required")

        service = get_service()
        result = service.save_draft(request.content, request.platforms, request.hashtags)

        return result

    except Exception as e:
        logger.error(f"Save draft error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/drafts")
async def get_drafts():
    """Get all draft posts"""
    try:
        service = get_service()
        drafts = service.get_drafts()

        return {
            'success': True,
            'drafts': drafts,
            'count': len(drafts)
        }

    except Exception as e:
        logger.error(f"Get drafts error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# INFLUENCER SYSTEM ENDPOINTS
# =============================================================================

@router.post("/influencer/start")
async def start_influencer():
    """Start autonomous influencer system"""
    try:
        service = get_service()
        result = await service.start_autonomous_influencer()
        return result
    except Exception as e:
        logger.error(f"Start influencer error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/influencer/stop")
async def stop_influencer():
    """Stop autonomous influencer system"""
    try:
        service = get_service()
        result = await service.stop_autonomous_influencer()
        return result
    except Exception as e:
        logger.error(f"Stop influencer error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/influencer/config")
async def save_influencer_config(request: InfluencerConfigRequest):
    """Save influencer configuration"""
    try:
        service = get_service()
        result = service.save_influencer_config(request.dict())
        return result
    except Exception as e:
        logger.error(f"Save influencer config error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/influencer/config")
async def get_influencer_config():
    """Get influencer configuration"""
    try:
        service = get_service()
        result = service.get_influencer_config()
        return result
    except Exception as e:
        logger.error(f"Get influencer config error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/influencer/persona-config")
async def save_persona_config(request: InfluencerConfigRequest):
    """Save persona configuration"""
    try:
        service = get_service()
        result = service.save_persona_config(request.dict())
        return result
    except Exception as e:
        logger.error(f"Save persona config error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/influencer/test-sources")
async def test_content_sources(request: Dict[str, Any]):
    """Test content sources"""
    try:
        service = get_service()
        result = await service.test_content_sources(request.get('sources', {}))
        return result
    except Exception as e:
        logger.error(f"Test sources error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/influencer/status")
async def get_influencer_status():
    """Get influencer system status"""
    try:
        service = get_service()
        result = service.get_influencer_status()
        return result
    except Exception as e:
        logger.error(f"Get influencer status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/influencer/logs")
async def get_influencer_logs():
    """Get influencer system logs"""
    try:
        service = get_service()
        result = service.get_influencer_logs()
        return result
    except Exception as e:
        logger.error(f"Get influencer logs error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/influencer/generate")
async def generate_influencer_content(request: Dict[str, Any]):
    """Generate content using influencer personas"""
    try:
        service = get_service()
        result = await service.generate_influencer_content(
            request.get('persona', 'tech_guru'),
            request.get('content_type', 'insights'),
            request.get('count', 1)
        )
        return result
    except Exception as e:
        logger.error(f"Generate influencer content error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# ANALYTICS ENDPOINTS - REAL BACKEND CONNECTIONS
# =============================================================================

@router.get("/analytics/summary")
async def get_analytics_summary():
    """Get analytics summary for quick stats"""
    try:
        service = get_service()
        result = service.get_analytics_summary()
        return result
    except Exception as e:
        logger.error(f"Get analytics summary error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics")
async def get_analytics(platform: Optional[str] = None, timeframe: int = 7):
    """Get detailed analytics data"""
    try:
        service = get_service()
        result = await service.get_analytics(platform, timeframe)
        return result
    except Exception as e:
        logger.error(f"Get analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/hashtags")
async def get_hashtag_performance():
    """Get hashtag performance analytics"""
    try:
        service = get_service()
        result = service.get_hashtag_performance()
        return result
    except Exception as e:
        logger.error(f"Get hashtag performance error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/top-content")
async def get_top_content(sort: str = "engagement"):
    """Get top performing content"""
    try:
        service = get_service()
        result = service.get_top_content(sort)
        return result
    except Exception as e:
        logger.error(f"Get top content error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/engagement")
async def get_engagement_metrics():
    """Get engagement metrics"""
    try:
        service = get_service()
        result = service.get_engagement_metrics()
        return result
    except Exception as e:
        logger.error(f"Get engagement metrics error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analytics/report")
async def generate_analytics_report(request: Dict[str, Any]):
    """Generate analytics report"""
    try:
        service = get_service()
        result = await service.generate_analytics_report(
            request.get('type', 'engagement'),
            request.get('timeframe', 7)
        )
        return result
    except Exception as e:
        logger.error(f"Generate analytics report error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# PLATFORM MANAGEMENT ENDPOINTS
# =============================================================================

@router.get("/platforms")
async def get_platforms():
    """Get platform status"""
    try:
        service = get_service()
        result = service.get_platform_status()
        return {
            'success': True,
            'connected_platforms': result['connected_platforms'],
            'available_platforms': result['available_platforms']
        }
    except Exception as e:
        logger.error(f"Get platforms error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/platforms/status")
async def get_platforms_status():
    """Get status of all social media platform connections"""
    try:
        service = get_service()

        # Get platform connection status
        platforms_status = {
            'twitter': {'connected': False, 'last_check': datetime.now().isoformat()},
            'linkedin': {'connected': False, 'last_check': datetime.now().isoformat()},
            'instagram': {'connected': False, 'last_check': datetime.now().isoformat()},
            'facebook': {'connected': False, 'last_check': datetime.now().isoformat()},
            'tiktok': {'connected': False, 'last_check': datetime.now().isoformat()}
        }

        return {
            'success': True,
            'platforms': platforms_status,
            'composio_enabled': True,
            'connected_platforms': getattr(service.social_agent, 'connected_platforms', {})
        }

    except Exception as e:
        logger.error(f"Get platforms status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/platforms/connect")
async def connect_platform(request: ConnectPlatformRequest):
    """Connect a new social media platform"""
    try:
        if not request.platform:
            raise HTTPException(status_code=400, detail="Platform is required")
        
        service = get_service()
        result = await service.connect_platform(request.platform, request.auth_data)
        
        return result
        
    except Exception as e:
        logger.error(f"Connect platform error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# COMPOSIO INTEGRATION ENDPOINTS
# =============================================================================

# =============================================================================
# OAUTH ENDPOINTS - TRADITIONAL OAUTH FLOW
# =============================================================================

@router.post("/oauth/initiate")
async def initiate_oauth(request: Dict[str, Any]):
    """Initiate OAuth flow for platform connection"""
    try:
        platform = request.get('platform', '').lower()
        if not platform:
            raise HTTPException(status_code=400, detail="Platform is required")

        service = get_service()
        result = await service.initiate_oauth_flow(platform)

        return result

    except Exception as e:
        logger.error(f"OAuth initiation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/oauth/callback/{platform}")
async def oauth_callback(platform: str, code: str = None, state: str = None, error: str = None):
    """Handle OAuth callback from platform"""
    try:
        if error:
            raise HTTPException(status_code=400, detail=f"OAuth error: {error}")

        if not code:
            raise HTTPException(status_code=400, detail="Authorization code is required")

        service = get_service()
        result = await service.complete_oauth_flow(platform, code, state)

        return result

    except Exception as e:
        logger.error(f"OAuth callback error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/composio/status")
async def composio_platform_status():
    """Get Composio platform connection status"""
    try:
        composio_integration = get_composio_social_integration()
        status = composio_integration.get_platform_status()

        return {
            'success': True,
            'composio_status': status
        }

    except Exception as e:
        logger.error(f"Composio status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# AI ANALYSIS ENDPOINTS
# =============================================================================

@router.post("/ai/best-time")
async def handle_best_time():
    """Find best posting time using AI analysis"""
    try:
        # This would integrate with the AI analysis functionality
        # For now, return a placeholder response
        return {
            'success': True,
            'best_times': {
                'twitter': '2:00 PM - 3:00 PM',
                'linkedin': '8:00 AM - 10:00 AM',
                'instagram': '11:00 AM - 1:00 PM'
            },
            'analysis': 'Based on engagement patterns and audience activity'
        }
    except Exception as e:
        logger.error(f"Best time analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai/analyze")
async def analyze_content():
    """Analyze content performance potential"""
    try:
        # This would integrate with the AI analysis functionality
        # For now, return a placeholder response
        return {
            'success': True,
            'score': 85,
            'suggestions': [
                'Add more engaging hashtags',
                'Include a call-to-action',
                'Consider posting at peak hours'
            ],
            'sentiment': 'positive'
        }
    except Exception as e:
        logger.error(f"Content analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# HEALTH CHECK
# =============================================================================

@router.get("/connected-platforms")
async def get_connected_platforms():
    """Get connected platforms from Ayrshare"""
    try:
        service = get_service()
        result = await service.get_connected_platforms()
        return result
    except Exception as e:
        logger.error(f"Get connected platforms error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Ayrshare Business Plan endpoints removed - using oauth2-proxy instead

@router.get("/health")
async def health_check():
    """Health check for social station"""
    try:
        service = get_service()
        return {
            'status': 'healthy',
            'service': 'social_station',
            'timestamp': datetime.now().isoformat(),
            'connected_platforms': len(getattr(service, 'connected_platforms', {}))
        }
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }
