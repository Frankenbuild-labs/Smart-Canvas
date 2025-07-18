"""
Agent Flow API Routes for Unified Backend
Proxies requests to the Agent Flow frontend API
"""

import os
import logging
import httpx
from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/agent-flow", tags=["agent-flow"])

# Configuration
AGENT_FLOW_FRONTEND_URL = os.getenv('AGENT_FLOW_FRONTEND_URL', 'http://localhost:3000')

class AgentFlowRequest(BaseModel):
    graphJson: Dict[str, Any]
    chatInput: Optional[str] = None

@router.get("/health")
async def health_check():
    """Health check for Agent Flow integration"""
    try:
        async with httpx.AsyncClient() as client:
            # Check if Agent Flow frontend is running
            try:
                response = await client.get(f"{AGENT_FLOW_FRONTEND_URL}/api/health", timeout=5.0)
                frontend_healthy = response.status_code == 200
            except:
                frontend_healthy = False
        
        return {
            "status": "healthy",
            "service": "agent-flow-proxy",
            "timestamp": datetime.now().isoformat(),
            "frontend_url": AGENT_FLOW_FRONTEND_URL,
            "frontend_healthy": frontend_healthy,
            "features": {
                "workflow_execution": True,
                "composio_integration": True,
                "orchestrator_proxy": True
            }
        }
    except Exception as e:
        logger.error(f"Agent Flow health check failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agent")
async def execute_agent_workflow(request: AgentFlowRequest):
    """Execute agent workflow by proxying to Agent Flow frontend"""
    try:
        async with httpx.AsyncClient() as client:
            # Proxy request to Agent Flow frontend
            response = await client.post(
                f"{AGENT_FLOW_FRONTEND_URL}/api/agent",
                json=request.dict(),
                headers={"Content-Type": "application/json"},
                timeout=60.0
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "result": result,
                    "timestamp": datetime.now().isoformat()
                }
            else:
                logger.error(f"Agent Flow frontend error: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Agent Flow execution failed: {response.text}"
                )
                
    except httpx.TimeoutException:
        logger.error("Agent Flow frontend timeout")
        raise HTTPException(status_code=504, detail="Agent Flow frontend timeout")
    except httpx.ConnectError:
        logger.error("Cannot connect to Agent Flow frontend")
        raise HTTPException(
            status_code=503, 
            detail=f"Agent Flow frontend not available at {AGENT_FLOW_FRONTEND_URL}"
        )
    except Exception as e:
        logger.error(f"Agent Flow proxy error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config")
async def get_agent_flow_config():
    """Get Agent Flow configuration"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{AGENT_FLOW_FRONTEND_URL}/api/config", timeout=10.0)
            
            if response.status_code == 200:
                return response.json()
            else:
                # Return default config if frontend not available
                return {
                    "service": "agent-flow",
                    "frontend_url": AGENT_FLOW_FRONTEND_URL,
                    "backend_url": "http://localhost:8000",
                    "features": {
                        "visual_workflow_builder": True,
                        "langgraph_execution": True,
                        "composio_integration": True,
                        "orchestrator_llm": True,
                        "chat_mode": True
                    },
                    "supported_nodes": [
                        "customInput",
                        "llm", 
                        "agent",
                        "customOutput",
                        "composio"
                    ],
                    "supported_providers": [
                        "openai",
                        "anthropic",
                        "google",
                        "orchestrator"
                    ]
                }
    except Exception as e:
        logger.error(f"Agent Flow config error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_agent_flow_status():
    """Get Agent Flow service status"""
    try:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{AGENT_FLOW_FRONTEND_URL}/api/health", timeout=5.0)
                frontend_healthy = response.status_code == 200
                frontend_data = response.json() if frontend_healthy else {}
            except:
                frontend_healthy = False
                frontend_data = {}
        
        return {
            "service": "agent-flow-proxy",
            "status": "running",
            "timestamp": datetime.now().isoformat(),
            "dependencies": {
                "frontend": {
                    "url": AGENT_FLOW_FRONTEND_URL,
                    "healthy": frontend_healthy,
                    "data": frontend_data
                }
            },
            "capabilities": [
                "workflow_execution",
                "agent_management", 
                "tool_integration",
                "composio_proxy"
            ]
        }
    except Exception as e:
        logger.error(f"Agent Flow status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
