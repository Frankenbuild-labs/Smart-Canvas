"use client";
import React, { memo, ChangeEvent } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export interface MemoryNodeData {
  label?: string;
  memoryType?: 'conversation' | 'context' | 'persistent' | 'vector' | 'semantic';
  storageBackend?: 'local' | 'redis' | 'postgresql' | 'mongodb' | 'pinecone';
  operation?: 'store' | 'retrieve' | 'search' | 'clear' | 'update';
  memoryKey?: string;
  namespace?: string;
  maxTokens?: number;
  retentionDays?: number;
  searchQuery?: string;
  similarityThreshold?: number;
  connectionString?: string;
  onNodeDataChange?: (id: string, data: Partial<Omit<MemoryNodeData, 'onNodeDataChange'>>) => void;
  width?: number;
}

const memoryTypeOptions = {
  conversation: {
    name: 'Conversation Memory',
    operations: ['store', 'retrieve', 'clear'],
    supportsSearch: false,
    description: 'Store and retrieve conversation history'
  },
  context: {
    name: 'Context Memory',
    operations: ['store', 'retrieve', 'update', 'clear'],
    supportsSearch: false,
    description: 'Maintain context across interactions'
  },
  persistent: {
    name: 'Persistent Memory',
    operations: ['store', 'retrieve', 'update', 'clear'],
    supportsSearch: false,
    description: 'Long-term persistent storage'
  },
  vector: {
    name: 'Vector Memory',
    operations: ['store', 'search', 'clear'],
    supportsSearch: true,
    description: 'Semantic search in vector space'
  },
  semantic: {
    name: 'Semantic Memory',
    operations: ['store', 'search', 'retrieve', 'clear'],
    supportsSearch: true,
    description: 'Semantic understanding and retrieval'
  }
};

const storageBackendOptions = {
  local: { name: 'Local Storage', requiresConnection: false },
  redis: { name: 'Redis', requiresConnection: true },
  postgresql: { name: 'PostgreSQL', requiresConnection: true },
  mongodb: { name: 'MongoDB', requiresConnection: true },
  pinecone: { name: 'Pinecone', requiresConnection: true }
};

interface MemoryNodeProps extends NodeProps<MemoryNodeData> {
  onCopyConnectionToAllMemory?: (connectionString: string) => void;
}

