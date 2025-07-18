"""
Jina AI Service Integration
Provides access to all 7 Jina AI APIs for enhanced search and content processing
"""

import os
import asyncio
import logging
from typing import Dict, Any, List, Optional, Union
import httpx
import json
from datetime import datetime, timedelta
import time
from collections import defaultdict
import re
from urllib.parse import urlparse

# Configure logging
logger = logging.getLogger(__name__)

# Error handling classes
class JinaRetryableError(Exception):
    """Exception that indicates the Jina AI operation should be retried"""
    pass

class JinaNonRetryableError(Exception):
    """Exception that indicates the Jina AI operation should not be retried"""
    pass

async def retry_jina_request(
    func,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    backoff_factor: float = 2.0,
    *args,
    **kwargs
):
    """
    Retry Jina AI requests with exponential backoff
    """
    last_exception = None

    for attempt in range(max_retries + 1):
        try:
            return await func(*args, **kwargs)

        except JinaNonRetryableError:
            # Don't retry these errors
            raise

        except Exception as e:
            last_exception = e

            # Check if this is a retryable error
            error_str = str(e).lower()
            if any(keyword in error_str for keyword in ['timeout', 'connection', 'network', 'temporary', '429', '502', '503', '504']):
                if attempt < max_retries:
                    delay = min(base_delay * (backoff_factor ** attempt), max_delay)
                    logger.warning(f"Retrying Jina AI request in {delay}s (attempt {attempt + 1}/{max_retries}): {str(e)}")
                    await asyncio.sleep(delay)
                    continue

            # Non-retryable error or max retries reached
            raise JinaNonRetryableError(f"Jina AI request failed: {str(e)}")

    # Should never reach here, but just in case
    raise JinaNonRetryableError(f"Max retries exceeded: {str(last_exception)}")

class RateLimiter:
    """Simple rate limiter for API requests"""

    def __init__(self, max_requests: int = 100, time_window: int = 60):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = defaultdict(list)

    async def acquire(self, key: str = "default"):
        """Acquire permission to make a request"""
        now = time.time()

        # Clean old requests
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if now - req_time < self.time_window
        ]

        # Check if we can make a request
        if len(self.requests[key]) >= self.max_requests:
            # Calculate wait time
            oldest_request = min(self.requests[key])
            wait_time = self.time_window - (now - oldest_request)

            if wait_time > 0:
                logger.warning(f"Rate limit reached, waiting {wait_time:.2f}s")
                await asyncio.sleep(wait_time)

        # Record this request
        self.requests[key].append(now)

# Enhanced Output Models for Perplexity-style responses
class EnhancedCitation:
    """Citation with source information"""
    def __init__(self, number: int, title: str, url: str, snippet: str, domain: str):
        self.number = number
        self.title = title
        self.url = url
        self.snippet = snippet
        self.domain = domain

    def to_dict(self):
        return {
            'number': self.number,
            'title': self.title,
            'url': self.url,
            'snippet': self.snippet,
            'domain': self.domain
        }

class EnhancedSearchResponse:
    """Perplexity-style enhanced search response"""
    def __init__(self, query: str):
        self.query = query
        self.answer = ""
        self.citations = []
        self.sources = []
        self.related_topics = []
        self.search_time = 0.0
        self.total_sources = 0

    def add_citation(self, title: str, url: str, snippet: str):
        """Add a citation and return its number"""
        citation_num = len(self.citations) + 1
        domain = urlparse(url).netloc
        citation = EnhancedCitation(citation_num, title, url, snippet, domain)
        self.citations.append(citation)
        self.sources.append({
            'title': title,
            'url': url,
            'domain': domain
        })
        return citation_num

    def format_answer_with_citations(self, raw_content: str, sources: List[Dict]) -> str:
        """Format content with inline citations"""
        formatted_answer = raw_content

        # Add citations to relevant sentences
        for i, source in enumerate(sources[:5], 1):  # Limit to 5 sources
            citation_num = self.add_citation(
                source.get('title', 'Source'),
                source.get('url', ''),
                source.get('snippet', '')
            )

            # Insert citation markers in relevant parts of the text
            if source.get('snippet'):
                snippet_words = source['snippet'].split()[:5]
                for word in snippet_words:
                    if word.lower() in formatted_answer.lower():
                        formatted_answer = formatted_answer.replace(
                            word, f"{word} [{citation_num}]", 1
                        )
                        break

        return formatted_answer

    def to_dict(self):
        return {
            'query': self.query,
            'answer': self.answer,
            'citations': [c.to_dict() for c in self.citations],
            'sources': self.sources,
            'related_topics': self.related_topics,
            'search_time': self.search_time,
            'total_sources': self.total_sources,
            'response_type': 'enhanced_search'
        }

