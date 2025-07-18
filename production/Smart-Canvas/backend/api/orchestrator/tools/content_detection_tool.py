"""
Content Detection Tool for Metatron Orchestrator
Analyzes user messages to detect content intent and determine appropriate visual content display
"""

import logging
import json
import re
from typing import Dict, Any, List, Optional
from datetime import datetime

from ..dependencies import OrchestratorDependencies

# Configure logging
logger = logging.getLogger(__name__)


class ContentDetectionTool:
    """
    Tool for detecting content intent in user messages
    Determines when visual content (charts, images, videos, maps) should be displayed
    """
    
    def __init__(self):
        self.content_patterns = {
            'chart': {
                'patterns': [
                    r'\b(chart|graph|plot|visualize|visualization)\b',
                    r'\b(stock price|stock chart|price chart)\b',
                    r'\b(show.*data|display.*data)\b',
                    r'\b(trend|trends|trending)\b',
                    r'\b(analytics|statistics|stats)\b',
                    r'\b(compare.*data|comparison)\b',
                    r'\b(financial.*data|market.*data)\b',
                    r'\b(crypto.*price|cryptocurrency)\b'
                ],
                'entities': [
                    r'\b([A-Z]{2,5})\b',  # Stock symbols
                    r'\b(bitcoin|btc|ethereum|eth|crypto)\b',
                    r'\b(\d+%|\$\d+)\b'  # Percentages and prices
                ]
            },
            'image': {
                'patterns': [
                    r'\b(generate.*image|create.*image|make.*image)\b',
                    r'\b(show.*picture|display.*picture)\b',
                    r'\b(photo|photograph|pic)\b',
                    r'\b(draw|sketch|illustrate)\b',
                    r'\b(visual.*representation)\b',
                    r'\b(image.*of|picture.*of)\b'
                ],
                'entities': [
                    r'\b(of\s+)([^.!?]+)',  # Extract subject after "of"
                    r'\b(showing\s+)([^.!?]+)',  # Extract subject after "showing"
                ]
            },
            'video': {
                'patterns': [
                    r'\b(video|watch|youtube|play)\b',
                    r'\b(movie|film|clip)\b',
                    r'\b(tutorial|demo|demonstration)\b',
                    r'\b(youtube\.com|youtu\.be)\b',
                    r'\b(stream|streaming)\b'
                ],
                'entities': [
                    r'(https?://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)[\w-]+)',  # YouTube URLs
                    r'\b(tutorial.*on|demo.*of|video.*about)\s+([^.!?]+)',
                ]
            },
            'map': {
                'patterns': [
                    r'\b(map|location|where.*is|directions)\b',
                    r'\b(address|coordinates|latitude|longitude)\b',
                    r'\b(route|navigation|distance)\b',
                    r'\b(city|country|state|region)\b',
                    r'\b(near.*me|nearby|around)\b',
                    r'\b(travel.*to|go.*to)\b'
                ],
                'entities': [
                    r'\b(in\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',  # Location names
                    r'\b(\d+\.?\d*°?\s*[NS],?\s*\d+\.?\d*°?\s*[EW])',  # Coordinates
                ]
            }
        }
    
    async def detect_content_intent(
        self,
        deps: OrchestratorDependencies,
        message: str,
        context: Dict[str, Any] = None
    ) -> str:
        """
        Analyze user message to detect content intent
        
        Args:
            deps: Orchestrator dependencies
            message: User message to analyze
            context: Additional context information
            
        Returns:
            JSON string with detection results
        """
        try:
            logger.info(f"🔍 Analyzing content intent for message: {message[:50]}...")
            
            message_lower = message.lower()
            detection_results = []
            
            # Analyze each content type
            for content_type, config in self.content_patterns.items():
                confidence = 0
                detected_entities = []
                
                # Check patterns
                pattern_matches = 0
                for pattern in config['patterns']:
                    if re.search(pattern, message_lower, re.IGNORECASE):
                        pattern_matches += 1
                        confidence += 20  # Base confidence per pattern match
                
                # Extract entities
                for entity_pattern in config.get('entities', []):
                    matches = re.findall(entity_pattern, message, re.IGNORECASE)
                    if matches:
                        detected_entities.extend([match if isinstance(match, str) else match[-1] for match in matches])
                        confidence += 15  # Bonus for entity detection
                
                # Calculate final confidence
                if pattern_matches > 0:
                    confidence = min(confidence, 100)  # Cap at 100%
                    
                    detection_results.append({
                        'content_type': content_type,
                        'confidence': confidence,
                        'entities': detected_entities[:3],  # Limit to top 3 entities
                        'pattern_matches': pattern_matches
                    })
            
            # Sort by confidence and get top result
            detection_results.sort(key=lambda x: x['confidence'], reverse=True)
            
            # Determine primary content type
            primary_detection = None
            if detection_results and detection_results[0]['confidence'] >= 40:
                primary_detection = detection_results[0]
            
            result = {
                'has_visual_content': primary_detection is not None,
                'primary_content_type': primary_detection['content_type'] if primary_detection else 'text',
                'confidence': primary_detection['confidence'] if primary_detection else 0,
                'entities': primary_detection['entities'] if primary_detection else [],
                'all_detections': detection_results,
                'timestamp': datetime.now().isoformat(),
                'message_length': len(message)
            }
            
            logger.info(f"✅ Content detection complete: {result['primary_content_type']} ({result['confidence']}%)")
            
            return json.dumps(result, indent=2)
            
        except Exception as e:
            logger.error(f"❌ Content detection error: {str(e)}")
            error_result = {
                'has_visual_content': False,
                'primary_content_type': 'text',
                'confidence': 0,
                'entities': [],
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
            return json.dumps(error_result, indent=2)


# Tool function for orchestrator agent registration
async def content_detection_tool(
    deps: OrchestratorDependencies,
    message: str,
    context: Dict[str, Any] = None
) -> str:
    """
    Detect content intent in user messages for visual content routing
    
    Args:
        deps: Orchestrator dependencies
        message: User message to analyze
        context: Additional context information
        
    Returns:
        JSON string with detection results including content type, confidence, and entities
    """
    detector = ContentDetectionTool()
    return await detector.detect_content_intent(deps, message, context or {})
