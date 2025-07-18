"""
Enhanced Pydantic models for the Orchestrator API using PydanticAI patterns
"""

from typing import List, Optional, Dict, Any, Union, Literal, Generic, TypeVar
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

# Type variable for generic tool outputs
T = TypeVar('T')


class ChatMessage(BaseModel):
    """Individual chat message"""
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: Optional[str] = Field(None, description="Message timestamp")


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    message: str = Field(..., description="User message to process")
    workspace: Optional[str] = Field("default", description="Workspace context")
    message_history: Optional[List[ChatMessage]] = Field(None, description="Previous conversation history")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")


class ToolUsage(BaseModel):
    """Information about a tool that was used"""
    name: str = Field(..., description="Tool name")
    description: str = Field(..., description="Tool description")
    input: Optional[Dict[str, Any]] = Field(None, description="Tool input parameters")
    output: Optional[Any] = Field(None, description="Tool output")


# 🎬 ENHANCED RICH MEDIA MODELS

class MediaType(str, Enum):
    """Supported media types"""
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    DOCUMENT = "document"
    FILE = "file"
    CODE = "code"


class MediaItem(BaseModel):
    """Individual media item"""
    type: MediaType = Field(..., description="Type of media")
    url: str = Field(..., description="Media URL or path")
    title: Optional[str] = Field(None, description="Media title")
    description: Optional[str] = Field(None, description="Media description")
    thumbnail: Optional[str] = Field(None, description="Thumbnail URL")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class CodeBlock(BaseModel):
    """Code block with syntax highlighting"""
    language: str = Field(..., description="Programming language")
    code: str = Field(..., description="Code content")
    title: Optional[str] = Field(None, description="Code block title")
    filename: Optional[str] = Field(None, description="Associated filename")
    line_numbers: bool = Field(True, description="Show line numbers")


class InteractiveElement(BaseModel):
    """Interactive UI element"""
    type: Literal["button", "form", "poll", "reaction"] = Field(..., description="Element type")
    id: str = Field(..., description="Unique element ID")
    label: str = Field(..., description="Element label")
    action: Optional[str] = Field(None, description="Action to perform")
    options: Optional[List[str]] = Field(None, description="Available options")


class RichContent(BaseModel):
    """Rich content container"""
    text: str = Field(..., description="Main text content")
    media: List[MediaItem] = Field(default_factory=list, description="Media items")
    code_blocks: List[CodeBlock] = Field(default_factory=list, description="Code blocks")
    interactive_elements: List[InteractiveElement] = Field(default_factory=list, description="Interactive elements")
    formatting: Optional[Dict[str, Any]] = Field(None, description="Text formatting options")


class OrchestratorOutput(BaseModel):
    """Enhanced structured output from the orchestrator agent"""
    response: str = Field(..., description="Main response to the user")
    rich_content: Optional[RichContent] = Field(None, description="Rich media content")
    tools_used: List[ToolUsage] = Field(default_factory=list, description="Tools that were used")
    confidence: Optional[float] = Field(None, description="Confidence score", ge=0, le=1)
    reasoning: Optional[str] = Field(None, description="Agent's reasoning process")
    content_type: Literal["text", "rich", "interactive"] = Field("text", description="Response content type")
    requires_canvas: bool = Field(False, description="Whether response should open in canvas")
    streaming_enabled: bool = Field(False, description="Whether response supports streaming")


# 🌊 STREAMING MODELS

class StreamChunk(BaseModel):
    """Individual streaming chunk"""
    type: Literal["text", "media", "tool", "status", "complete"] = Field(..., description="Chunk type")
    content: str = Field(..., description="Chunk content")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Chunk metadata")
    timestamp: datetime = Field(default_factory=datetime.now, description="Chunk timestamp")


class StreamingResponse(BaseModel):
    """Streaming response container"""
    chunks: List[StreamChunk] = Field(default_factory=list, description="Response chunks")
    is_complete: bool = Field(False, description="Whether streaming is complete")
    total_chunks: Optional[int] = Field(None, description="Expected total chunks")


# 🛠️ COMMON TOOL MODELS

class SearchResult(BaseModel):
    """Search result item"""
    title: str = Field(..., description="Result title")
    url: str = Field(..., description="Result URL")
    snippet: str = Field(..., description="Result snippet")
    source: str = Field(..., description="Search source")
    relevance_score: Optional[float] = Field(None, description="Relevance score")


class WebSearchOutput(BaseModel):
    """Web search tool output"""
    query: str = Field(..., description="Search query")
    results: List[SearchResult] = Field(..., description="Search results")
    total_results: int = Field(..., description="Total number of results")
    search_time: float = Field(..., description="Search execution time")


class FileProcessingOutput(BaseModel):
    """File processing tool output"""
    filename: str = Field(..., description="Processed filename")
    file_type: str = Field(..., description="File type")
    content: str = Field(..., description="Extracted content")
    metadata: Dict[str, Any] = Field(..., description="File metadata")
    processing_time: float = Field(..., description="Processing time")