class JinaAIService:
    """
    Jina AI Service for comprehensive search and content processing
    
    Provides access to:
    1. Reader API (r.jina.ai) - URL content extraction
    2. Search API (s.jina.ai) - Web search optimization
    3. DeepSearch API - Research-grade AI agent
    4. Embeddings API - Multimodal embeddings
    5. Reranker API - Search result optimization
    6. Classifier API - Zero-shot classification
    7. Segmenter API - Text processing and chunking
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize Jina AI service with API key"""
        self.api_key = api_key or os.getenv('JINA_API_KEY')
        if not self.api_key:
            raise ValueError("Jina AI API key is required")
        
        # Base URLs for different Jina AI services
        self.base_urls = {
            'reader': 'https://r.jina.ai',
            'search': 'https://s.jina.ai',
            'deepsearch': 'https://s.jina.ai',  # DeepSearch uses same endpoint as search with different params
            'embeddings': 'https://api.jina.ai/v1/embeddings',
            'reranker': 'https://api.jina.ai/v1/rerank',
            'classifier': 'https://api.jina.ai/v1/classify',
            'segmenter': 'https://segment.jina.ai'  # Segmenter has its own domain
        }
        
        # Default headers for API requests
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'Metatron-Platform/1.0'
        }
        
        # HTTP client configuration
        self.timeout = httpx.Timeout(30.0, connect=10.0)

        # Rate limiting (100 requests per minute)
        self.rate_limiter = RateLimiter(max_requests=100, time_window=60)

        logger.info("Jina AI Service initialized successfully")

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        try:
            return urlparse(url).netloc
        except:
            return "Unknown"

    def _generate_related_topics(self, query: str) -> List[str]:
        """Generate related topic suggestions"""
        # Simple related topic generation based on query
        base_topics = [
            f"Latest developments in {query}",
            f"How {query} works",
            f"Benefits of {query}",
            f"Future of {query}",
            f"{query} vs alternatives"
        ]
        return base_topics[:3]  # Return top 3

    async def _create_enhanced_search_response(
        self,
        query: str,
        raw_results: Dict[str, Any],
        search_time: float = 0.0
    ) -> EnhancedSearchResponse:
        """Transform raw search results into enhanced Perplexity-style response"""
        enhanced_response = EnhancedSearchResponse(query)
        enhanced_response.search_time = search_time

        # Extract results from raw response - handle multiple possible formats
        results = []

        # Try different possible result formats from Jina AI
        if isinstance(raw_results.get('data'), list):
            results = raw_results['data']
        elif isinstance(raw_results.get('results'), list):
            results = raw_results['results']
        elif isinstance(raw_results.get('content'), str):
            # If we get raw content, create a mock result
            results = [{
                'title': f'Search Results for {query}',
                'url': 'https://search.jina.ai',
                'snippet': raw_results['content'][:200] + '...' if len(raw_results['content']) > 200 else raw_results['content']
            }]
        elif isinstance(raw_results, dict) and raw_results.get('status_code') == 200:
            # Handle direct content response
            content = raw_results.get('content', '')
            if content:
                results = [{
                    'title': f'Search Results for {query}',
                    'url': 'https://search.jina.ai',
                    'snippet': content[:300] + '...' if len(content) > 300 else content
                }]

        enhanced_response.total_sources = len(results)

        # Process each result
        processed_sources = []
        for result in results[:10]:  # Limit to 10 sources
            if isinstance(result, dict):
                title = result.get('title', 'Untitled')
                url = result.get('url', result.get('link', ''))
                snippet = result.get('snippet', result.get('description', result.get('content', '')))

                processed_sources.append({
                    'title': title,
                    'url': url,
                    'snippet': snippet,
                    'domain': self._extract_domain(url)
                })

        # Create synthesized answer with citations
        if processed_sources:
            # Generate a comprehensive answer
            answer_parts = []
            answer_parts.append(f"## {query.title()}\\n\\n")

            # Create a synthesized overview
            if len(processed_sources) >= 1:
                answer_parts.append("Based on current research and available sources:\\n\\n")

                # Add key insights from top sources with citations
                for i, source in enumerate(processed_sources[:5], 1):
                    if source['snippet']:
                        citation_num = enhanced_response.add_citation(
                            source['title'],
                            source['url'],
                            source['snippet']
                        )

                        # Clean up the snippet
                        clean_snippet = source['snippet'].strip()
                        if len(clean_snippet) > 150:
                            clean_snippet = clean_snippet[:150] + "..."

                        answer_parts.append(f"• {clean_snippet} [{citation_num}]\\n\\n")

                # Add summary conclusion
                answer_parts.append(f"\\n**Summary**: The research on {query} shows multiple perspectives and ongoing developments. ")
                answer_parts.append(f"For the most current information, refer to the cited sources above.")

            enhanced_response.answer = "".join(answer_parts)
        else:
            enhanced_response.answer = f"## {query.title()}\\n\\nI searched for information about {query}, but couldn't extract detailed content from the available sources. This might be due to access restrictions or the specific nature of the query. Please try refining your search terms or checking the sources directly."

        # Add related topics
        enhanced_response.related_topics = self._generate_related_topics(query)

        return enhanced_response
    
    async def _make_request(
        self,
        method: str,
        url: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Make HTTP request to Jina AI API with enhanced error handling
        """
        request_headers = self.headers.copy()
        if headers:
            request_headers.update(headers)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                if method.upper() == 'GET':
                    response = await client.get(url, params=params, headers=request_headers)
                elif method.upper() == 'POST':
                    response = await client.post(url, json=data, params=params, headers=request_headers)
                else:
                    raise JinaNonRetryableError(f"Unsupported HTTP method: {method}")

                response.raise_for_status()

                # Handle different response types
                content_type = response.headers.get('content-type', '')
                if 'application/json' in content_type:
                    return response.json()
                else:
                    return {'content': response.text, 'status_code': response.status_code}

        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            error_text = e.response.text

            # Determine if error is retryable
            if status_code in [429, 502, 503, 504]:  # Rate limit or server errors
                logger.warning(f"Retryable HTTP error {status_code}: {error_text}")
                raise JinaRetryableError(f"HTTP {status_code}: {error_text}")
            elif status_code in [400, 401, 403, 404]:  # Client errors
                logger.error(f"Non-retryable HTTP error {status_code}: {error_text}")
                raise JinaNonRetryableError(f"HTTP {status_code}: {error_text}")
            else:
                logger.error(f"HTTP error {status_code}: {error_text}")
                raise JinaRetryableError(f"HTTP {status_code}: {error_text}")

        except httpx.TimeoutException:
            logger.warning("Request timeout to Jina AI API")
            raise JinaRetryableError("Request timeout to Jina AI API")
        except httpx.ConnectError:
            logger.warning("Connection error to Jina AI API")
            raise JinaRetryableError("Connection error to Jina AI API")
        except Exception as e:
            logger.error(f"Unexpected error in Jina AI request: {str(e)}")
            raise JinaNonRetryableError(f"Jina AI service error: {str(e)}")

    async def _make_request_with_retry(
        self,
        method: str,
        url: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Make HTTP request with retry logic and rate limiting
        """
        # Apply rate limiting
        await self.rate_limiter.acquire()

        return await retry_jina_request(
            self._make_request,
            max_retries=3,
            base_delay=1.0,
            max_delay=30.0,
            method=method,
            url=url,
            data=data,
            params=params,
            headers=headers
        )
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Production health check to verify API connectivity
        """
        try:
            # Verify API key format and make a minimal search request
            if not self.validate_api_key():
                raise ValueError("Invalid API key format")

            result = await self.search("AI", limit=1)
            return {
                'status': 'healthy',
                'api_key_valid': True,
                'timestamp': datetime.now().isoformat(),
                'service_operational': True
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'api_key_valid': False,
                'timestamp': datetime.now().isoformat(),
                'error': str(e)
            }
    
    async def search(
        self,
        query: str,
        limit: int = 10,
        site: Optional[str] = None,
        include_images: bool = False,
        include_links: bool = True,
        enhanced_output: bool = True
    ) -> Dict[str, Any]:
        """
        Web search using Jina AI Search API with enhanced Perplexity-style output
        """
        start_time = time.time()
        url = self.base_urls['search']
        params = {
            'q': query,
            'limit': limit,
            'include_images': include_images,
            'include_links': include_links
        }

        if site:
            params['site'] = site

        logger.info(f"Performing Jina AI search: {query}")
        raw_result = await self._make_request_with_retry('GET', url, params=params)

        if enhanced_output:
            search_time = time.time() - start_time
            enhanced_response = await self._create_enhanced_search_response(
                query, raw_result, search_time
            )
            return enhanced_response.to_dict()

        return raw_result
    
    async def read_url(
        self,
        url: str,
        output_format: str = 'markdown',
        include_images: bool = False,
        include_links: bool = True,
        enhanced_output: bool = True
    ) -> Dict[str, Any]:
        """
        Extract content from URL using Jina AI Reader API with enhanced formatting
        """
        start_time = time.time()
        reader_url = f"{self.base_urls['reader']}/{url}"
        params = {
            'format': output_format,
            'include_images': include_images,
            'include_links': include_links
        }

        logger.info(f"Reading URL content: {url}")
        raw_result = await self._make_request_with_retry('GET', reader_url, params=params)

        if enhanced_output:
            processing_time = time.time() - start_time
            domain = self._extract_domain(url)

            # Create enhanced content response
            enhanced_content = {
                'url': url,
                'domain': domain,
                'content': raw_result.get('content', ''),
                'title': raw_result.get('title', f'Content from {domain}'),
                'processing_time': processing_time,
                'format': output_format,
                'includes_images': include_images,
                'includes_links': include_links,
                'word_count': len(raw_result.get('content', '').split()) if raw_result.get('content') else 0,
                'response_type': 'enhanced_content'
            }

            # Add content summary if content is long
            content = raw_result.get('content', '')
            if len(content) > 500:
                enhanced_content['summary'] = content[:500] + "..."
                enhanced_content['full_content_available'] = True
            else:
                enhanced_content['summary'] = content
                enhanced_content['full_content_available'] = False

            return enhanced_content

        return raw_result

    async def deep_search(
        self,
        query: str,
        max_results: int = 10,
        include_citations: bool = True,
        search_depth: str = "comprehensive",
        enhanced_output: bool = True
    ) -> Dict[str, Any]:
        """
        Perform deep research using enhanced Jina AI Search with Perplexity-style comprehensive output
        """
        start_time = time.time()
        url = self.base_urls['deepsearch']
        params = {
            'q': query,
            'limit': max_results,
            'include_citations': include_citations,
            'include_images': True,
            'include_links': True,
            'search_depth': search_depth
        }

        logger.info(f"Performing deep search: {query}")
        raw_result = await self._make_request_with_retry('GET', url, params=params)

        if enhanced_output:
            search_time = time.time() - start_time
            enhanced_response = await self._create_enhanced_search_response(
                query, raw_result, search_time
            )

            # Add deep search specific enhancements
            enhanced_response.answer = f"**Deep Research Results for: {query}**\\n\\n" + enhanced_response.answer
            enhanced_response.related_topics.extend([
                f"Research methodology for {query}",
                f"Academic papers on {query}",
                f"Expert opinions on {query}"
            ])

            return enhanced_response.to_dict()

        return raw_result

    async def create_embeddings(
        self,
        texts: Union[str, List[str]],
        model: str = "jina-embeddings-v2-base-en",
        task: str = "retrieval.passage"
    ) -> Dict[str, Any]:
        """
        Generate embeddings using Jina AI Embeddings API
        """
        url = self.base_urls['embeddings']

        # Ensure texts is a list
        if isinstance(texts, str):
            texts = [texts]

        data = {
            'model': model,
            'input': texts,
            'task': task
        }

        logger.info(f"Creating embeddings for {len(texts)} text(s)")
        return await self._make_request_with_retry('POST', url, data=data)

    async def rerank_results(
        self,
        query: str,
        documents: List[str],
        model: str = "jina-reranker-v1-base-en",
        top_n: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Rerank search results using Jina AI Reranker API
        """
        url = self.base_urls['reranker']
        data = {
            'model': model,
            'query': query,
            'documents': documents
        }

        if top_n is not None:
            data['top_n'] = top_n

        logger.info(f"Reranking {len(documents)} documents for query: {query}")
        return await self._make_request_with_retry('POST', url, data=data)

    async def classify_text(
        self,
        text: str,
        labels: List[str],
        model: str = "jina-clip-v1"
    ) -> Dict[str, Any]:
        """
        Classify text using Jina AI Classifier API
        """
        url = self.base_urls['classifier']
        data = {
            'model': model,
            'input': text,
            'labels': labels
        }

        logger.info(f"Classifying text with {len(labels)} labels")
        return await self._make_request_with_retry('POST', url, data=data)

    async def segment_text(
        self,
        text: str,
        max_chunk_length: int = 1000,
        overlap: int = 100,
        preserve_sentences: bool = True
    ) -> Dict[str, Any]:
        """
        Segment text into chunks - using local implementation as fallback
        """
        logger.info(f"Segmenting text of length {len(text)} characters")

        # Simple text segmentation implementation
        chunks = []
        start = 0

        while start < len(text):
            end = min(start + max_chunk_length, len(text))

            if end >= len(text):
                chunks.append(text[start:])
                break

            # Try to break at sentence boundary if preserve_sentences is True
            if preserve_sentences and end < len(text):
                # Look for sentence endings within the chunk
                chunk = text[start:end]
                last_period = chunk.rfind('.')
                last_exclamation = chunk.rfind('!')
                last_question = chunk.rfind('?')

                sentence_end = max(last_period, last_exclamation, last_question)
                if sentence_end > 0:
                    end = start + sentence_end + 1

            chunks.append(text[start:end])

            # Move start position, ensuring we make progress
            new_start = max(end - overlap, start + 1) if overlap > 0 else end
            if new_start <= start:  # Prevent infinite loop
                new_start = start + 1
            start = new_start

        return {
            'chunks': chunks,
            'total_chunks': len(chunks),
            'original_length': len(text),
            'method': 'local_segmentation'
        }

    def validate_api_key(self) -> bool:
        """
        Validate if the API key is properly configured
        """
        return bool(self.api_key and self.api_key.startswith('jina_'))
    
    def get_service_info(self) -> Dict[str, Any]:
        """
        Get service information and configuration
        """
        return {
            'service_name': 'Jina AI Service',
            'version': '1.0.0',
            'api_key_configured': self.validate_api_key(),
            'available_apis': list(self.base_urls.keys()),
            'base_urls': self.base_urls
        }

# Global service instance
_jina_service_instance = None

def get_jina_service() -> JinaAIService:
    """Get or create global Jina AI service instance"""
    global _jina_service_instance
    if _jina_service_instance is None:
        _jina_service_instance = JinaAIService()
    return _jina_service_instance

async def check_jina_connectivity() -> Dict[str, Any]:
    """Check Jina AI service connectivity for production monitoring"""
    try:
        service = get_jina_service()
        return await service.health_check()
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }
