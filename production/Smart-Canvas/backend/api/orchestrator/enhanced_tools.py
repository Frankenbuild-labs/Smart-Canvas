"""
Enhanced tools using PydanticAI patterns and common tools
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
import json
import re
from urllib.parse import urlparse

from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from pydantic_ai.tools import Tool

from .dependencies import OrchestratorDependencies
from .models import (
    MediaItem, MediaType, CodeBlock, RichContent, 
    SearchResult, WebSearchOutput, FileProcessingOutput,
    StreamChunk, InteractiveElement
)

logger = logging.getLogger(__name__)


# 🎬 RICH MEDIA DETECTION AND PROCESSING

class MediaDetector:
    """Detect and classify media content in text"""
    
    @staticmethod
    def detect_media_urls(text: str) -> List[MediaItem]:
        """Detect various media URLs in text"""
        media_items = []
        
        # Image patterns
        image_patterns = [
            r'https?://[^\s]+\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)(\?[^\s]*)?',
            r'data:image/[^;]+;base64,[A-Za-z0-9+/=]+',
            r'!\[([^\]]*)\]\(([^)]+)\)'  # Markdown images
        ]
        
        # Video patterns
        video_patterns = [
            r'(?:https?://)?(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})',
            r'(?:https?://)?(?:www\.)?vimeo\.com/(\d+)',
            r'https?://[^\s]+\.(mp4|webm|ogg|avi|mov)(\?[^\s]*)?'
        ]
        
        # Audio patterns
        audio_patterns = [
            r'https?://[^\s]+\.(mp3|wav|ogg|m4a|aac)(\?[^\s]*)?'
        ]
        
        # Document patterns
        document_patterns = [
            r'https?://[^\s]+\.pdf(\?[^\s]*)?',
            r'https?://[^\s]+\.(doc|docx|xls|xlsx|ppt|pptx)(\?[^\s]*)?'
        ]
        
        # Process each pattern type
        for pattern in image_patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                if match.group().startswith('!['):
                    # Markdown format
                    alt_text = match.group(1) if len(match.groups()) > 0 else "Image"
                    url = match.group(2) if len(match.groups()) > 1 else match.group()
                else:
                    url = match.group()
                    alt_text = "Image"
                
                media_items.append(MediaItem(
                    type=MediaType.IMAGE,
                    url=url,
                    title=alt_text,
                    description=f"Image: {alt_text}"
                ))
        
        for pattern in video_patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                url = match.group()
                if 'youtube.com' in url or 'youtu.be' in url:
                    video_id = match.group(1) if match.groups() else None
                    media_items.append(MediaItem(
                        type=MediaType.VIDEO,
                        url=url,
                        title="YouTube Video",
                        thumbnail=f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg" if video_id else None
                    ))
                elif 'vimeo.com' in url:
                    media_items.append(MediaItem(
                        type=MediaType.VIDEO,
                        url=url,
                        title="Vimeo Video"
                    ))
                else:
                    media_items.append(MediaItem(
                        type=MediaType.VIDEO,
                        url=url,
                        title="Video File"
                    ))
        
        for pattern in audio_patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                media_items.append(MediaItem(
                    type=MediaType.AUDIO,
                    url=match.group(),
                    title="Audio File"
                ))
        
        for pattern in document_patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                url = match.group()
                if url.endswith('.pdf'):
                    doc_type = "PDF Document"
                else:
                    ext = url.split('.')[-1].upper()
                    doc_type = f"{ext} Document"
                
                media_items.append(MediaItem(
                    type=MediaType.DOCUMENT,
                    url=url,
                    title=doc_type
                ))
        
        return media_items
    
    @staticmethod
    def detect_code_blocks(text: str) -> List[CodeBlock]:
        """Detect code blocks in markdown text"""
        code_blocks = []
        
        # Detect fenced code blocks
        pattern = r'```(\w+)?\n(.*?)\n```'
        for match in re.finditer(pattern, text, re.DOTALL):
            language = match.group(1) or "text"
            code = match.group(2)
            
            code_blocks.append(CodeBlock(
                language=language,
                code=code,
                title=f"{language.title()} Code" if language != "text" else "Code",
                line_numbers=True
            ))
        
        return code_blocks


# 🛠️ ENHANCED TOOL FUNCTIONS

async def enhanced_content_analysis(
    deps: OrchestratorDependencies,
    text: str,
    analyze_media: bool = True,
    analyze_code: bool = True
) -> RichContent:
    """Analyze content and extract rich media elements"""
    
    try:
        media_items = []
        code_blocks = []
        interactive_elements = []
        
        if analyze_media:
            media_items = MediaDetector.detect_media_urls(text)
            logger.info(f"✅ Detected {len(media_items)} media items")
        
        if analyze_code:
            code_blocks = MediaDetector.detect_code_blocks(text)
            logger.info(f"✅ Detected {len(code_blocks)} code blocks")
        
        # Determine if canvas is needed
        requires_canvas = len(media_items) > 0 or len(code_blocks) > 0
        
        # Create rich content
        rich_content = RichContent(
            text=text,
            media=media_items,
            code_blocks=code_blocks,
            interactive_elements=interactive_elements,
            formatting={"requires_canvas": requires_canvas}
        )
        
        return rich_content
        
    except Exception as e:
        logger.error(f"❌ Content analysis error: {str(e)}")
        # Return basic content on error
        return RichContent(
            text=text,
            media=[],
            code_blocks=[],
            interactive_elements=[]
        )


async def enhanced_web_search(
    deps: OrchestratorDependencies,
    query: str,
    max_results: int = 5,
    include_media: bool = True
) -> WebSearchOutput:
    """Enhanced web search with media detection"""
    
    try:
        # Use existing nano search tool
        from .tools.nano_search_tool import nano_search_tool
        
        start_time = datetime.now()
        search_result = await nano_search_tool(deps, query, "standard")
        end_time = datetime.now()
        
        # Parse search results (this would need to be enhanced based on actual nano_search_tool output)
        results = []
        
        # For now, create a basic result structure
        # In a real implementation, you'd parse the actual search results
        results.append(SearchResult(
            title=f"Search results for: {query}",
            url="https://example.com",
            snippet=search_result[:200] + "..." if len(search_result) > 200 else search_result,
            source="nano_search",
            relevance_score=0.9
        ))
        
        return WebSearchOutput(
            query=query,
            results=results,
            total_results=len(results),
            search_time=(end_time - start_time).total_seconds()
        )
        
    except Exception as e:
        logger.error(f"❌ Enhanced web search error: {str(e)}")
        return WebSearchOutput(
            query=query,
            results=[],
            total_results=0,
            search_time=0.0
        )


# 🌊 STREAMING UTILITIES

class StreamingProcessor:
    """Process responses for streaming"""
    
    @staticmethod
    def create_text_chunk(content: str, metadata: Optional[Dict] = None) -> StreamChunk:
        """Create a text streaming chunk"""
        return StreamChunk(
            type="text",
            content=content,
            metadata=metadata or {}
        )
    
    @staticmethod
    def create_media_chunk(media_item: MediaItem) -> StreamChunk:
        """Create a media streaming chunk"""
        return StreamChunk(
            type="media",
            content=media_item.url,
            metadata={
                "media_type": media_item.type.value,
                "title": media_item.title,
                "description": media_item.description
            }
        )
    
    @staticmethod
    def create_status_chunk(message: str, progress: Optional[int] = None) -> StreamChunk:
        """Create a status streaming chunk"""
        return StreamChunk(
            type="status",
            content=message,
            metadata={"progress": progress} if progress else {}
        )
    
    @staticmethod
    def create_complete_chunk() -> StreamChunk:
        """Create a completion streaming chunk"""
        return StreamChunk(
            type="complete",
            content="Stream complete",
            metadata={}
        )