class ChatResponse(BaseModel):
    """Enhanced response model for chat endpoint"""
    response: str = Field(..., description="Agent response")
    rich_content: Optional[RichContent] = Field(None, description="Rich media content")
    tools_used: List[ToolUsage] = Field(default_factory=list, description="Tools used in processing")
    workspace: str = Field(..., description="Workspace context")
    timestamp: str = Field(..., description="Response timestamp")
    agent_status: str = Field(..., description="Agent status")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")
    content_type: Literal["text", "rich", "interactive"] = Field("text", description="Response content type")
    requires_canvas: bool = Field(False, description="Whether response should open in canvas")
    streaming_chunks: Optional[List[StreamChunk]] = Field(None, description="Streaming chunks if applicable")


class ToolResponse(BaseModel):
    """Response from a tool execution"""
    success: bool = Field(..., description="Whether tool execution was successful")
    result: Any = Field(..., description="Tool execution result")
    error: Optional[str] = Field(None, description="Error message if failed")
    execution_time: Optional[float] = Field(None, description="Execution time in seconds")


class WorkspaceInfo(BaseModel):
    """Information about a workspace"""
    name: str = Field(..., description="Workspace name")
    description: Optional[str] = Field(None, description="Workspace description")
    tools_available: List[str] = Field(default_factory=list, description="Available tools")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")


# 🚀 ENHANCED PYDANTIC AI TOOL MODELS

class ToolExecutionMetadata(BaseModel):
    """Metadata for tool execution"""
    tool_name: str = Field(..., description="Name of the executed tool")
    execution_time: float = Field(..., description="Execution time in seconds")
    success: bool = Field(..., description="Whether execution was successful")
    retry_count: int = Field(0, description="Number of retries attempted")
    source: str = Field(..., description="Tool source/category")
    timestamp: datetime = Field(default_factory=datetime.now, description="Execution timestamp")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional execution context")


class EnhancedToolOutput(BaseModel, Generic[T]):
    """Enhanced tool output with rich metadata and context"""
    result: T = Field(..., description="Tool execution result")
    metadata: ToolExecutionMetadata = Field(..., description="Execution metadata")
    success: bool = Field(..., description="Whether tool execution was successful")
    error: Optional[str] = Field(None, description="Error message if failed")
    warnings: List[str] = Field(default_factory=list, description="Warning messages")
    suggestions: List[str] = Field(default_factory=list, description="Suggestions for improvement")


class FileOperationOutput(BaseModel):
    """Output model for file operations"""
    operation: str = Field(..., description="Type of file operation performed")
    file_path: str = Field(..., description="Path of the file")
    success: bool = Field(..., description="Whether operation was successful")
    content: Optional[str] = Field(None, description="File content (for read operations)")
    size: Optional[int] = Field(None, description="File size in bytes")
    modified_time: Optional[datetime] = Field(None, description="Last modified time")
    message: str = Field(..., description="Operation result message")


class CodeExecutionOutput(BaseModel):
    """Output model for code execution"""
    language: str = Field(..., description="Programming language")
    stdout: str = Field("", description="Standard output")
    stderr: str = Field("", description="Standard error")
    exit_code: Optional[int] = Field(None, description="Exit code")
    execution_time: float = Field(..., description="Execution time in seconds")
    memory_usage: Optional[int] = Field(None, description="Memory usage in KB")
    status: str = Field(..., description="Execution status")
    compile_output: Optional[str] = Field(None, description="Compilation output")


class DatabaseQueryOutput(BaseModel):
    """Output model for database queries"""
    query_type: str = Field(..., description="Type of database query")
    rows_affected: int = Field(..., description="Number of rows affected")
    results: List[Dict[str, Any]] = Field(default_factory=list, description="Query results")
    execution_time: float = Field(..., description="Query execution time")
    columns: List[str] = Field(default_factory=list, description="Column names")
    total_rows: int = Field(..., description="Total number of rows")


class APIResponseOutput(BaseModel):
    """Output model for API requests"""
    url: str = Field(..., description="Request URL")
    method: str = Field(..., description="HTTP method")
    status_code: int = Field(..., description="HTTP status code")
    response_data: Any = Field(..., description="Response data")
    headers: Dict[str, str] = Field(default_factory=dict, description="Response headers")
    response_time: float = Field(..., description="Response time in seconds")
    success: bool = Field(..., description="Whether request was successful")


class DataProcessingOutput(BaseModel):
    """Output model for data processing operations"""
    operation: str = Field(..., description="Type of data processing operation")
    input_format: str = Field(..., description="Input data format")
    output_format: str = Field(..., description="Output data format")
    rows_processed: int = Field(..., description="Number of rows processed")
    columns: List[str] = Field(default_factory=list, description="Column names")
    summary_stats: Optional[Dict[str, Any]] = Field(None, description="Summary statistics")
    result_data: Any = Field(..., description="Processed data result")


class WorkflowOutput(BaseModel):
    """Output model for multi-step workflows"""
    workflow_id: str = Field(..., description="Unique workflow identifier")
    steps: List[str] = Field(..., description="List of executed steps")
    results: List[Any] = Field(..., description="Results from each step")
    total_execution_time: float = Field(..., description="Total workflow execution time")
    success: bool = Field(..., description="Whether entire workflow was successful")
    failed_step: Optional[str] = Field(None, description="Step that failed (if any)")
    final_result: Any = Field(..., description="Final workflow result")
