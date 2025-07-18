"""
Metatron Orchestrator Agent using PydanticAI
Main AI agent for the Metatron platform
"""

import os
import logging
from typing import Dict, Any, List
from datetime import datetime

from pydantic_ai import Agent, RunContext, ModelRetry
from pydantic_ai.tools import ToolReturnPart
from pydantic import BaseModel, Field
import time
import asyncio

from .dependencies import OrchestratorDependencies
from .models import (
    OrchestratorOutput, ToolUsage, RichContent, MediaItem,
    CodeBlock, StreamChunk, InteractiveElement, EnhancedToolOutput,
    ToolExecutionMetadata, FileOperationOutput, CodeExecutionOutput,
    DatabaseQueryOutput, APIResponseOutput, DataProcessingOutput, WorkflowOutput
)
from .tools.content_detection_tool import content_detection_tool
from .tools.nano_search_tool import nano_search_tool
# Import the renamed tools file to avoid conflict with tools/ package
from . import orchestrator_tools_main as orchestrator_tools
from . import advanced_tools
from .enhanced_tools import (
    enhanced_content_analysis, enhanced_web_search,
    MediaDetector, StreamingProcessor
)

# Configure logging
logger = logging.getLogger(__name__)


class MetatronAgent:
    """Wrapper class for the Metatron PydanticAI agent"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.agent = None
        
    async def initialize(self):
        """Initialize the PydanticAI agent"""
        try:
            # Set up Gemini API key
            gemini_key = self.config.get("api_keys", {}).get("google_gemini")
            if not gemini_key:
                raise ValueError("Gemini API key not found in configuration")
            
            os.environ['GOOGLE_API_KEY'] = gemini_key
            
            # Create the PydanticAI agent with latest Gemini model
            self.agent = Agent(
                'gemini-2.0-flash-exp',  # Use Gemini 2.0 Flash Experimental (most advanced available)
                deps_type=OrchestratorDependencies,
                output_type=OrchestratorOutput,
                system_prompt=self._get_system_prompt()
            )
            
            # Register tools
            self._register_tools()
            
            logger.info("✅ Metatron PydanticAI agent initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize agent: {str(e)}")
            raise
    
    def _get_system_prompt(self) -> str:
        """Get the system prompt for the agent"""
        return """# METATRON ORCHESTRATOR SYSTEM PROMPT v1.0

You are **Metatron**, the central AI orchestrator of a unified intelligence platform powered by Gemini 2.5 Pro. You coordinate multiple specialized systems and tools to provide comprehensive, intelligent assistance across diverse domains.

## 🎯 CORE IDENTITY & MISSION

**WHO YOU ARE:**
- Advanced AI orchestrator with access to specialized tools and systems
- Central intelligence hub coordinating Creative Studio, Social Station, Agent Flow, and research capabilities
- Production-ready assistant built for real-world applications and business use cases
- Powered by cutting-edge Gemini 2.5 Pro with enhanced reasoning and analysis capabilities

**YOUR MISSION:**
- Provide intelligent, contextual responses that leverage both your knowledge and specialized tools
- Orchestrate complex workflows across multiple systems when needed
- Deliver production-quality results with professional accuracy and reliability
- Adapt your approach based on user intent, complexity, and requirements

## 🧠 INTELLIGENCE-FIRST APPROACH

**PRIMARY STRATEGY: Think First, Tool Second**
1. **Analyze** the user's request for complexity, intent, and requirements
2. **Assess** whether your built-in knowledge can provide a complete, accurate response
3. **Decide** if tools are needed for real-time data, specialized processing, or enhanced capabilities
4. **Execute** with the most efficient combination of intelligence and tools

**USE YOUR KNOWLEDGE DIRECTLY FOR:**
- General knowledge, concepts, explanations
- Programming help, code examples, technical guidance
- Math calculations, analysis, problem-solving
- Historical facts, scientific information
- How-to guides, tutorials, best practices
- Creative writing, content creation
- Business advice, strategy, planning

## 🛠️ TOOL ORCHESTRATION STRATEGY

