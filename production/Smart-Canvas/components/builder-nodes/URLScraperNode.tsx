"use client";

import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Globe, ExternalLink, Loader2, Copy, AlertCircle } from 'lucide-react';

export interface URLScraperNodeData {
  label: string;
  url: string;
  scrapedContent?: string;
  isLoading?: boolean;
  error?: string;
  onNodeDataChange?: (id: string, data: Partial<URLScraperNodeData>) => void;
  _forceRerender?: number;
}

const URLScraperNode: React.FC<NodeProps<URLScraperNodeData>> = ({ id, data, selected }) => {
  const [url, setUrl] = useState(data.url || '');
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedContent, setScrapedContent] = useState(data.scrapedContent || '');
  const [error, setError] = useState(data.error || '');

  useEffect(() => {
    setUrl(data.url || '');
    setScrapedContent(data.scrapedContent || '');
    setError(data.error || '');
  }, [data._forceRerender]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, { url: newUrl });
    }
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const scrapeUrl = async () => {
    if (!url || !isValidUrl(url)) {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/scrape-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Failed to scrape URL: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setScrapedContent(result.content);
        if (data.onNodeDataChange) {
          data.onNodeDataChange(id, { 
            scrapedContent: result.content,
            error: '',
            isLoading: false
          });
        }
      } else {
        throw new Error(result.error || 'Failed to scrape URL');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to scrape URL';
      setError(errorMessage);
      if (data.onNodeDataChange) {
        data.onNodeDataChange(id, { error: errorMessage, isLoading: false });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyContent = () => {
    if (scrapedContent) {
      navigator.clipboard.writeText(scrapedContent);
    }
  };

  const openUrl = () => {
    if (url && isValidUrl(url)) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className={`bg-white border-2 rounded-lg shadow-lg min-w-[280px] ${
      selected ? 'border-blue-500' : 'border-gray-300'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-400" />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Globe size={18} />
          <span className="font-medium">{data.label}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* URL Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Website URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={handleUrlChange}
              placeholder="https://example.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {url && isValidUrl(url) && (
              <button
                onClick={openUrl}
                className="px-2 py-2 text-gray-500 hover:text-green-600 transition-colors"
                title="Open URL"
              >
                <ExternalLink size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Scrape Button */}
        <button
          onClick={scrapeUrl}
          disabled={!url || !isValidUrl(url) || isLoading}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Scraping...
            </>
          ) : (
            <>
              <Globe size={16} />
              Scrape Website
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

        {/* Content Preview */}
        {scrapedContent && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Scraped Content ({scrapedContent.length} chars)
              </label>
              <button
                onClick={copyContent}
                className="text-gray-500 hover:text-green-600 transition-colors"
                title="Copy content"
              >
                <Copy size={14} />
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto p-2 bg-gray-50 border border-gray-200 rounded-md">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                {scrapedContent.substring(0, 500)}
                {scrapedContent.length > 500 && '...'}
              </pre>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="text-xs text-gray-500">
          {scrapedContent ? (
            <span className="text-green-600">✓ Content scraped successfully</span>
          ) : url && isValidUrl(url) ? (
            <span>Ready to scrape</span>
          ) : (
            <span>Enter a valid URL to scrape</span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-gray-400" />
    </div>
  );
};

export default URLScraperNode;
