"use client";

import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Image, Download, Copy, Loader2, Palette, Wand2 } from 'lucide-react';

export interface ImageGenerationNodeData {
  label: string;
  prompt: string;
  negativePrompt?: string;
  provider: 'openai' | 'stability' | 'segmind';
  model: string;
  apiKey: string;
  width: number;
  height: number;
  steps?: number;
  guidance?: number;
  seed?: number;
  style?: string;
  generatedImage?: {
    url: string;
    prompt: string;
    timestamp: number;
  };
  isLoading?: boolean;
  error?: string;
  onNodeDataChange?: (id: string, data: Partial<ImageGenerationNodeData>) => void;
}

const providerModels = {
  openai: ['dall-e-3', 'dall-e-2'],
  stability: ['stable-diffusion-xl-1024-v1-0', 'stable-diffusion-v1-6', 'stable-diffusion-xl-beta-v2-2-2'],
  segmind: ['sd-1.5', 'sdxl-1.0', 'kandinsky-2.2']
};

const ImageGenerationNode: React.FC<NodeProps<ImageGenerationNodeData>> = ({ id, data }) => {
  const [prompt, setPrompt] = useState(data.prompt || '');
  const [negativePrompt, setNegativePrompt] = useState(data.negativePrompt || '');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(data.generatedImage || null);
  const [error, setError] = useState(data.error || '');

  useEffect(() => {
    setPrompt(data.prompt || '');
    setNegativePrompt(data.negativePrompt || '');
    setGeneratedImage(data.generatedImage || null);
    setError(data.error || '');
  }, [data]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newData: Partial<ImageGenerationNodeData> = { [name]: value };

    // Reset model when provider changes
    if (name === 'provider') {
      const newProvider = value as keyof typeof providerModels;
      newData.model = providerModels[newProvider]?.[0] || '';
    }

    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, newData);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim() || !data.apiKey || isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/image-generation', {
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
          width: data.width || 1024,
          height: data.height || 1024,
          steps: data.steps || 20,
          guidance: data.guidance || 7.5,
          seed: data.seed,
          style: data.style
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate image: ${response.status} ${response.statusText}`);
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
              title: `Generated Image: ${prompt.trim().substring(0, 50)}${prompt.trim().length > 50 ? '...' : ''}`,
              content: `Generated image using ${data.provider} (${data.model})
Prompt: ${prompt.trim()}
${negativePrompt ? `Negative Prompt: ${negativePrompt.trim()}` : ''}
Dimensions: ${data.width}x${data.height}
Generated: ${new Date(newImage.timestamp).toLocaleString()}`,
              metadata: {
                provider: data.provider,
                model: data.model,
                prompt: prompt.trim(),
                negativePrompt: negativePrompt?.trim() || '',
                width: data.width,
                height: data.height,
                imageUrl: result.imageUrl,
                timestamp: newImage.timestamp
              }
            }
          });
        }
      } else {
        throw new Error(result.error || 'Failed to generate image');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate image';
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
      link.download = `generated-image-${Date.now()}.png`;
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
      generateImage();
    }
  };

  return (
    <div className="bg-white border-2 rounded-lg shadow-lg min-w-[350px] border-gray-300">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-400" />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Palette size={18} />
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
            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            <option value="openai">OpenAI DALL-E</option>
            <option value="stability">Stability AI</option>
            <option value="segmind">Segmind</option>
          </select>
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <select
            name="model"
            value={data.model}
            onChange={handleInputChange}
            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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
            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="Enter API key..."
          />
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
          <textarea
            name="prompt"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              handleInputChange(e);
            }}
            onKeyDown={handleKeyDown}
            onPaste={(e) => e.stopPropagation()}
            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
            rows={3}
            placeholder="Describe the image you want to generate..."
          />
        </div>

        {/* Negative Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Negative Prompt (Optional)</label>
          <textarea
            name="negativePrompt"
            value={negativePrompt}
            onChange={(e) => {
              setNegativePrompt(e.target.value);
              handleInputChange(e);
            }}
            onPaste={(e) => e.stopPropagation()}
            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
            rows={2}
            placeholder="What to avoid in the image..."
          />
        </div>

        {/* Generation Settings */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
            <input
              type="number"
              name="width"
              value={data.width || 1024}
              onChange={handleInputChange}
              className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              min="256"
              max="2048"
              step="64"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
            <input
              type="number"
              name="height"
              value={data.height || 1024}
              onChange={handleInputChange}
              className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              min="256"
              max="2048"
              step="64"
            />
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateImage}
          disabled={!prompt.trim() || !data.apiKey || isLoading}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-2 px-4 rounded font-medium hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 size={16} />
              Generate Image
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
              <span className="text-sm font-medium text-gray-700">Generated Image</span>
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

export default ImageGenerationNode;