**USE TOOLS STRATEGICALLY FOR:**

**🔍 RESEARCH & INFORMATION:**
- `deep_research`: Comprehensive analysis requiring multiple sources and citations
- `nano_perplexity_search`: Enhanced web search with AI-powered synthesis
- `research_news`: Current events, breaking news, recent developments
- `search_wikipedia`: Authoritative reference information
- `search_reddit`: Community insights, discussions, user experiences

**🎨 CREATIVE & MEDIA:**
- `use_creative_studio`: Image generation, video creation, visual content
- `understand_media`: Image/video analysis, content understanding
- `analyze_youtube`: Video transcript extraction, content analysis
- `process_document`: PDF/Word/Excel processing and data extraction

**🌐 WEB & AUTOMATION:**
- `browse_web`: Web automation, data scraping, interaction
- `manage_social_media`: Social platform management and posting

**💾 MEMORY & CONTEXT:**
- `search_memory`: Access conversation history and stored information
- `detect_content_intent`: Analyze user intent for optimal routing

## 📋 RESPONSE EXCELLENCE STANDARDS

**STRUCTURE & FORMATTING:**
- Use clear headings, bullet points, and logical organization
- Employ markdown formatting for enhanced readability
- Include relevant examples, code snippets, or demonstrations
- Provide actionable insights and next steps when appropriate

**QUALITY ASSURANCE:**
- Ensure accuracy through verification and cross-referencing
- Acknowledge limitations and uncertainties honestly
- Provide alternative approaches when primary solutions aren't optimal
- Include relevant context and background information

**PROFESSIONAL TONE:**
- Maintain expertise while remaining approachable
- Adapt communication style to user's technical level
- Be concise yet comprehensive in explanations
- Show enthusiasm for helping while maintaining professionalism

## 🔒 OPERATIONAL GUIDELINES

**SAFETY & ETHICS:**
- Prioritize user safety, privacy, and data protection
- Refuse harmful, illegal, or unethical requests
- Provide balanced perspectives on controversial topics
- Respect intellectual property and attribution requirements

**RELIABILITY & ACCURACY:**
- Verify information when using multiple sources
- Clearly distinguish between factual information and analysis
- Update responses based on the most current available data
- Acknowledge when information may be outdated or uncertain

**EFFICIENCY & PERFORMANCE:**
- Choose the most efficient approach for each task
- Minimize unnecessary tool calls while maximizing value
- Provide complete responses that reduce need for follow-up
- Balance thoroughness with response time considerations

## 🚀 ADVANCED CAPABILITIES

**WORKFLOW ORCHESTRATION:**
- Chain multiple tools for complex multi-step tasks
- Synthesize information from diverse sources
- Provide comprehensive analysis with supporting evidence
- Create structured outputs with rich formatting and media

**CONTEXTUAL INTELLIGENCE:**
- Maintain conversation context across interactions
- Adapt responses based on user expertise and preferences
- Recognize patterns and provide proactive suggestions
- Learn from interaction patterns to improve assistance

**INTEGRATION MASTERY:**
- Seamlessly coordinate between different platform components
- Leverage specialized tools while maintaining unified experience
- Provide consistent quality across all interaction types
- Scale capabilities based on task complexity and requirements

## ⚡ SPECIAL ROUTING RULES

**DEEP RESEARCH MODE:**
- When [DEEP_RESEARCH_MODE] is detected: IMMEDIATELY use `deep_research` tool
- Use Jina DeepSearch API for comprehensive, production-ready analysis
- No fallbacks or alternative tools when deep research is requested

**CONTENT DETECTION:**
- Automatically analyze user intent for optimal tool selection
- Route visual content requests to appropriate media tools
- Detect workflow complexity and prepare multi-tool orchestration

---

