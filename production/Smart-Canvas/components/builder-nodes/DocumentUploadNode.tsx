"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { FileText, Upload, Loader2, Copy, AlertCircle, X, Download } from 'lucide-react';

export interface DocumentUploadNodeData {
  label: string;
  uploadedFile?: {
    name: string;
    type: string;
    size: number;
    content: string;
    lastModified: number;
  };
  extractedText?: string;
  isLoading?: boolean;
  error?: string;
  onNodeDataChange?: (id: string, data: Partial<DocumentUploadNodeData>) => void;
  _forceRerender?: number;
}

const DocumentUploadNode: React.FC<NodeProps<DocumentUploadNodeData>> = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();
  const [isLoading, setIsLoading] = useState(false);
  const [extractedText, setExtractedText] = useState(data.extractedText || '');
  const [error, setError] = useState(data.error || '');
  const [uploadedFile, setUploadedFile] = useState(data.uploadedFile || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setExtractedText(data.extractedText || '');
    setError(data.error || '');
    setUploadedFile(data.uploadedFile || null);
  }, [data._forceRerender]);

  const supportedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('sheet')) return '📊';
    if (type.includes('powerpoint') || type.includes('presentation')) return '📋';
    if (type.includes('text') || type.includes('csv')) return '📃';
    return '📁';
  };

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

    if (!supportedTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload PDF, Word, Excel, PowerPoint, or text files.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/process-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to process document: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          content: result.content,
          lastModified: file.lastModified
        };

        setUploadedFile(fileData);
        setExtractedText(result.content);

        // REACT FLOW v11 WAY: Use setNodes to update node data
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === id
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    uploadedFile: fileData,
                    extractedText: result.content,
                    error: '',
                    isLoading: false,
                    // Store processed content for other nodes to access
                    processedContent: {
                      type: 'document',
                      title: file.name,
                      content: result.content,
                      metadata: {
                        fileType: file.type,
                        fileSize: file.size,
                        lastModified: new Date(file.lastModified).toISOString()
                      }
                    }
                  }
                }
              : node
          )
        );
      } else {
        throw new Error(result.error || 'Failed to process document');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to process document';
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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setExtractedText('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // REACT FLOW v11 WAY: Use setNodes to update node data
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                uploadedFile: undefined,
                extractedText: '',
                error: '',
                processedContent: undefined
              }
            }
          : node
      )
    );
  };

  const copyContent = () => {
    if (extractedText) {
      navigator.clipboard.writeText(extractedText);
    }
  };

  return (
    <div className={`bg-white border-2 rounded-lg shadow-lg min-w-[320px] max-w-[400px] max-h-[500px] ${
      selected ? 'border-purple-500' : 'border-gray-300'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-400" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-500" />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <FileText size={18} />
          <span className="font-medium">{data.label}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        {/* Upload Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Document
          </label>
          
          {!uploadedFile ? (
            <div
              onClick={handleUploadClick}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
            >
              <Upload className="mx-auto mb-2 text-gray-400" size={32} />
              <p className="text-sm text-gray-600 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                PDF, Word, Excel, PowerPoint, Text files
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getFileIcon(uploadedFile.type)}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{uploadedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(uploadedFile.size)} • {new Date(uploadedFile.lastModified).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
            className="hidden"
          />
        </div>

        {/* Processing Button */}
        {uploadedFile && !extractedText && !isLoading && (
          <button
            onClick={() => handleFileSelect({ target: { files: [uploadedFile] } } as any)}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
          >
            <FileText size={16} />
            Process Document
          </button>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 p-4 bg-purple-50 rounded-md">
            <Loader2 className="animate-spin text-purple-600" size={16} />
            <span className="text-sm text-purple-700">Processing document...</span>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle size={16} className="text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Extracted Content Preview */}
        {extractedText && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Extracted Content ({extractedText.length} chars)
              </label>
              <button
                onClick={copyContent}
                className="text-gray-500 hover:text-purple-600 transition-colors"
                title="Copy content"
              >
                <Copy size={14} />
              </button>
            </div>
            <div className="max-h-24 overflow-y-auto p-3 bg-gray-50 border border-gray-200 rounded-md">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                {extractedText.substring(0, 200)}
                {extractedText.length > 200 && '...'}
              </pre>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="text-xs text-gray-500">
          {extractedText ? (
            <span className="text-green-600">✓ Document processed successfully</span>
          ) : uploadedFile ? (
            <span>Document uploaded, ready to process</span>
          ) : (
            <span>Upload a document to extract content</span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-gray-400" />
    </div>
  );
};

export default DocumentUploadNode;
