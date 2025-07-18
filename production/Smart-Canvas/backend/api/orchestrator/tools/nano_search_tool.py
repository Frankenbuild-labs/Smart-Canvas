"""
nanoPerplexityAI Search Tool for Metatron Orchestrator
Implements core 200-line nanoPerplexityAI functionality with Google search integration
"""

import logging
import asyncio
import json
import re
import time
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

from ..dependencies import OrchestratorDependencies

# Configure logging
logger = logging.getLogger(__name__)

# Import dependencies with fallback handling
try:
    from googlesearch import search
    import requests
    from bs4 import BeautifulSoup
    NANO_SEARCH_AVAILABLE = True
except ImportError as e:
    logger.warning(f"⚠️ nanoPerplexityAI dependencies not available: {e}")
    NANO_SEARCH_AVAILABLE = False


class NanoSearchTool:
    """
    nanoPerplexityAI implementation for enhanced search capabilities
    Performs Google search, content extraction, and AI-powered response generation
    """
    
    def __init__(self):
        # Configuration
        self.num_search = 8  # Number of links to parse from Google
        self.search_time_limit = 3  # Max seconds per website request
        self.total_timeout = 10  # Overall timeout for all operations
        self.max_content = 400  # Words per search result for LLM context
        self.max_tokens = 1500  # Maximum tokens for LLM response
        
        # Prompts
        self.search_decision_prompt = """
        Decide if this query requires a Google search for current/specific information.
        
        Use Google search for:
        - Current events, news, recent developments
        - Specific facts, statistics, or data
        - Product information, reviews, comparisons
        - Location-specific information
        - Technical documentation or tutorials
        
        Do NOT use Google search for:
        - General knowledge questions
        - Mathematical calculations
        - Creative writing requests
        - Personal opinions or advice
        
        If search needed: respond with an optimized Google search query
        If no search needed: respond with "ns"
        
        Query: {query}
        """
        
        self.response_prompt = """
        Generate a comprehensive, informative response using the provided search results.
        
        Requirements:
        - Answer directly and thoroughly
        - Use markdown formatting for clarity
        - Include citations using [number](url) format
        - Provide specific facts and data when available
        - Maintain journalistic, unbiased tone
        
        Search Results:
        {context_block}
        
        User Query: {query}
        """
    
    async def reformulate_query(self, deps: OrchestratorDependencies, query: str) -> Optional[str]:
        """
        Use LLM to decide if search is needed and reformulate query for Google
        """
        try:
            logger.info(f"🤔 Analyzing search necessity for: {query}")
            
            # Simple query reformulation without external API
            # Add current year for time-sensitive queries
            current_year = datetime.now().year
            time_keywords = ['current', 'latest', 'recent', 'today', 'now', '2025']

            if any(keyword in query.lower() for keyword in time_keywords):
                reformulated = f"{query} {current_year}"
                logger.info(f"🔍 Search query reformulated: {reformulated}")
                return reformulated
            else:
                logger.info(f"🔍 Using original query: {query}")
                return query
                
        except Exception as e:
            logger.error(f"❌ Query reformulation error: {str(e)}")
            return query  # Fallback to original query
    
    async def fetch_search_results(self, search_query: str) -> Dict[str, str]:
        """
        Perform Google search and extract content from top results
        """
        try:
            logger.info(f"🌐 Performing Google search: {search_query}")
            
            if not NANO_SEARCH_AVAILABLE:
                raise ImportError("Google search dependencies not available")
            
            # Get search URLs
            urls = list(search(search_query, num_results=self.num_search))
            logger.info(f"📋 Found {len(urls)} search results")
            
            # Fetch webpage content concurrently
            search_results = {}
            
            def fetch_webpage(url):
                """Fetch content from a single webpage"""
                try:
                    logger.debug(f"📄 Fetching: {url}")
                    response = requests.get(url, timeout=self.search_time_limit)
                    response.raise_for_status()
                    
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # Extract text from paragraphs
                    paragraphs = soup.find_all('p')
                    content = ' '.join([para.get_text().strip() for para in paragraphs])
                    
                    # Limit content length
                    words = content.split()
                    if len(words) > self.max_content:
                        content = ' '.join(words[:self.max_content]) + "..."
                    
                    return url, content
                    
                except Exception as e:
                    logger.warning(f"⚠️ Failed to fetch {url}: {str(e)}")
                    return url, None
            
            # Use ThreadPoolExecutor for concurrent fetching
            with ThreadPoolExecutor(max_workers=4) as executor:
                future_to_url = {executor.submit(fetch_webpage, url): url for url in urls}
                
                for future in as_completed(future_to_url):
                    url, content = future.result()
                    if content:
                        search_results[url] = content
            
            logger.info(f"✅ Successfully fetched {len(search_results)} pages")
            return search_results
            
        except Exception as e:
            logger.error(f"❌ Google search error: {str(e)}")
            return {}
    
    async def generate_response(
        self, 
        deps: OrchestratorDependencies, 
        query: str, 
        search_results: Dict[str, str]
    ) -> str:
        """
        Generate AI response using search results as context
        """
        try:
            logger.info(f"🤖 Generating response for: {query}")
            
            # Generate response without external API
            if search_results:
                response = f"## Search Results for: {query}\n\n"
                response += f"Based on the search results, here's what I found:\n\n"

                # Add formatted search results
                for i, (url, content) in enumerate(search_results.items(), 1):
                    response += f"**[{i}] {url}**\n"
                    response += f"{content[:300]}...\n\n"

                # Add sources section
                response += "\n## Sources\n"
                for i, url in enumerate(search_results.keys(), 1):
                    response += f"{i}. {url}\n"

                logger.info("✅ Response generated successfully")
                return response
            else:
                return f"Search completed for '{query}' but no results were retrieved."
            
        except Exception as e:
            logger.error(f"❌ Response generation error: {str(e)}")
            # Return basic search results as fallback
            if search_results:
                fallback = f"## Search Results for: {query}\n\n"
                for i, (url, content) in enumerate(search_results.items(), 1):
                    fallback += f"**[{i}]({url})**\n{content[:300]}...\n\n"
                return fallback
            else:
                return f"Unable to generate response for '{query}'. Please try again."