**Remember:** You are the intelligent heart of the Metatron platform. Your role is to think deeply, act strategically, and deliver exceptional results that showcase the power of coordinated AI systems working in harmony."""

    def _create_tool_metadata(self, tool_name: str, execution_time: float, success: bool,
                             retry_count: int = 0, source: str = "orchestrator") -> ToolExecutionMetadata:
        """Create standardized tool execution metadata"""
        return ToolExecutionMetadata(
            tool_name=tool_name,
            execution_time=execution_time,
            success=success,
            retry_count=retry_count,
            source=source,
            timestamp=datetime.now()
        )

    async def _execute_with_retry(self, operation, tool_name: str, max_retries: int = 3,
                                 retry_delay: float = 1.0):
        """Execute operation with retry logic and proper error handling"""
        retry_count = 0
        last_exception = None

        while retry_count <= max_retries:
            start_time = time.time()
            try:
                result = await operation()
                execution_time = time.time() - start_time

                metadata = self._create_tool_metadata(
                    tool_name=tool_name,
                    execution_time=execution_time,
                    success=True,
                    retry_count=retry_count
                )

                return result, metadata

            except Exception as e:
                execution_time = time.time() - start_time
                last_exception = e
                retry_count += 1

                logger.warning(f"🔄 Tool {tool_name} failed (attempt {retry_count}/{max_retries + 1}): {str(e)}")

                if retry_count <= max_retries:
                    await asyncio.sleep(retry_delay * retry_count)  # Exponential backoff
                    continue
                else:
                    # Final failure - create metadata and raise ModelRetry
                    metadata = self._create_tool_metadata(
                        tool_name=tool_name,
                        execution_time=execution_time,
                        success=False,
                        retry_count=retry_count - 1
                    )

                    logger.error(f"❌ Tool {tool_name} failed after {max_retries} retries: {str(last_exception)}")
                    raise ModelRetry(f"Tool {tool_name} failed after {max_retries} retries: {str(last_exception)}")

    def _prepare_tools(self, context: Dict[str, Any]) -> List[str]:
        """Prepare and filter tools based on context"""
        available_tools = [
            "search_memory", "use_creative_studio", "manage_social_media",
            "deep_research", "browse_web", "search_wikipedia", "search_reddit",
            "research_news", "process_document", "analyze_youtube",
            "understand_media", "detect_content_intent", "nano_perplexity_search"
        ]

        # Filter tools based on context (can be enhanced with more sophisticated logic)
        workspace = context.get("workspace", "default")
        user_preferences = context.get("user_preferences", {})

        # Example filtering logic
        if workspace == "research":
            # Prioritize research tools
            return ["deep_research", "nano_perplexity_search", "search_wikipedia", "research_news"] + available_tools
        elif workspace == "creative":
            # Prioritize creative tools
            return ["use_creative_studio", "understand_media"] + available_tools

        return available_tools

    def _register_tools(self):
        """Register tools with the agent"""
        
        @self.agent.tool
        async def search_memory(
            ctx: RunContext[OrchestratorDependencies],
            query: str,
            limit: int = 5
        ) -> str:
            """Search through conversation memory and stored information."""
            return await orchestrator_tools.memory_search(ctx.deps, query, limit)
        
        @self.agent.tool
        async def use_creative_studio(
            ctx: RunContext[OrchestratorDependencies],
            task_type: str,
            description: str,
            parameters: Dict[str, Any] = None
        ) -> str:
            """Generate creative content like images, videos, or other media."""
            return await orchestrator_tools.creative_studio_tool(ctx.deps, task_type, description, parameters or {})
        
        @self.agent.tool
        async def manage_social_media(
            ctx: RunContext[OrchestratorDependencies],
            action: str,
            platform: str,
            content: str = None,
            parameters: Dict[str, Any] = None
        ) -> str:
            """Manage social media posts and interactions."""
            return await orchestrator_tools.social_station_tool(ctx.deps, action, platform, content, parameters or {})

        @self.agent.tool
        async def deep_research(
            ctx: RunContext[OrchestratorDependencies],
            query: str,
            sources: List[str] = None,
            depth: str = "standard"
        ) -> str:
            """
            Perform comprehensive web research using Jina DeepSearch API.

            This tool uses Jina's advanced AI research capabilities with iterative reasoning.
            ONLY use this tool when deep research mode is explicitly enabled by the user.

            Args:
                query: The research question or topic
                sources: Optional list of preferred domains/sources
                depth: Research depth (standard, deep, comprehensive)

            Returns:
                Comprehensive research results with sources and citations
            """
            async def research_operation():
                return await orchestrator_tools.deep_research_tool(ctx.deps, query, sources or [], depth)

            try:
                result, metadata = await self._execute_with_retry(
                    research_operation,
                    "deep_research",
                    max_retries=2
                )

                # Return enhanced result with metadata in the response
                enhanced_result = f"""🔍 **Deep Research Results**

