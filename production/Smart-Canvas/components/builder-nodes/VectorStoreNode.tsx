"use client";
import React, { memo, ChangeEvent } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export interface VectorStoreNodeData {
  label?: string;
  storeType?: 'pinecone' | 'chroma' | 'faiss';
  apiKey?: string;
  operation?: 'store' | 'retrieve' | 'search' | 'delete';
  indexName?: string;
  namespace?: string;
  topK?: number;
  similarityThreshold?: number;
  metadataFilter?: string;
  onNodeDataChange?: (id: string, data: Partial<Omit<VectorStoreNodeData, 'onNodeDataChange'>>) => void;
  width?: number;
}

const storeTypeOptions = {
  pinecone: {
    name: 'Pinecone',
    requiresApiKey: true,
    operations: ['store', 'retrieve', 'search', 'delete']
  },
  chroma: {
    name: 'Chroma',
    requiresApiKey: false,
    operations: ['store', 'retrieve', 'search', 'delete']
  },
  faiss: {
    name: 'FAISS',
    requiresApiKey: false,
    operations: ['store', 'retrieve', 'search']
  }
};

interface VectorStoreNodeProps extends NodeProps<VectorStoreNodeData> {
  onCopyApiKeyToAllVectorStores?: (apiKey: string) => void;
}

const VectorStoreNode: React.FC<VectorStoreNodeProps> = ({ id, data, isConnectable, onCopyApiKeyToAllVectorStores }) => {
  const { 
    label = 'Vector Store', 
    storeType = 'pinecone',
    apiKey = '',
    operation = 'search',
    indexName = '',
    namespace = '',
    topK = 5,
    similarityThreshold = 0.7,
    metadataFilter = '',
    width = 180,
  } = data;

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    let newData: Partial<VectorStoreNodeData> = { [name]: value };

    // Convert numeric fields
    if (name === 'topK') {
      newData.topK = parseInt(value) || 5;
    } else if (name === 'similarityThreshold') {
      newData.similarityThreshold = parseFloat(value) || 0.7;
    }

    // Reset operation if store type changes and operation is not supported
    if (name === 'storeType') {
      const newStoreType = value as keyof typeof storeTypeOptions;
      const supportedOps = storeTypeOptions[newStoreType]?.operations || [];
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

  const currentStoreConfig = storeTypeOptions[storeType];
  const supportedOperations = currentStoreConfig?.operations || [];

  return (
    <div style={{
      background: 'rgba(147, 51, 234, 0.15)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(147, 51, 234, 0.4)',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2), 0 0 8px rgba(147, 51, 234, 0.3)',
      width: width,
      maxWidth: 200,
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
          <label htmlFor={`storeType-${id}`} style={labelStyle}>Vector Store</label>
          <select
            id={`storeType-${id}`}
            name="storeType"
            value={storeType}
            onChange={handleInputChange}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5] cursor-pointer"
          >
            <option value="pinecone">Pinecone</option>
            <option value="chroma">Chroma</option>
            <option value="faiss">FAISS</option>
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

        {currentStoreConfig?.requiresApiKey && (
          <div>
            <label htmlFor={`apiKey-${id}`} style={labelStyle}>API Key</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input
                id={`apiKey-${id}`}
                type="password"
                name="apiKey"
                value={apiKey}
                onChange={handleInputChange}
                onPaste={(e) => e.stopPropagation()}
                style={inputStyle}
                className="focus:ring-1 focus:ring-[#fff5f5]"
                placeholder="Enter API Key..."
              />
              {apiKey && onCopyApiKeyToAllVectorStores && (
                <button
                  type="button"
                  title="Copy API Key to all Vector Store Nodes"
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
                  onClick={() => onCopyApiKeyToAllVectorStores(apiKey)}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/><rect x="3" y="3" width="10" height="10" rx="2"/></svg>
                </button>
              )}
            </div>
          </div>
        )}

        <div>
          <label htmlFor={`indexName-${id}`} style={labelStyle}>Index/Collection Name</label>
          <input
            id={`indexName-${id}`}
            type="text"
            name="indexName"
            value={indexName}
            onChange={handleInputChange}
            onPaste={(e) => e.stopPropagation()}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5]"
            placeholder="e.g., my-index"
          />
        </div>

        {storeType === 'pinecone' && (
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
              placeholder="e.g., documents"
            />
          </div>
        )}

        {(operation === 'search' || operation === 'retrieve') && (
          <>
            <div>
              <label htmlFor={`topK-${id}`} style={labelStyle}>Top K Results</label>
              <input
                id={`topK-${id}`}
                type="number"
                name="topK"
                value={topK}
                onChange={handleInputChange}
                onPaste={(e) => e.stopPropagation()}
                style={inputStyle}
                className="focus:ring-1 focus:ring-[#fff5f5]"
                min="1"
                max="100"
                placeholder="5"
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
          <label htmlFor={`metadataFilter-${id}`} style={labelStyle}>Metadata Filter (JSON)</label>
          <textarea
            id={`metadataFilter-${id}`}
            name="metadataFilter"
            value={metadataFilter}
            onChange={handleInputChange}
            onPaste={(e) => e.stopPropagation()}
            rows={2}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5]"
            placeholder='{"category": "docs"}'
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

export default memo(VectorStoreNode);
