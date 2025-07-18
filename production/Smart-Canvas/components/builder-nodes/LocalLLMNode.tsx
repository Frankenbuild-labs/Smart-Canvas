"use client";
import React, { memo, ChangeEvent } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export interface LocalLLMNodeData {
  label?: string;
  provider?: 'ollama' | 'lm-studio' | 'custom';
  endpoint?: string;
  modelName?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
  healthCheck?: boolean;
  timeout?: number;
  onNodeDataChange?: (id: string, data: Partial<Omit<LocalLLMNodeData, 'onNodeDataChange'>>) => void;
  width?: number;
}

const providerOptions = {
  ollama: {
    name: 'Ollama',
    defaultEndpoint: 'http://localhost:11434',
    defaultModels: ['llama2', 'codellama', 'mistral', 'neural-chat', 'starcode'],
    supportsStreaming: true
  },
  'lm-studio': {
    name: 'LM Studio',
    defaultEndpoint: 'http://localhost:1234',
    defaultModels: ['local-model', 'custom-model'],
    supportsStreaming: true
  },
  custom: {
    name: 'Custom Endpoint',
    defaultEndpoint: 'http://localhost:8000',
    defaultModels: ['custom-model'],
    supportsStreaming: false
  }
};

interface LocalLLMNodeProps extends NodeProps<LocalLLMNodeData> {
  onCopyEndpointToAllLocalLLM?: (endpoint: string) => void;
}

const LocalLLMNode: React.FC<LocalLLMNodeProps> = ({ id, data, isConnectable, onCopyEndpointToAllLocalLLM }) => {
  const { 
    label = 'Local LLM', 
    provider = 'ollama',
    endpoint = '',
    modelName = '',
    systemPrompt = '',
    maxTokens = 2048,
    temperature = 0.7,
    topP = 0.9,
    stream = false,
    healthCheck = true,
    timeout = 30,
    width = 200,
  } = data;

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    let newData: Partial<LocalLLMNodeData> = {};

    if (type === 'checkbox') {
      const checked = (event.target as HTMLInputElement).checked;
      newData[name as keyof LocalLLMNodeData] = checked as any;
    } else if (name === 'maxTokens' || name === 'timeout') {
      newData[name] = parseInt(value) || (name === 'maxTokens' ? 2048 : 30);
    } else if (name === 'temperature' || name === 'topP') {
      newData[name] = parseFloat(value) || 0;
    } else {
      newData[name as keyof LocalLLMNodeData] = value as any;
    }

    // Set default endpoint and model when provider changes
    if (name === 'provider') {
      const newProvider = value as keyof typeof providerOptions;
      const providerConfig = providerOptions[newProvider];
      if (!endpoint || endpoint === providerOptions[provider]?.defaultEndpoint) {
        newData.endpoint = providerConfig.defaultEndpoint;
      }
      if (!modelName || !providerConfig.defaultModels.includes(modelName)) {
        newData.modelName = providerConfig.defaultModels[0];
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

  const currentProvider = providerOptions[provider];
  const currentEndpoint = endpoint || currentProvider.defaultEndpoint;
  const availableModels = currentProvider.defaultModels;

  return (
    <div style={{
      background: 'rgba(20, 184, 166, 0.15)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(20, 184, 166, 0.4)',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2), 0 0 8px rgba(20, 184, 166, 0.3)',
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
          <label htmlFor={`provider-${id}`} style={labelStyle}>Provider</label>
          <select
            id={`provider-${id}`}
            name="provider"
            value={provider}
            onChange={handleInputChange}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5] cursor-pointer"
          >
            {Object.entries(providerOptions).map(([key, config]) => (
              <option key={key} value={key}>
                {config.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`endpoint-${id}`} style={labelStyle}>Endpoint URL</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              id={`endpoint-${id}`}
              type="text"
              name="endpoint"
              value={currentEndpoint}
              onChange={handleInputChange}
              onPaste={(e) => e.stopPropagation()}
              style={inputStyle}
              className="focus:ring-1 focus:ring-[#fff5f5]"
              placeholder={currentProvider.defaultEndpoint}
            />
            {currentEndpoint && onCopyEndpointToAllLocalLLM && (
              <button
                type="button"
                title="Copy Endpoint to all Local LLM Nodes"
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
                onClick={() => onCopyEndpointToAllLocalLLM(currentEndpoint)}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/><rect x="3" y="3" width="10" height="10" rx="2"/></svg>
              </button>
            )}
          </div>
        </div>

        <div>
          <label htmlFor={`modelName-${id}`} style={labelStyle}>Model Name</label>
          <select
            id={`modelName-${id}`}
            name="modelName"
            value={modelName || availableModels[0]}
            onChange={handleInputChange}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5] cursor-pointer"
          >
            {availableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`systemPrompt-${id}`} style={labelStyle}>System Prompt</label>
          <textarea
            id={`systemPrompt-${id}`}
            name="systemPrompt"
            value={systemPrompt}
            onChange={handleInputChange}
            onPaste={(e) => e.stopPropagation()}
            rows={3}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5]"
            placeholder="You are a helpful assistant..."
          />
        </div>

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
            min="1"
            max="8192"
            placeholder="2048"
          />
        </div>

        <div>
          <label htmlFor={`temperature-${id}`} style={labelStyle}>Temperature</label>
          <input
            id={`temperature-${id}`}
            type="number"
            name="temperature"
            value={temperature}
            onChange={handleInputChange}
            onPaste={(e) => e.stopPropagation()}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5]"
            min="0"
            max="2"
            step="0.1"
            placeholder="0.7"
          />
        </div>

        <div>
          <label htmlFor={`topP-${id}`} style={labelStyle}>Top P</label>
          <input
            id={`topP-${id}`}
            type="number"
            name="topP"
            value={topP}
            onChange={handleInputChange}
            onPaste={(e) => e.stopPropagation()}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5]"
            min="0"
            max="1"
            step="0.1"
            placeholder="0.9"
          />
        </div>

        <div>
          <label htmlFor={`timeout-${id}`} style={labelStyle}>Timeout (seconds)</label>
          <input
            id={`timeout-${id}`}
            type="number"
            name="timeout"
            value={timeout}
            onChange={handleInputChange}
            onPaste={(e) => e.stopPropagation()}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5]"
            min="5"
            max="300"
            placeholder="30"
          />
        </div>

        {currentProvider.supportsStreaming && (
          <div>
            <label htmlFor={`stream-${id}`} style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                id={`stream-${id}`}
                type="checkbox"
                name="stream"
                checked={stream}
                onChange={handleInputChange}
                style={{ margin: 0 }}
              />
              Enable Streaming
            </label>
          </div>
        )}

        <div>
          <label htmlFor={`healthCheck-${id}`} style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              id={`healthCheck-${id}`}
              type="checkbox"
              name="healthCheck"
              checked={healthCheck}
              onChange={handleInputChange}
              style={{ margin: 0 }}
            />
            Health Check
          </label>
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

export default memo(LocalLLMNode);
