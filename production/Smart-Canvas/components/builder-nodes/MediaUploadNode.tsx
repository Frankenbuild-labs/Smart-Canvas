"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Image, Video, Upload, Loader2, Copy, AlertCircle, X, Play, Eye } from 'lucide-react';

export interface MediaUploadNodeData {
  label: string;
  uploadedFile?: {
    name: string;
    type: string;
    size: number;
    url: string;
    lastModified: number;
  };
  analysisResult?: {
    description: string;
    objects: string[];
    text: string;
    metadata: any;
  };
  isLoading?: boolean;
  error?: string;
  onNodeDataChange?: (id: string, data: Partial<MediaUploadNodeData>) => void;
  _forceRerender?: number;
}

const MediaUploadNode: React.FC<NodeProps<MediaUploadNodeData>> = ({ id, data, selected }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(data.analysisResult || null);
  const [error, setError] = useState(data.error || '');
  const [uploadedFile, setUploadedFile] = useState(data.uploadedFile || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAnalysisResult(data.analysisResult || null);
    setError(data.error || '');
    setUploadedFile(data.uploadedFile || null);
  }, [data._forceRerender]);

  const supportedImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml'
  ];

  const supportedVideoTypes = [
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/webm',
    'video/mkv'
  ];

  const allSupportedTypes = [...supportedImageTypes, ...supportedVideoTypes];

  const isImage = (type: string) => supportedImageTypes.includes(type);
  const isVideo = (type: string) => supportedVideoTypes.includes(type);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!allSupportedTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload image or video files.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create object URL for preview
      const fileUrl = URL.createObjectURL(file);
      
      const fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        url: fileUrl,
        lastModified: file.lastModified
      };

      setUploadedFile(fileData);

      // Process the file for analysis
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/process-media', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to process media: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setAnalysisResult(result.analysis);

        if (data.onNodeDataChange) {
          data.onNodeDataChange(id, {
            uploadedFile: fileData,
            analysisResult: result.analysis,
            error: '',
            isLoading: false,
            // Store processed content for other nodes to access
            processedContent: {
              type: 'media',
              title: `Media Analysis: ${file.name}`,
              content: `Media file analysis results:
File: ${file.name}
Type: ${file.type}
Size: ${(file.size / 1024 / 1024).toFixed(2)} MB
Analysis: ${result.analysis?.description || 'Media processed successfully'}
${result.analysis?.objects ? `Detected Objects: ${result.analysis.objects.join(', ')}` : ''}
${result.analysis?.text ? `Extracted Text: ${result.analysis.text}` : ''}
Processed: ${new Date().toLocaleString()}`,
              metadata: {
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                fileSizeMB: (file.size / 1024 / 1024).toFixed(2),
                analysis: result.analysis,
                uploadTimestamp: Date.now()
              }
            }
          });
        }
      } else {
        throw new Error(result.error || 'Failed to process media');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to process media';
      setError(errorMessage);
      if (data.onNodeDataChange) {
        data.onNodeDataChange(id, { error: errorMessage, isLoading: false });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    if (uploadedFile?.url) {
      URL.revokeObjectURL(uploadedFile.url);
    }
    setUploadedFile(null);
    setAnalysisResult(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, {
        uploadedFile: undefined,
        analysisResult: undefined,
        error: ''
      });
    }
  };

  const copyAnalysis = () => {
    if (analysisResult) {
      navigator.clipboard.writeText(analysisResult);
    }
  };

  return (
    <div className={`bg-white border-2 rounded-lg shadow-lg min-w-[320px] ${
      selected ? 'border-purple-500' : 'border-gray-300'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-400" />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Image size={16} />
            <Video size={16} />
          </div>
          <span className="font-medium">{data.label}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Upload Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Media
          </label>
          
          {!uploadedFile ? (
            <div
              onClick={handleUploadClick}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
            >
              <div className="flex justify-center gap-2 mb-2">
                <Image className="text-gray-400" size={24} />
                <Video className="text-gray-400" size={24} />
              </div>
              <p className="text-sm text-gray-600 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                Images: JPG, PNG, GIF, WebP, SVG<br />
                Videos: MP4, AVI, MOV, WebM
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              {/* Media Preview */}
              <div className="relative">
                {isImage(uploadedFile.type) ? (
                  <img
                    src={uploadedFile.url}
                    alt={uploadedFile.name}
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="relative">
                    <video
                      src={uploadedFile.url}
                      className="w-full h-32 object-cover"
                      controls={false}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                      <Play className="text-white" size={32} />
                    </div>
                  </div>
                )}
                <button
                  onClick={handleRemoveFile}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  title="Remove file"
                >
                  <X size={12} />
                </button>
              </div>
              
              {/* File Info */}
              <div className="p-3">
                <p className="text-sm font-medium text-gray-800">{uploadedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(uploadedFile.size)} • {isImage(uploadedFile.type) ? 'Image' : 'Video'}
                </p>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept="image/*,video/*"
            className="hidden"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 p-4 bg-purple-50 rounded-md">
            <Loader2 className="animate-spin text-purple-600" size={16} />
            <span className="text-sm text-purple-700">Analyzing media...</span>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle size={16} className="text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Analysis Results
              </label>
              <button
                onClick={copyAnalysis}
                className="text-gray-500 hover:text-purple-600 transition-colors"
                title="Copy analysis"
              >
                <Copy size={14} />
              </button>
            </div>
            
            <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{analysisResult}</p>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="text-xs text-gray-500">
          {analysisResult ? (
            <span className="text-green-600">✓ Media analyzed successfully</span>
          ) : uploadedFile ? (
            <span>Media uploaded, analyzing...</span>
          ) : (
            <span>Upload an image or video to analyze</span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-gray-400" />
    </div>
  );
};

export default MediaUploadNode;
