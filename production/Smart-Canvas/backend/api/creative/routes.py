"""
Creative Studio API Routes for Unified Backend
Integrates image generation services (Segmind and Fal AI)
"""

import os
import sys
import logging
import httpx
from typing import Dict, Any, Optional, List
from datetime import datetime

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field

# Add creative-studio to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'creative-studio'))

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/creative", tags=["creative"])

# Service URLs
FAL_SERVICE_URL = os.getenv('FAL_SERVICE_URL', 'http://localhost:5003')

class ImageGenerationRequest(BaseModel):
    prompt: str = Field(..., description="Text prompt for image generation")
    model: str = Field(default="sdxl", description="Model to use (sdxl, flux, etc.)")
    width: int = Field(default=1024, ge=256, le=2048)
    height: int = Field(default=1024, ge=256, le=2048)
    num_images: int = Field(default=1, ge=1, le=4)
    guidance_scale: float = Field(default=7.5, ge=1.0, le=20.0)
    num_inference_steps: int = Field(default=20, ge=10, le=100)
    seed: Optional[int] = Field(default=None, description="Random seed for reproducibility")

class ImageEditRequest(BaseModel):
    prompt: str = Field(..., description="Edit instruction")
    image_url: Optional[str] = Field(default=None, description="URL of image to edit")
    strength: float = Field(default=0.8, ge=0.1, le=1.0)

class CreativeResponse(BaseModel):
    success: bool
    images: List[str] = Field(default_factory=list, description="Generated image URLs")
    message: str = ""
    generation_time: float = 0.0
    model_used: str = ""
    parameters: Dict[str, Any] = Field(default_factory=dict)

@router.get("/health")
async def health_check():
    """Health check for creative studio services"""
    try:
        async with httpx.AsyncClient() as client:
            # Check Fal AI service
            try:
                fal_response = await client.get(f"{FAL_SERVICE_URL}/health", timeout=5.0)
                fal_healthy = fal_response.status_code == 200
            except:
                fal_healthy = False
        
        return {
            "service": "creative-studio",
            "status": "running",
            "timestamp": datetime.now().isoformat(),
            "providers": {
                "fal_ai": {
                    "url": FAL_SERVICE_URL,
                    "healthy": fal_healthy
                }
            },
            "capabilities": [
                "text_to_image",
                "image_to_image", 
                "image_editing",
                "style_transfer"
            ]
        }
    except Exception as e:
        logger.error(f"Creative studio health check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate", response_model=CreativeResponse)
async def generate_image(request: ImageGenerationRequest):
    """Generate images using AI models"""
    try:
        # Use Fal AI for all models
        service_url = f"{FAL_SERVICE_URL}/generate"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                service_url,
                json=request.dict(),
                timeout=120.0  # Image generation can take time
            )
            
            if response.status_code == 200:
                result = response.json()
                return CreativeResponse(
                    success=True,
                    images=result.get('images', []),
                    message=result.get('message', 'Images generated successfully'),
                    generation_time=result.get('generation_time', 0.0),
                    model_used=request.model,
                    parameters=request.dict()
                )
            else:
                logger.error(f"Image generation failed: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Image generation failed: {response.text}"
                )
                
    except Exception as e:
        logger.error(f"Image generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/edit", response_model=CreativeResponse)
async def edit_image(request: ImageEditRequest, image: Optional[UploadFile] = File(None)):
    """Edit images using AI"""
    try:
        # Use Fal AI for image editing (more advanced capabilities)
        service_url = f"{FAL_SERVICE_URL}/edit"
        
        # Prepare form data
        files = {}
        if image:
            files['image'] = (image.filename, await image.read(), image.content_type)
        
        data = request.dict()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                service_url,
                data=data,
                files=files,
                timeout=120.0
            )
            
            if response.status_code == 200:
                result = response.json()
                return CreativeResponse(
                    success=True,
                    images=result.get('images', []),
                    message=result.get('message', 'Image edited successfully'),
                    generation_time=result.get('generation_time', 0.0),
                    model_used="image_editor",
                    parameters=request.dict()
                )
            else:
                logger.error(f"Image editing failed: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Image editing failed: {response.text}"
                )
                
    except Exception as e:
        logger.error(f"Image editing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models")
async def get_available_models():
    """Get list of available AI models"""
    return {
        "models": {
            "text_to_image": [
                {"id": "sdxl", "name": "Stable Diffusion XL", "provider": "segmind"},
                {"id": "flux", "name": "Flux", "provider": "fal_ai"},
                {"id": "kandinsky", "name": "Kandinsky", "provider": "segmind"},
                {"id": "sd15", "name": "Stable Diffusion 1.5", "provider": "segmind"}
            ],
            "image_editing": [
                {"id": "instruct_pix2pix", "name": "InstructPix2Pix", "provider": "fal_ai"},
                {"id": "controlnet", "name": "ControlNet", "provider": "fal_ai"}
            ]
        },
        "providers": {
            "segmind": {
                "name": "Segmind",
                "url": SEGMIND_SERVICE_URL,
                "specialties": ["SDXL", "Fast generation"]
            },
            "fal_ai": {
                "name": "Fal AI", 
                "url": FAL_SERVICE_URL,
                "specialties": ["Advanced models", "Image editing"]
            }
        }
    }

@router.get("/status")
async def get_creative_status():
    """Get detailed status of creative studio"""
    try:
        async with httpx.AsyncClient() as client:
            # Get status from both services
            segmind_status = {}
            fal_status = {}
            
            try:
                segmind_response = await client.get(f"{SEGMIND_SERVICE_URL}/api/segmind/status", timeout=5.0)
                if segmind_response.status_code == 200:
                    segmind_status = segmind_response.json()
            except:
                pass
            
            try:
                fal_response = await client.get(f"{FAL_SERVICE_URL}/status", timeout=5.0)
                if fal_response.status_code == 200:
                    fal_status = fal_response.json()
            except:
                pass
        
        return {
            "service": "creative-studio-unified",
            "status": "running",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "segmind": segmind_status,
                "fal_ai": fal_status
            },
            "capabilities": [
                "text_to_image_generation",
                "image_to_image_transformation",
                "image_editing_and_enhancement",
                "style_transfer",
                "multi_model_support"
            ]
        }
    except Exception as e:
        logger.error(f"Creative status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
