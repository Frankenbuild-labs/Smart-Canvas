"use client";

import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Youtube, ExternalLink, Loader2, Copy, AlertCircle, Play } from 'lucide-react';

export interface YouTubeNodeData {
  label: string;
  url: string;
  videoData?: {
    title: string;
    description: string;
    transcript: string;
    duration: string;
    views: string;
    channel: string;
  };
  isLoading?: boolean;
  error?: string;
  onNodeDataChange?: (id: string, data: Partial<YouTubeNodeData>) => void;
  _forceRerender?: number;
}

const YouTubeNode: React.FC<NodeProps<YouTubeNodeData>> = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();
  const [url, setUrl] = useState(data.url || '');
  const [isLoading, setIsLoading] = useState(false);
  const [videoData, setVideoData] = useState(data.videoData || null);
  const [error, setError] = useState(data.error || '');

  useEffect(() => {
    setUrl(data.url || '');
    setVideoData(data.videoData || null);
    setError(data.error || '');
  }, [data._forceRerender]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    // REACT FLOW v11 WAY: Use setNodes to update node data
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, url: newUrl } } : node
      )
    );
  };

  const isValidYouTubeUrl = (string: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(string);
  };

  const extractVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const processYouTubeVideo = async () => {
    if (!url || !isValidYouTubeUrl(url)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/youtube-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Failed to process YouTube video: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setVideoData(result.data);
        // REACT FLOW v11 WAY: Use setNodes to update node data
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === id
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    videoData: result.data,
                    error: '',
                    isLoading: false,
                    // Store processed content for other nodes to access
                    processedContent: {
                      type: 'youtube',
                      title: result.data.title || 'YouTube Video',
                      content: `Title: ${result.data.title}
Description: ${result.data.description}
Duration: ${result.data.duration}
Views: ${result.data.views}
Channel: ${result.data.channel}
URL: ${url}

Transcript:
${result.data.transcript}`,
                      metadata: {
                        duration: result.data.duration,
                        views: result.data.views,
                        channel: result.data.channel,
                        url: url
                      }
                    }
                  }
                }
              : node
          )
        );
      } else {
        throw new Error(result.error || 'Failed to process YouTube video');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to process YouTube video';
      setError(errorMessage);
      // REACT FLOW v11 WAY: Use setNodes to update node data
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, error: errorMessage, isLoading: false } }
            : node
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyTranscript = () => {
    if (videoData?.transcript) {
      navigator.clipboard.writeText(videoData.transcript);
    }
  };

  const openVideo = () => {
    if (url && isValidYouTubeUrl(url)) {
      window.open(url, '_blank');
    }
  };

  const videoId = extractVideoId(url);

  return (
    <div className={`bg-white border-2 rounded-lg shadow-lg min-w-[300px] ${
      selected ? 'border-red-500' : 'border-gray-300'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-400" />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Youtube size={18} />
          <span className="font-medium">{data.label}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* URL Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            YouTube URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={handleUrlChange}
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {url && isValidYouTubeUrl(url) && (
              <button
                onClick={openVideo}
                className="px-2 py-2 text-gray-500 hover:text-red-600 transition-colors"
                title="Open Video"
              >
                <ExternalLink size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Video Thumbnail */}
        {videoId && (
          <div className="relative">
            <img
              src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
              alt="Video thumbnail"
              className="w-full h-32 object-cover rounded-md"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Play size={32} className="text-white opacity-80" />
            </div>
          </div>
        )}

        {/* Process Button */}
        <button
          onClick={processYouTubeVideo}
          disabled={!url || !isValidYouTubeUrl(url) || isLoading}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Processing...
            </>
          ) : (
            <>
              <Youtube size={16} />
              Extract Video Data
            </>
          )}
        </button>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle size={16} className="text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Video Data Display */}
        {videoData && (
          <div className="space-y-2">
            {/* Video Info */}
            <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
              <h4 className="font-medium text-sm text-gray-800 mb-1">{videoData.title}</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Channel: {videoData.channel}</div>
                <div>Duration: {videoData.duration}</div>
                <div>Views: {videoData.views}</div>
              </div>
            </div>

            {/* Transcript Preview */}
            {videoData.transcript && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Transcript ({videoData.transcript.length} chars)
                  </label>
                  <button
                    onClick={copyTranscript}
                    className="text-gray-500 hover:text-red-600 transition-colors"
                    title="Copy transcript"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto p-2 bg-gray-50 border border-gray-200 rounded-md">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {videoData.transcript.substring(0, 500)}
                    {videoData.transcript.length > 500 && '...'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status */}
        <div className="text-xs text-gray-500">
          {videoData ? (
            <span className="text-green-600">✓ Video data extracted successfully</span>
          ) : url && isValidYouTubeUrl(url) ? (
            <span>Ready to extract video data</span>
          ) : (
            <span>Enter a valid YouTube URL</span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-gray-400" />
    </div>
  );
};

export default YouTubeNode;
