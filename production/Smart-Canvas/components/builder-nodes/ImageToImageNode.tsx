"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Image, Upload, Download, Copy, Loader2, RefreshCw, Wand2 } from 'lucide-react';

export interface ImageToImageNodeData {
  label: string;
  prompt: string;
  negativePrompt?: string;
  provider: 'stability' | 'segmind' | 'openai';
  model: string;
  apiKey: string;
  strength: number; // How much to transform the original image (0.1 - 1.0)
  guidance: number;
  steps: number;
  sourceImage?: {
    url: string;
    name: string;
  };
  generatedImage?: {
    url: string;
    prompt: string;
    timestamp: number;
  };
  isLoading?: boolean;
  error?: string;
  onNodeDataChange?: (id: string, data: Partial<ImageToImageNodeData>) => void;
}

const providerModels = {
  stability: ['stable-diffusion-xl-1024-v1-0', 'stable-diffusion-v1-6'],
  segmind: ['sd-1.5', 'sdxl-1.0'],
  openai: ['dall-e-2'] // DALL-E 3 doesn't support image-to-image yet
};

const ImageToImageNode: React.FC<NodeProps<ImageToImageNodeData>> = ({ id, data }) => {
  const [prompt, setPrompt] = useState(data.prompt || '');
  const [negativePrompt, setNegativePrompt] = useState(data.negativePrompt || '');
  const [isLoading, setIsLoading] = useState(false);
  const [sourceImage, setSourceImage] = useState(data.sourceImage || null);
  const [generatedImage, setGeneratedImage] = useState(data.generatedImage || null);
  const [error, setError] = useState(data.error || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPrompt(data.prompt || '');
    setNegativePrompt(data.negativePrompt || '');
    setSourceImage(data.sourceImage || null);
    setGeneratedImage(data.generatedImage || null);
    setError(data.error || '');
  }, [data]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newData: Partial<ImageToImageNodeData> = { [name]: value };

    // Reset model when provider changes
    if (name === 'provider') {
      const newProvider = value as keyof typeof providerModels;
      newData.model = providerModels[newProvider]?.[0] || '';
    }

    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, newData);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      const newSourceImage = {
        url: imageUrl,
        name: file.name
      };
      
      setSourceImage(newSourceImage);
      setError('');
      
      if (data.onNodeDataChange) {
        data.onNodeDataChange(id, { sourceImage: newSourceImage, error: '' });
      }
    };
    
    reader.readAsDataURL(file);
  };

  const transformImage = async () => {
    if (!prompt.trim() || !data.apiKey || !sourceImage || isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/image-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim(),
          provider: data.provider,
          model: data.model,
          apiKey: data.apiKey,
          sourceImageUrl: sourceImage.url,
          strength: data.strength || 0.7,
          guidance: data.guidance || 7.5,
          steps: data.steps || 20
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to transform image: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.imageUrl) {
        const newImage = {
          url: result.imageUrl,
          prompt: prompt.trim(),
          timestamp: Date.now()
        };
        
        setGeneratedImage(newImage);
        
        if (data.onNodeDataChange) {
          data.onNodeDataChange(id, {
            generatedImage: newImage,
            isLoading: false,
            error: '',
            // Store processed content for other nodes to access
            processedContent: {
              type: 'image',
              title: `Transformed Image: ${prompt.trim().substring(0, 50)}${prompt.trim().length > 50 ? '...' : ''}`,
              content: `Image transformation using ${data.provider} (${data.model})
Source Image: ${sourceImage?.name || 'Uploaded Image'}
Transformation Prompt: ${prompt.trim()}
${negativePrompt ? `Negative Prompt: ${negativePrompt.trim()}` : ''}
Strength: ${data.strength || 0.7}
Guidance: ${data.guidance || 7.5}
Steps: ${data.steps || 20}
Transformed: ${new Date(newImage.timestamp).toLocaleString()}`,
              metadata: {
                provider: data.provider,
                model: data.model,
                prompt: prompt.trim(),
                negativePrompt: negativePrompt?.trim() || '',
                strength: data.strength || 0.7,
                guidance: data.guidance || 7.5,
                steps: data.steps || 20,
                sourceImageName: sourceImage?.name || 'Uploaded Image',
                transformedImageUrl: result.imageUrl,
                timestamp: newImage.timestamp
              }
            }
          });
        }
      } else {
        throw new Error(result.error || 'Failed to transform image');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to transform image';
      setError(errorMessage);
      if (data.onNodeDataChange) {
        data.onNodeDataChange(id, { error: errorMessage, isLoading: false });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = () => {
    if (generatedImage?.url) {
      const link = document.createElement('a');
      link.href = generatedImage.url;
      link.download = `transformed-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const copyImageUrl = () => {
    if (generatedImage?.url) {
      navigator.clipboard.writeText(generatedImage.url);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      transformImage();
    }
  };

  return (
    <div className="bg-white border-2 rounded-lg shadow-lg min-w-[350px] border-gray-300">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-400" />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <RefreshCw size={18} />
          <span className="font-medium">{data.label}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
          <select
            name="provider"
            value={data.provider}
            onChange={handleInputChange}
            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="stability">Stability AI</option>
            <option value="segmind">Segmind</option>
            <option value="openai">OpenAI DALL-E</option>
          </select>
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <select
            name="model"
            value={data.model}
            onChange={handleInputChange}
            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {providerModels[data.provider]?.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input
            type="password"
            name="apiKey"
            value={data.apiKey}
            onChange={handleInputChange}
            onPaste={(e) => e.stopPropagation()}
            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Enter API key..."
          />
        </div>

        {/* Source Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source Image</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            {sourceImage ? (
              <div>
                <img
                  src={sourceImage.url}
                  alt={sourceImage.name}
                  className="w-full max-h-32 object-contain rounded mb-2"
                />
                <p className="text-sm text-gray-600 truncate">{sourceImage.name}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm"
                >
                  Change Image
                </button>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-indigo-600 hover:text-indigo-800 text-sm"
                >
                  Upload Image
                </button>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Transformation Prompt</label>
          <textarea
            name="prompt"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              handleInputChange(e);
            }}
            onKeyDown={handleKeyDown}
            onPaste={(e) => e.stopPropagation()}
            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            rows={3}
            placeholder="Describe how to transform the image..."
          />
        </div>

        {/* Transformation Settings */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Strength</label>
            <input
              type="range"
              name="strength"
              value={data.strength || 0.7}
              onChange={handleInputChange}
              min="0.1"
              max="1.0"
              step="0.1"
              className="w-full"
            />
            <span className="text-xs text-gray-500">{data.strength || 0.7}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Guidance</label>
            <input
              type="number"
              name="guidance"
              value={data.guidance || 7.5}
              onChange={handleInputChange}
              className="w-full p-1 text-sm border border-gray-300 rounded"
              min="1"
              max="20"
              step="0.5"
            />
          </div>
        </div>

        {/* Transform Button */}
        <button
          onClick={transformImage}
          disabled={!prompt.trim() || !data.apiKey || !sourceImage || isLoading}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-2 px-4 rounded font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Transforming...
            </>
          ) : (
            <>
              <Wand2 size={16} />
              Transform Image
            </>
          )}
        </button>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Generated Image Display */}
        {generatedImage && (
          <div className="border border-gray-200 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Transformed Image</span>
              <div className="flex gap-2">
                <button
                  onClick={copyImageUrl}
                  className="p-1 text-gray-500 hover:text-gray-700"
                  title="Copy URL"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={downloadImage}
                  className="p-1 text-gray-500 hover:text-gray-700"
                  title="Download"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
            <img
              src={generatedImage.url}
              alt={generatedImage.prompt}
              className="w-full rounded border"
              style={{ maxHeight: '200px', objectFit: 'contain' }}
            />
            <p className="text-xs text-gray-500 mt-2 truncate">{generatedImage.prompt}</p>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-gray-400" />
    </div>
  );
};

export default ImageToImageNode;