**Query:** {query}
**Depth:** {depth}
**Execution Time:** {metadata.execution_time:.2f}s
**Sources:** {', '.join(sources) if sources else 'Auto-selected'}

---

{result}

---
*Research completed successfully with {metadata.retry_count} retries*"""

                return enhanced_result

            except ModelRetry as e:
                # Re-raise ModelRetry for PydanticAI to handle
                raise e

        @self.agent.tool
        async def browse_web(
            ctx: RunContext[OrchestratorDependencies],
            url: str,
            action: str = "navigate",
            parameters: Dict[str, Any] = None
        ) -> str:
            """Automate web browsing and interaction using Playwright."""
            return await orchestrator_tools.browser_automation_tool(ctx.deps, url, action, parameters or {})

        @self.agent.tool
        async def search_wikipedia(
            ctx: RunContext[OrchestratorDependencies],
            query: str,
            language: str = "en",
            sentences: int = 3
        ) -> str:
            """Search Wikipedia for comprehensive information."""
            return await advanced_tools.wikipedia_search_tool(ctx.deps, query, language, sentences)

        @self.agent.tool
        async def search_reddit(
            ctx: RunContext[OrchestratorDependencies],
            query: str,
            subreddit: str = None,
            sort: str = "relevance",
            limit: int = 10
        ) -> str:
            """Search Reddit for discussions and community insights."""
            return await advanced_tools.reddit_search_tool(ctx.deps, query, subreddit, sort, limit)

        @self.agent.tool
        async def research_news(
            ctx: RunContext[OrchestratorDependencies],
            query: str,
            category: str = None,
            language: str = "en",
            limit: int = 10
        ) -> str:
            """Get latest news and information on specific topics."""
            return await advanced_tools.news_research_tool(ctx.deps, query, category, language, limit)

        @self.agent.tool
        async def process_document(
            ctx: RunContext[OrchestratorDependencies],
            file_path: str,
            action: str = "extract_text",
            parameters: Dict[str, Any] = None
        ) -> str:
            """Process documents (PDF, Word, Excel) and extract information."""
            return await advanced_tools.document_processing_tool(ctx.deps, file_path, action, parameters or {})

        @self.agent.tool
        async def analyze_youtube(
            ctx: RunContext[OrchestratorDependencies],
            url: str,
            include_transcript: bool = True,
            include_metadata: bool = True
        ) -> str:
            """Analyze YouTube videos, extract transcripts and metadata."""
            return await advanced_tools.youtube_analysis_tool(ctx.deps, url, include_transcript, include_metadata)

        @self.agent.tool
        async def understand_media(
            ctx: RunContext[OrchestratorDependencies],
            media_path: str,
            media_type: str,
            analysis_type: str = "comprehensive"
        ) -> str:
            """Understand and analyze images, videos, and other media content."""
            return await advanced_tools.image_video_understanding_tool(ctx.deps, media_path, media_type, analysis_type)



        @self.agent.tool
        async def detect_content_intent(
            ctx: RunContext[OrchestratorDependencies],
            message: str,
            context: Dict[str, Any] = None
        ) -> str:
            """Analyze user messages to detect content intent for visual content routing."""
            return await content_detection_tool(ctx.deps, message, context or {})

        @self.agent.tool
        async def nano_perplexity_search(
            ctx: RunContext[OrchestratorDependencies],
            query: str,
            search_depth: str = "standard"
        ) -> str:
            """Enhanced search using nanoPerplexityAI methodology with Google search and AI response generation."""
            return await nano_search_tool(ctx.deps, query, search_depth)

        # 🎬 ENHANCED RICH MEDIA TOOLS - TEMPORARILY DISABLED FOR DEBUGGING
        # TODO: Re-enable after fixing streaming issues

        # @self.agent.tool
        # async def analyze_rich_content(...):
        #     """Temporarily disabled - causing streaming issues"""
        #     pass

        # @self.agent.tool
        # async def enhanced_search_with_media(...):
        #     """Temporarily disabled - causing streaming issues"""
        #     pass

        # Note: Composio tools are integrated in Agent Flow, not main orchestrator
        logger.info("✅ Enhanced orchestrator tools registered successfully")
    
    async def run(self, message: str, deps: OrchestratorDependencies, message_history: List = None) -> Any:
        """Run the agent with enhanced rich media processing and tool preparation"""
        if not self.agent:
            await self.initialize()

        try:
            # Prepare tools based on context
            context = {
                "workspace": deps.workspace,
                "user_id": deps.user_id,
                "message": message,
                "message_history": message_history
            }

            prepared_tools = self._prepare_tools(context)
            logger.info(f"🛠️ Prepared {len(prepared_tools)} tools for context: {deps.workspace}")

            # Add message history to context if provided
            if message_history:
                # Convert message history to PydanticAI format
                # This would need to be implemented based on PydanticAI's message history format
                pass

            # Run the agent with enhanced error handling and rate limiting protection
            start_time = time.time()

            try:
                result = await self.agent.run(message, deps=deps)
                execution_time = time.time() - start_time
                logger.info(f"✅ Agent execution completed in {execution_time:.2f}s")

            except Exception as e:
                execution_time = time.time() - start_time
                error_msg = str(e)

                # Handle rate limiting errors specifically
                if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                    logger.warning(f"⚠️ Rate limit hit after {execution_time:.2f}s: {error_msg}")

                    # Create a helpful rate limit response
                    from .models import OrchestratorOutput
                    rate_limit_output = OrchestratorOutput(
                        response="🚦 **Rate Limit Reached**\n\nI've hit the API rate limit. Please wait a moment and try again.\n\n**What happened:** The Gemini 2.5 Pro API has usage limits that help ensure fair access.\n\n**Solutions:**\n- Wait 1 minute and try again\n- Your request will work perfectly once the limit resets\n\n⏰ *Tip: Try again in about 60 seconds*",
                        confidence=1.0,
                        reasoning="Rate limit protection activated",
                        content_type="text"
                    )

                    # Create mock result for rate limit
                    class RateLimitResult:
                        def __init__(self, output):
                            self.output = output

                    return RateLimitResult(rate_limit_output)
                else:
                    # Re-raise other errors
                    raise e

            # Process response normally
            logger.info("✅ Chat response processed")

            return result

        except Exception as e:
            logger.error(f"❌ Agent run error: {str(e)}")
            # Return enhanced fallback response
            fallback_output = OrchestratorOutput(
                response=f"I apologize, but I encountered an error processing your request: {str(e)}",
                rich_content=None,
                tools_used=[],
                confidence=0.0,
                reasoning="Error occurred during processing",
                content_type="text",
                requires_canvas=False,
                streaming_enabled=False
            )

            # Create a mock result object
            class MockResult:
                def __init__(self, output):
                    self.output = output

            return MockResult(fallback_output)


# Global agent instance
_metatron_agent: MetatronAgent = None


async def create_metatron_agent(config: Dict[str, Any]) -> MetatronAgent:
    """Create and return the Metatron orchestrator agent"""
    global _metatron_agent

    # Always recreate the agent to ensure fresh configuration
    _metatron_agent = MetatronAgent(config)
    await _metatron_agent.initialize()

    return _metatron_agent


async def get_metatron_agent() -> MetatronAgent:
    """Get the global Metatron agent instance"""
    global _metatron_agent
    
    if _metatron_agent is None:
        raise RuntimeError("Metatron agent not initialized. Call create_metatron_agent first.")
    
    return _metatron_agent
