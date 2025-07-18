#!/usr/bin/env python3
"""
Smart Canvas Backend Server
Main entry point for the FastAPI backend
"""

import os
import sys
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Import API routes
from api.connection.route import router as connection_router
from api.composio_tools.route import router as composio_tools_router
from api.orchestrator.route import router as orchestrator_router

# Create FastAPI app
app = FastAPI(
    title="Smart Canvas API",
    description="Backend API for Smart Canvas AI Workflow Builder",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(connection_router, prefix="/api")
app.include_router(composio_tools_router, prefix="/api")
app.include_router(orchestrator_router, prefix="/api")

@app.get("/")
async def root():
    return {
        "message": "Smart Canvas Backend API",
        "version": "1.0.0",
        "docs": "/api/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "smart-canvas-backend"}

if __name__ == "__main__":
    port = int(os.getenv("BACKEND_PORT", 8000))
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    
    print(f"🚀 Starting Smart Canvas Backend on {host}:{port}")
    print(f"📚 API Documentation: http://{host}:{port}/api/docs")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
