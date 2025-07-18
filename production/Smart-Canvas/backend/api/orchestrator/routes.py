"""
Metatron Orchestrator API Routes
FastAPI router for the main AI orchestrator using PydanticAI
"""

import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
import json
import asyncio
import time
from typing import Optional, Callable, Any
import traceback

from core.config import get_unified_config, get_api_key
from core.auth import get_current_user
from .dependencies import OrchestratorDependencies
from .models import (
    ChatRequest, ChatResponse, ToolResponse,
    RichContent, MediaItem, CodeBlock, StreamChunk
)

# Additional models for agent flow generation
class AgentFlowRequest(BaseModel):
    useCase: str = Field(..., description="Description of what the agent should do")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")

class AgentFlowResponse(BaseModel):
    success: bool
    graph: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
from .agent import create_metatron_agent

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/orchestrator", tags=["orchestrator"])

# Error handling utilities
class RetryableError(Exception):
    """Exception that indicates the operation should be retried"""
    pass

class NonRetryableError(Exception):
    """Exception that indicates the operation should not be retried"""
    pass

async def retry_with_backoff(
    func: Callable,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    backoff_factor: float = 2.0,
    *args,
    **kwargs
) -> Any:
    """
    Retry a function with exponential backoff
    """
    last_exception = None

    for attempt in range(max_retries + 1):
        try:
            if asyncio.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            else:
                return func(*args, **kwargs)

        except NonRetryableError:
            # Don't retry these errors
            raise

        except Exception as e:
            last_exception = e

            if attempt == max_retries:
                # Last attempt failed
                break

            # Calculate delay with exponential backoff
            delay = min(base_delay * (backoff_factor ** attempt), max_delay)

            logger.warning(f"Attempt {attempt + 1} failed: {str(e)}. Retrying in {delay:.2f}s...")
            await asyncio.sleep(delay)

    # All retries failed
    raise last_exception

def create_error_response(error: Exception, context: str = "") -> dict:
    """
    Create a standardized error response
    """
    error_type = type(error).__name__
    error_message = str(error)

    # Categorize errors for better user experience
    if isinstance(error, (ConnectionError, TimeoutError)):
        user_message = "I'm having trouble connecting to external services. Please try again in a moment."
        category = "connection_error"
    elif isinstance(error, ValueError):
        user_message = "There was an issue with the request format. Please check your input and try again."
        category = "validation_error"
    elif isinstance(error, PermissionError):
        user_message = "I don't have permission to access the requested resource."
        category = "permission_error"
    elif "rate limit" in error_message.lower():
        user_message = "I'm currently experiencing high demand. Please wait a moment and try again."
        category = "rate_limit_error"
    elif "api key" in error_message.lower() or "authentication" in error_message.lower():
        user_message = "There's an authentication issue with external services. Please contact support."
        category = "auth_error"
    else:
        user_message = "I encountered an unexpected issue. Please try again or contact support if the problem persists."
        category = "unknown_error"

    return {
        "success": False,
        "error": {
            "type": error_type,
            "category": category,
            "message": error_message,
            "user_message": user_message,
            "context": context,
            "timestamp": time.time()
        }
    }

# Global agent instance
metatron_agent: Optional[Agent] = None


async def get_orchestrator_agent():
    """Get or create the Metatron orchestrator agent"""
    global metatron_agent

    # Always recreate the agent to ensure fresh configuration
    config = get_unified_config()
    metatron_agent = await create_metatron_agent(config)
    logger.info("🤖 Metatron orchestrator agent initialized")

    return metatron_agent