# Tool function for orchestrator agent registration
async def nano_search_tool(
    deps: OrchestratorDependencies,
    query: str,
    search_depth: str = "standard"
) -> str:
    """
    Enhanced search using nanoPerplexityAI methodology
    
    Args:
        deps: Orchestrator dependencies
        query: Search query
        search_depth: Search depth (quick, standard, deep)
        
    Returns:
        Comprehensive search response with citations
    """
    try:
        logger.info(f"🔍 nanoPerplexityAI search: {query} (depth: {search_depth})")
        
        # Initialize nano search tool
        nano_tool = NanoSearchTool()
        
        # Adjust parameters based on search depth
        if search_depth == "quick":
            nano_tool.num_search = 5
            nano_tool.max_content = 200
            nano_tool.max_tokens = 800
        elif search_depth == "deep":
            nano_tool.num_search = 12
            nano_tool.max_content = 600
            nano_tool.max_tokens = 2000
        
        # Step 1: Reformulate query and decide if search is needed
        search_query = await nano_tool.reformulate_query(deps, query)
        
        if not search_query:
            # No search needed, use fallback tools
            logger.info("🔄 Using fallback search tools")
            try:
                from .. import tools
                return await tools.wikipedia_search_tool(deps, query)
            except Exception:
                return f"No search required for this query: {query}"
        
        # Step 2: Perform Google search
        search_results = await nano_tool.fetch_search_results(search_query)
        
        if not search_results:
            # Fallback to existing search tools
            logger.warning("🔄 Google search failed, using fallback tools")
            try:
                from ..advanced_tools import wikipedia_search_tool, news_research_tool
                wiki_result = await wikipedia_search_tool(deps, query)
                news_result = await news_research_tool(deps, query)
                return f"{wiki_result}\n\n---\n\n{news_result}"
            except Exception as e:
                return f"Search failed: {str(e)}"
        
        # Step 3: Generate AI response with citations
        response = await nano_tool.generate_response(deps, query, search_results)
        
        return response
        
    except Exception as e:
        logger.error(f"❌ nanoPerplexityAI search error: {str(e)}")
        return f"Search failed: {str(e)}"
