"use client";
import React, { memo, ChangeEvent } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export interface FileStorageNodeData {
  label?: string;
  storageProvider?: 'aws-s3';
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  bucketName?: string;
  operation?: 'upload' | 'download' | 'list' | 'delete' | 'exists';
  fileName?: string;
  filePath?: string;
  prefix?: string; // For list operations
  contentType?: string;
  makePublic?: boolean;
  onNodeDataChange?: (id: string, data: Partial<Omit<FileStorageNodeData, 'onNodeDataChange'>>) => void;
  width?: number;
}

const storageProviderOptions = {
  'aws-s3': {
    name: 'AWS S3',
    operations: ['upload', 'download', 'list', 'delete', 'exists'],
    requiresCredentials: true,
    requiresBucket: true
  }
};

interface FileStorageNodeProps extends NodeProps<FileStorageNodeData> {
  onCopyCredentialsToAllFileStorage?: (accessKeyId: string, secretAccessKey: string, region: string) => void;
}

const FileStorageNode: React.FC<FileStorageNodeProps> = ({ id, data, isConnectable, onCopyCredentialsToAllFileStorage }) => {
  const { 
    label = 'File Storage', 
    storageProvider = 'aws-s3',
    accessKeyId = '',
    secretAccessKey = '',
    region = 'us-east-1',
    bucketName = '',
    operation = 'upload',
    fileName = '',
    filePath = '',
    prefix = '',
    contentType = 'application/octet-stream',
    makePublic = false,
    width = 220,
  } = data;

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    let newData: Partial<FileStorageNodeData> = {};

    if (type === 'checkbox') {
      const checked = (event.target as HTMLInputElement).checked;
      newData[name as keyof FileStorageNodeData] = checked as any;
    } else {
      newData[name as keyof FileStorageNodeData] = value as any;
    }

    // Reset operation if storage provider changes and operation is not supported
    if (name === 'storageProvider') {
      const newProvider = value as keyof typeof storageProviderOptions;
      const supportedOps = storageProviderOptions[newProvider]?.operations || [];
      if (!supportedOps.includes(operation)) {
        newData.operation = supportedOps[0] as any;
      }
    }
    
    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, newData);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    fontSize: '0.75rem',
    color: '#fff5f5',
    background: 'rgba(255, 245, 245, 0.05)',
    border: '1px solid rgba(255, 245, 245, 0.1)',
    borderRadius: '0.375rem',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: 'rgba(255, 245, 245, 0.7)',
    marginBottom: '0.25rem'
  };

  const currentProviderConfig = storageProviderOptions[storageProvider];
  const supportedOperations = currentProviderConfig?.operations || [];

  return (
    <div style={{
      background: 'rgba(147, 51, 234, 0.15)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(147, 51, 234, 0.4)',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2), 0 0 8px rgba(147, 51, 234, 0.3)',
      width: width,
      maxWidth: 240,
      color: '#fff5f5',
      fontSize: '0.85rem',
    }}>
      <div style={{
        padding: '0.5rem',
        borderBottom: '1px solid rgba(255, 245, 245, 0.1)',
      }}>
        <input
          type="text"
          name="label"
          value={label}
          onChange={handleInputChange}
          onPaste={(e) => e.stopPropagation()}
          style={{
            fontSize: '0.85rem',
            fontWeight: '500',
            color: '#fff5f5',
            background: 'transparent',
            outline: 'none',
            border: 'none',
            width: '100%',
            padding: '0.15rem',
          }}
          className="focus:ring-1 focus:ring-[#fff5f5] rounded"
          placeholder="Node Label"
        />
      </div>
      <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div>
          <label htmlFor={`storageProvider-${id}`} style={labelStyle}>Storage Provider</label>
          <select
            id={`storageProvider-${id}`}
            name="storageProvider"
            value={storageProvider}
            onChange={handleInputChange}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5] cursor-pointer"
          >
            <option value="aws-s3">AWS S3</option>
          </select>
        </div>
        
        <div>
          <label htmlFor={`operation-${id}`} style={labelStyle}>Operation</label>
          <select
            id={`operation-${id}`}
            name="operation"
            value={operation}
            onChange={handleInputChange}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5] cursor-pointer"
          >
            {supportedOperations.map((op) => (
              <option key={op} value={op}>
                {op.charAt(0).toUpperCase() + op.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {currentProviderConfig?.requiresCredentials && (
          <>
            <div>
              <label htmlFor={`accessKeyId-${id}`} style={labelStyle}>Access Key ID</label>
              <input
                id={`accessKeyId-${id}`}
                type="password"
                name="accessKeyId"
                value={accessKeyId}
                onChange={handleInputChange}
                onPaste={(e) => e.stopPropagation()}
                style={inputStyle}
                className="focus:ring-1 focus:ring-[#fff5f5]"
                placeholder="AWS Access Key ID"
              />
            </div>

            <div>
              <label htmlFor={`secretAccessKey-${id}`} style={labelStyle}>Secret Access Key</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input
                  id={`secretAccessKey-${id}`}
                  type="password"
                  name="secretAccessKey"
                  value={secretAccessKey}
                  onChange={handleInputChange}
                  onPaste={(e) => e.stopPropagation()}
                  style={inputStyle}
                  className="focus:ring-1 focus:ring-[#fff5f5]"
                  placeholder="AWS Secret Access Key"
                />
                {accessKeyId && secretAccessKey && region && onCopyCredentialsToAllFileStorage && (
                  <button
                    type="button"
                    title="Copy Credentials to all File Storage Nodes"
                    style={{
                      background: 'rgba(255,255,255,0.32)',
                      border: '1.5px solid rgba(0,0,0,0.13)',
                      borderRadius: '0.4rem',
                      padding: '0 0.6rem',
                      marginLeft: '0.1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
                      backdropFilter: 'blur(8px)',
                      color: '#222',
                      fontSize: '0.95em',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      height: '2.25rem',
                      minHeight: '2.25rem',
                    }}
                    onClick={() => onCopyCredentialsToAllFileStorage(accessKeyId, secretAccessKey, region)}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/><rect x="3" y="3" width="10" height="10" rx="2"/></svg>
                  </button>
                )}
              </div>
            </div>

            <div>
              <label htmlFor={`region-${id}`} style={labelStyle}>Region</label>
              <select
                id={`region-${id}`}
                name="region"
                value={region}
                onChange={handleInputChange}
                style={inputStyle}
                className="focus:ring-1 focus:ring-[#fff5f5] cursor-pointer"
              >
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-west-1">US West (N. California)</option>
                <option value="us-west-2">US West (Oregon)</option>
                <option value="eu-west-1">Europe (Ireland)</option>
                <option value="eu-central-1">Europe (Frankfurt)</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
              </select>
            </div>
          </>
        )}

        {currentProviderConfig?.requiresBucket && (
          <div>
            <label htmlFor={`bucketName-${id}`} style={labelStyle}>Bucket Name</label>
            <input
              id={`bucketName-${id}`}
              type="text"
              name="bucketName"
              value={bucketName}
              onChange={handleInputChange}
              onPaste={(e) => e.stopPropagation()}
              style={inputStyle}
              className="focus:ring-1 focus:ring-[#fff5f5]"
              placeholder="my-bucket-name"
            />
          </div>
        )}

        {(operation === 'upload' || operation === 'download' || operation === 'delete' || operation === 'exists') && (
          <div>
            <label htmlFor={`fileName-${id}`} style={labelStyle}>File Name/Key</label>
            <input
              id={`fileName-${id}`}
              type="text"
              name="fileName"
              value={fileName}
              onChange={handleInputChange}
              onPaste={(e) => e.stopPropagation()}
              style={inputStyle}
              className="focus:ring-1 focus:ring-[#fff5f5]"
              placeholder="path/to/file.txt"
            />
          </div>
        )}

        {operation === 'list' && (
          <div>
            <label htmlFor={`prefix-${id}`} style={labelStyle}>Prefix (Optional)</label>
            <input
              id={`prefix-${id}`}
              type="text"
              name="prefix"
              value={prefix}
              onChange={handleInputChange}
              onPaste={(e) => e.stopPropagation()}
              style={inputStyle}
              className="focus:ring-1 focus:ring-[#fff5f5]"
              placeholder="folder/"
            />
          </div>
        )}

        {operation === 'upload' && (
          <>
            <div>
              <label htmlFor={`contentType-${id}`} style={labelStyle}>Content Type</label>
              <select
                id={`contentType-${id}`}
                name="contentType"
                value={contentType}
                onChange={handleInputChange}
                style={inputStyle}
                className="focus:ring-1 focus:ring-[#fff5f5] cursor-pointer"
              >
                <option value="application/octet-stream">Binary</option>
                <option value="text/plain">Text</option>
                <option value="application/json">JSON</option>
                <option value="image/jpeg">JPEG Image</option>
                <option value="image/png">PNG Image</option>
                <option value="application/pdf">PDF</option>
                <option value="text/csv">CSV</option>
              </select>
            </div>

            <div>
              <label htmlFor={`makePublic-${id}`} style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  id={`makePublic-${id}`}
                  type="checkbox"
                  name="makePublic"
                  checked={makePublic}
                  onChange={handleInputChange}
                  style={{ margin: 0 }}
                />
                Make File Public
              </label>
            </div>
          </>
        )}
      </div>
      
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        isConnectable={isConnectable} 
        style={{
          background: '#fff5f5',
          width: '0.75rem',
          height: '0.75rem',
        }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="output" 
        isConnectable={isConnectable} 
        style={{
          background: '#fff5f5',
          width: '0.75rem',
          height: '0.75rem',
        }}
      />
    </div>
  );
};

export default memo(FileStorageNode);