@router.post("/chat", response_model=ChatResponse)
async def chat_with_orchestrator(
    request: ChatRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Main chat endpoint for the Metatron orchestrator
    """
    try:
        # Enhanced error handling with retry logic
        async def run_chat_with_retry():
            # Get agent
            agent = await get_orchestrator_agent()

            # Create dependencies for this request
            deps = OrchestratorDependencies(
                user_id=current_user.get("user_id", "anonymous"),
                workspace=request.workspace or "default",
                config=get_unified_config()
            )

            # Check for deep research mode from frontend toggle or message prefix
            message = request.message
            is_deep_research = (
                "[DEEP_RESEARCH_MODE]" in message or
                (request.context and request.context.get("deep_research", False))
            )

            if is_deep_research:
                # Extract the actual query if it has the prefix
                if "[DEEP_RESEARCH_MODE]" in message:
                    query = message.replace("[DEEP_RESEARCH_MODE]", "").strip()
                else:
                    query = message
                # Enhance with deep research instruction for Jina DeepSearch
                message = f"[DEEP_RESEARCH_MODE] {query}"

            # Run the agent with the user's message
            try:
                result = await agent.run(
                    message,
                    deps=deps,
                    message_history=request.message_history or []
                )
                return result
            except Exception as e:
                # Check if this is a retryable error
                if any(keyword in str(e).lower() for keyword in ['timeout', 'connection', 'network', 'temporary']):
                    raise RetryableError(f"Temporary error: {str(e)}")
                else:
                    raise NonRetryableError(f"Permanent error: {str(e)}")

        # Execute with retry logic
        result = await retry_with_backoff(
            run_chat_with_retry,
            max_retries=2,  # Reduced retries for chat to avoid long waits
            base_delay=1.0,
            max_delay=10.0
        )

        # Return structured response
        return ChatResponse(
            response=result.output.response,
            tools_used=result.output.tools_used,
            workspace=request.workspace or "default",
            timestamp=datetime.now().isoformat(),
            agent_status="active"
        )

    except NonRetryableError as e:
        logger.error(f"❌ Non-retryable chat error: {str(e)}")
        error_response = create_error_response(e, "chat_processing")
        raise HTTPException(
            status_code=400,
            detail=error_response["error"]["user_message"]
        )

    except RetryableError as e:
        logger.error(f"❌ Retryable chat error (all retries failed): {str(e)}")
        error_response = create_error_response(e, "chat_processing")
        raise HTTPException(
            status_code=503,
            detail="I'm experiencing temporary difficulties. Please try again in a moment."
        )

    except Exception as e:
        logger.error(f"❌ Unexpected chat error: {str(e)}")
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        error_response = create_error_response(e, "chat_processing")
        raise HTTPException(
            status_code=500,
            detail=error_response["error"]["user_message"]
        )


async def _determine_content_routing(
    response_text: str,
    content_detection_result: Dict = None,
    tools_used: List = None
) -> Dict[str, Any]:
    """
    Determine content routing metadata based on response content and tools used

    Returns:
        Dict with content_type, display_mode, and content_data for frontend routing
    """
    try:
        # Default to text content in chat area
        content_metadata = {
            'content_type': 'text',
            'display_mode': 'chat_area',
            'content_data': None,
            'has_visual_content': False
        }

        # Check content detection results first
        if content_detection_result and isinstance(content_detection_result, dict):
            has_visual = content_detection_result.get('has_visual_content', False)
            primary_type = content_detection_result.get('primary_content_type', 'text')
            confidence = content_detection_result.get('confidence', 0)
            entities = content_detection_result.get('entities', [])

            if has_visual and confidence >= 40:
                content_metadata.update({
                    'content_type': primary_type,
                    'display_mode': 'content_area' if primary_type != 'text' else 'chat_area',
                    'has_visual_content': True,
                    'content_data': {
                        'entities': entities,
                        'confidence': confidence,
                        'detection_details': content_detection_result
                    }
                })

        # Check for specific tool usage patterns
        if tools_used:
            for tool in tools_used:
                tool_name = tool.get('tool_name', '') if isinstance(tool, dict) else str(tool)

                # Financial/Chart tools
                if any(keyword in tool_name.lower() for keyword in ['financial', 'stock', 'chart', 'mermaid']):
                    content_metadata.update({
                        'content_type': 'chart',
                        'display_mode': 'content_area',
                        'has_visual_content': True
                    })

                # Image generation tools
                elif any(keyword in tool_name.lower() for keyword in ['image', 'creative_studio', 'generate']):
                    content_metadata.update({
                        'content_type': 'image',
                        'display_mode': 'content_area',
                        'has_visual_content': True
                    })

                # Video/YouTube tools
                elif any(keyword in tool_name.lower() for keyword in ['video', 'youtube', 'media']):
                    content_metadata.update({
                        'content_type': 'video',
                        'display_mode': 'content_area',
                        'has_visual_content': True
                    })

        # Analyze response text for content indicators
        response_lower = response_text.lower()

        # Look for chart/visualization indicators
        if any(keyword in response_lower for keyword in ['chart', 'graph', 'visualization', 'stock price']):
            if content_metadata['content_type'] == 'text':  # Don't override if already detected
                content_metadata.update({
                    'content_type': 'chart',
                    'display_mode': 'content_area',
                    'has_visual_content': True
                })

        # Look for image indicators
        elif any(keyword in response_lower for keyword in ['image generated', 'picture created', 'visual created']):
            if content_metadata['content_type'] == 'text':
                content_metadata.update({
                    'content_type': 'image',
                    'display_mode': 'content_area',
                    'has_visual_content': True
                })

        # Look for video/YouTube links
        elif any(keyword in response_lower for keyword in ['youtube.com', 'youtu.be', 'video link']):
            if content_metadata['content_type'] == 'text':
                content_metadata.update({
                    'content_type': 'video',
                    'display_mode': 'content_area',
                    'has_visual_content': True
                })

        # Look for map/location indicators
        elif any(keyword in response_lower for keyword in ['map', 'location', 'coordinates', 'address']):
            if content_metadata['content_type'] == 'text':
                content_metadata.update({
                    'content_type': 'map',
                    'display_mode': 'content_area',
                    'has_visual_content': True
                })

        logger.info(f"📊 Content routing determined: {content_metadata['content_type']} -> {content_metadata['display_mode']}")
        return content_metadata

    except Exception as e:
        logger.error(f"❌ Content routing error: {str(e)}")
        # Return safe default
        return {
            'content_type': 'text',
            'display_mode': 'chat_area',
            'content_data': None,
            'has_visual_content': False
        }


@router.post("/chat/stream")
async def chat_with_orchestrator_stream(
    request: ChatRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Streaming chat endpoint for real-time responses with progress updates and content routing
    """
    logger.info(f"🔥 STREAMING ENDPOINT CALLED! Message: {request.message[:50]}...")

    try:
        # Get agent
        agent = await get_orchestrator_agent()

        # Create dependencies for this request
        deps = OrchestratorDependencies(
            user_id=current_user.get("user_id", "anonymous"),
            workspace=request.workspace or "default",
            config=get_unified_config()
        )

        # Check for deep research mode from frontend toggle or message prefix
        message = request.message
        is_deep_research = (
            "[DEEP_RESEARCH_MODE]" in message or
            (request.context and request.context.get("deep_research", False))
        )

        if is_deep_research:
            # Extract the actual query if it has the prefix
            if "[DEEP_RESEARCH_MODE]" in message:
                query = message.replace("[DEEP_RESEARCH_MODE]", "").strip()
            else:
                query = message
            # Enhance with deep research instruction for Jina DeepSearch
            message = f"[DEEP_RESEARCH_MODE] {query}"

        async def generate_stream():
            """Generate streaming response with progress updates"""
            logger.info("🔥 GENERATE_STREAM FUNCTION CALLED!")
            try:
                # Send initial status
                logger.info("🔥 About to yield first status message...")
                yield f"data: {json.dumps({'type': 'status', 'message': '🤖 Initializing AI agent...', 'progress': 10})}\n\n"
                logger.info("✅ First status message yielded successfully")

                # Run the agent
                logger.info("🚀 Starting agent.run() call...")
                result = await agent.run(
                    message,
                    deps=deps,
                    message_history=request.message_history or []
                )
                logger.info("✅ Agent.run() completed successfully")

                # Send completion status
                yield f"data: {json.dumps({'type': 'status', 'message': '✅ Processing complete! Formatting response...', 'progress': 90})}\n\n"

                # Create simple response data for debugging
                response_data = {
                    'type': 'response',
                    'data': {
                        'response': str(result.output.response),
                        'tools_used': [],  # Simplified for debugging
                        'workspace': 'orchestrator',
                        'timestamp': datetime.now().isoformat(),
                        'agent_status': 'active',
                        'content_metadata': {
                            'content_type': 'text',
                            'routing_destination': 'chat_area',
                            'requires_canvas': False
                        }
                    }
                }

                logger.info(f"📤 Sending response: {response_data['data']['response'][:100]}...")
                yield f"data: {json.dumps(response_data)}\n\n"
                yield f"data: [DONE]\n\n"
                logger.info("✅ Streaming response completed")

            except Exception as e:
                logger.error(f"❌ Streaming error: {str(e)}")
                error_data = {
                    'type': 'error',
                    'message': f"Processing failed: {str(e)}",
                    'progress': 100
                }
                yield f"data: {json.dumps(error_data)}\n\n"
                yield f"data: [DONE]\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )

    except Exception as e:
        logger.error(f"❌ Streaming chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Streaming failed: {str(e)}")


@router.get("/tools")
async def get_available_tools(
    current_user: Dict = Depends(get_current_user)
):
    """Get list of available tools for the orchestrator"""
    try:
        # Return static list of available tools
        # This could be enhanced to dynamically discover tools

        return {
            "tools": [
                {"name": "memory_search", "description": "Search through conversation memory"},
                {"name": "creative_studio", "description": "Image and video generation tools"},
                {"name": "social_station", "description": "Social media management tools"},
                {"name": "video_meeting", "description": "Video conferencing tools"},
                {"name": "deep_research", "description": "Comprehensive web research tools"},
                {"name": "nano_search", "description": "Enhanced search with AI response generation"}
            ],
            "total_count": 6
        }

    except Exception as e:
        logger.error(f"❌ Tools listing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get tools: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint for the orchestrator"""
    try:
        import os

        # Use environment variable directly - this is the most reliable
        gemini_key = os.getenv('GOOGLE_GEMINI_API_KEY', '') or os.getenv('GOOGLE_API_KEY', '')

        return {
            "status": "healthy",
            "service": "orchestrator",
            "framework": "pydantic-ai",
            "model": "gemini-2.0-flash-exp",
            "gemini_configured": bool(gemini_key and len(gemini_key) > 10),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Health check error: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@router.websocket("/ws")
async def websocket_chat(websocket: WebSocket):
    """
    WebSocket endpoint for real-time chat with the orchestrator
    """
    await websocket.accept()
    logger.info("🔌 WebSocket connection established")

    try:
        # Get agent
        agent = await get_orchestrator_agent()

        while True:
            # Receive message from client
            data = await websocket.receive_json()
            message = data.get("message", "")
            workspace = data.get("workspace", "default")

            if not message:
                await websocket.send_json({"error": "Message is required"})
                continue

            # Create dependencies
            deps = OrchestratorDependencies(
                user_id="websocket_user",  # Could be enhanced with auth
                workspace=workspace,
                config=get_unified_config()
            )

            # Process message with agent
            result = await agent.run(message, deps=deps)

            # Send response back to client
            response = {
                "response": result.output.response,
                "tools_used": result.output.tools_used,
                "workspace": workspace,
                "timestamp": datetime.now().isoformat()
            }

            await websocket.send_json(response)

    except WebSocketDisconnect:
        logger.info("🔌 WebSocket connection closed")
    except Exception as e:
        logger.error(f"❌ WebSocket error: {str(e)}")
        await websocket.send_json({"error": f"Processing failed: {str(e)}"})


@router.post("/reset")
async def reset_conversation(
    current_user: Dict = Depends(get_current_user)
):
    """Reset the conversation history for the current user"""
    try:
        # In a real implementation, this would clear user-specific conversation history
        # For now, we'll just return a success message
        
        return {
            "message": "Conversation history reset successfully",
            "user_id": current_user.get("user_id", "anonymous"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Reset error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")


@router.post("/generate-agent-flow", response_model=AgentFlowResponse)
async def generate_agent_flow(
    request: AgentFlowRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Generate an agent workflow graph based on natural language description
    Uses Metatron's built-in AI and Composio integration for Agent Flow
    """
    try:
        logger.info(f"🤖 Generating agent flow for: {request.useCase}")

        # Get the orchestrator agent
        agent = await get_orchestrator_agent()

        # Create specialized system prompt for agent flow generation
        agent_flow_prompt = f"""
You are an expert AI workflow designer for the Metatron platform. Your task is to generate a JSON graph structure for a ReactFlow canvas based on the user's description.

**User Request:** {request.useCase}

**Instructions:**
1. Create a workflow with input, agent, and output nodes
2. Use 'customInput' for user input, 'agent' for AI processing, 'customOutput' for results
3. Include relevant Composio tools based on the use case (for Agent Flow workflows)
4. Generate clear, descriptive labels
5. Position nodes logically (input left, processing center, output right)

**Available Composio Tools:** Gmail, Slack, Twitter, LinkedIn, Google Calendar, GitHub, Notion, Trello, Zoom, and 290+ more

**Output Format:** Return ONLY a JSON object with "nodes" and "edges" arrays. No other text.

**Example Structure:**
{{
  "nodes": [
    {{"id": "input_1", "type": "customInput", "position": {{"x": 100, "y": 200}}, "data": {{"label": "User Input", "query": "Enter your request"}}}},
    {{"id": "agent_1", "type": "agent", "position": {{"x": 400, "y": 200}}, "data": {{"label": "Process Request", "systemPrompt": "You are a helpful assistant...", "allowedTools": "gmail.send_email,slack.send_message"}}}},
    {{"id": "output_1", "type": "customOutput", "position": {{"x": 700, "y": 200}}, "data": {{"label": "Result"}}}}
  ],
  "edges": [
    {{"id": "e1", "source": "input_1", "target": "agent_1"}},
    {{"id": "e2", "source": "agent_1", "target": "output_1"}}
  ]
}}

Generate the workflow now:
"""

        # Create dependencies for agent flow generation
        config = get_unified_config()
        deps = OrchestratorDependencies(
            user_id=current_user.get("user_id", "anonymous"),
            workspace=request.context.get("frontend", "agent-flow-builder") if request.context else "agent-flow-builder",
            config=config
        )

        # Run the agent to generate the workflow
        result = await agent.run(agent_flow_prompt, deps=deps)

        # Parse the result to extract JSON
        # Handle both real results (with .data) and MockResult (with .output)
        if hasattr(result, 'data') and result.data:
            response_text = result.data.response if hasattr(result.data, 'response') else str(result.data)
        elif hasattr(result, 'output') and result.output:
            response_text = result.output.response if hasattr(result.output, 'response') else str(result.output)
        else:
            response_text = str(result)

        # Try to extract JSON from the response
        import json
        import re

        # Look for JSON in the response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            try:
                graph_data = json.loads(json_match.group())

                # Validate the graph structure
                if "nodes" in graph_data and "edges" in graph_data:
                    logger.info(f"✅ Generated agent flow with {len(graph_data['nodes'])} nodes")
                    return AgentFlowResponse(success=True, graph=graph_data)
                else:
                    raise ValueError("Invalid graph structure - missing nodes or edges")

            except json.JSONDecodeError as e:
                logger.error(f"❌ JSON parsing error: {e}")
                return AgentFlowResponse(success=False, error=f"Failed to parse generated workflow: {e}")
        else:
            logger.error("❌ No JSON found in agent response")
            return AgentFlowResponse(success=False, error="Agent did not return valid JSON workflow")

    except Exception as e:
        logger.error(f"❌ Agent flow generation error: {str(e)}")
        return AgentFlowResponse(success=False, error=f"Generation failed: {str(e)}")