const MemoryNode: React.FC<MemoryNodeProps> = ({ id, data, isConnectable, onCopyConnectionToAllMemory }) => {
  const { 
    label = 'Memory', 
    memoryType = 'conversation',
    storageBackend = 'local',
    operation = 'store',
    memoryKey = '',
    namespace = '',
    maxTokens = 4000,
    retentionDays = 30,
    searchQuery = '',
    similarityThreshold = 0.7,
    connectionString = '',
    width = 200,
  } = data;

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    let newData: Partial<MemoryNodeData> = { [name]: value };

    // Convert numeric fields
    if (name === 'maxTokens' || name === 'retentionDays') {
      newData[name] = parseInt(value) || (name === 'maxTokens' ? 4000 : 30);
    } else if (name === 'similarityThreshold') {
      newData.similarityThreshold = parseFloat(value) || 0.7;
    }

    // Reset operation if memory type changes and operation is not supported
    if (name === 'memoryType') {
      const newMemoryType = value as keyof typeof memoryTypeOptions;
      const supportedOps = memoryTypeOptions[newMemoryType]?.operations || [];
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

  const currentMemoryConfig = memoryTypeOptions[memoryType];
  const currentStorageConfig = storageBackendOptions[storageBackend];
  const supportedOperations = currentMemoryConfig?.operations || [];

  return (
    <div style={{
      background: 'rgba(147, 51, 234, 0.15)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(147, 51, 234, 0.4)',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2), 0 0 8px rgba(147, 51, 234, 0.3)',
      width: width,
      maxWidth: 220,
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
          <label htmlFor={`memoryType-${id}`} style={labelStyle}>Memory Type</label>
          <select
            id={`memoryType-${id}`}
            name="memoryType"
            value={memoryType}
            onChange={handleInputChange}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5] cursor-pointer"
          >
            {Object.entries(memoryTypeOptions).map(([key, config]) => (
              <option key={key} value={key}>
                {config.name}
              </option>
            ))}
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

        <div>
          <label htmlFor={`storageBackend-${id}`} style={labelStyle}>Storage Backend</label>
          <select
            id={`storageBackend-${id}`}
            name="storageBackend"
            value={storageBackend}
            onChange={handleInputChange}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5] cursor-pointer"
          >
            {Object.entries(storageBackendOptions).map(([key, config]) => (
              <option key={key} value={key}>
                {config.name}
              </option>
            ))}
          </select>
        </div>

        {currentStorageConfig?.requiresConnection && (
          <div>
            <label htmlFor={`connectionString-${id}`} style={labelStyle}>Connection String</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input
                id={`connectionString-${id}`}
                type="password"
                name="connectionString"
                value={connectionString}
                onChange={handleInputChange}
                onPaste={(e) => e.stopPropagation()}
                style={inputStyle}
                className="focus:ring-1 focus:ring-[#fff5f5]"
                placeholder={
                  storageBackend === 'redis' ? 'redis://host:6379' :
                  storageBackend === 'postgresql' ? 'postgresql://user:pass@host:5432/db' :
                  storageBackend === 'mongodb' ? 'mongodb://user:pass@host:27017/db' :
                  storageBackend === 'pinecone' ? 'pinecone-api-key' :
                  'Connection string...'
                }
              />
              {connectionString && onCopyConnectionToAllMemory && (
                <button
                  type="button"
                  title="Copy Connection to all Memory Nodes"
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
                  onClick={() => onCopyConnectionToAllMemory(connectionString)}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/><rect x="3" y="3" width="10" height="10" rx="2"/></svg>
                </button>
              )}
            </div>
          </div>
        )}

        <div>
          <label htmlFor={`memoryKey-${id}`} style={labelStyle}>Memory Key</label>
          <input
            id={`memoryKey-${id}`}
            type="text"
            name="memoryKey"
            value={memoryKey}
            onChange={handleInputChange}
            onPaste={(e) => e.stopPropagation()}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5]"
            placeholder="e.g., user_123_conversation"
          />
        </div>

        {(memoryType === 'vector' || memoryType === 'semantic') && (
          <div>
            <label htmlFor={`namespace-${id}`} style={labelStyle}>Namespace (Optional)</label>
            <input
              id={`namespace-${id}`}
              type="text"
              name="namespace"
              value={namespace}
              onChange={handleInputChange}
              onPaste={(e) => e.stopPropagation()}
              style={inputStyle}
              className="focus:ring-1 focus:ring-[#fff5f5]"
              placeholder="e.g., user_memories"
            />
          </div>
        )}

        {currentMemoryConfig?.supportsSearch && operation === 'search' && (
          <>
            <div>
              <label htmlFor={`searchQuery-${id}`} style={labelStyle}>Search Query</label>
              <input
                id={`searchQuery-${id}`}
                type="text"
                name="searchQuery"
                value={searchQuery}
                onChange={handleInputChange}
                onPaste={(e) => e.stopPropagation()}
                style={inputStyle}
                className="focus:ring-1 focus:ring-[#fff5f5]"
                placeholder="What to search for..."
              />
            </div>
            
            <div>
              <label htmlFor={`similarityThreshold-${id}`} style={labelStyle}>Similarity Threshold</label>
              <input
                id={`similarityThreshold-${id}`}
                type="number"
                name="similarityThreshold"
                value={similarityThreshold}
                onChange={handleInputChange}
                onPaste={(e) => e.stopPropagation()}
                style={inputStyle}
                className="focus:ring-1 focus:ring-[#fff5f5]"
                min="0"
                max="1"
                step="0.1"
                placeholder="0.7"
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor={`maxTokens-${id}`} style={labelStyle}>Max Tokens</label>
          <input
            id={`maxTokens-${id}`}
            type="number"
            name="maxTokens"
            value={maxTokens}
            onChange={handleInputChange}
            onPaste={(e) => e.stopPropagation()}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5]"
            min="100"
            max="32000"
            placeholder="4000"
          />
        </div>

        <div>
          <label htmlFor={`retentionDays-${id}`} style={labelStyle}>Retention (Days)</label>
          <input
            id={`retentionDays-${id}`}
            type="number"
            name="retentionDays"
            value={retentionDays}
            onChange={handleInputChange}
            onPaste={(e) => e.stopPropagation()}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5]"
            min="1"
            max="365"
            placeholder="30"
          />
        </div>
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

export default memo(MemoryNode);
