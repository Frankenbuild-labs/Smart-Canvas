"use client";
import React, { memo, ChangeEvent } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export interface CoordinatorNodeData {
  label?: string;
  agentName?: string;
  agentDescription?: string;
  capabilities?: string;
  systemPrompt?: string;
  apiKey?: string;
  modelProvider?: 'coordinator';
  modelName?: string;
  onNodeDataChange?: (id: string, data: Partial<Omit<CoordinatorNodeData, 'onNodeDataChange'>>) => void;
  width?: number;
}

const modelOptions = {
  coordinator: ['metatron-pydantic-coordinator'],
};

interface CoordinatorNodeProps extends NodeProps<CoordinatorNodeData> {
  onCopyApiKeyToAllCoordinators?: (apiKey: string) => void;
}

const CoordinatorNode: React.FC<CoordinatorNodeProps> = ({ id, data, isConnectable, onCopyApiKeyToAllCoordinators }) => {
  const { 
    label = 'Coordinator Node', 
    agentName = '',
    agentDescription = '',
    capabilities = '',
    systemPrompt = '', 
    apiKey = '', 
    modelProvider = 'coordinator',
    modelName = modelOptions.coordinator[0],
    width = 180,
  } = data;

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    let newData: Partial<CoordinatorNodeData> = { [name]: value };

    if (name === 'modelProvider') {
      const newProvider = value as keyof typeof modelOptions;
      if (modelOptions[newProvider] && modelOptions[newProvider].length > 0) {
        newData.modelName = modelOptions[newProvider][0];
      } else {
        newData.modelName = undefined;
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

  return (
    <div style={{
      background: 'rgba(20, 184, 166, 0.15)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(20, 184, 166, 0.4)',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2), 0 0 8px rgba(20, 184, 166, 0.3)',
      width: width,
      maxWidth: 200,
      color: '#fff5f5',
      fontSize: '0.85rem',
    }}>
      <div style={{
        padding: '0.5rem',
        borderBottom: '1px solid rgba(255, 245, 245, 0.1)',
        background: 'rgba(147, 51, 234, 0.15)', // Purple header
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
          placeholder="Coordinator Label"
        />
      </div>
      <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div>
          <label htmlFor={`agentName-${id}`} style={labelStyle}>Agent Name</label>
          <input
            id={`agentName-${id}`}
            type="text"
            name="agentName"
            value={agentName || ''}
            onChange={handleInputChange}
            onPaste={(e) => e.stopPropagation()}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5]"
            placeholder="e.g., CodeMaster, WriteWell"
          />
        </div>
        <div>
          <label htmlFor={`agentDescription-${id}`} style={labelStyle}>Agent Description</label>
          <textarea
            id={`agentDescription-${id}`}
            name="agentDescription"
            value={agentDescription ?? ''}
            onChange={handleInputChange}
            onPaste={(e) => e.stopPropagation()}
            rows={2}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5]"
            placeholder="e.g., Python Development Specialist"
          />
        </div>
        <div>
          <label htmlFor={`capabilities-${id}`} style={labelStyle}>Capabilities</label>
          <textarea
            id={`capabilities-${id}`}
            name="capabilities"
            value={capabilities ?? ''}
            onChange={handleInputChange}
            onPaste={(e) => e.stopPropagation()}
            rows={2}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5]"
            placeholder="e.g., code review, debugging, testing"
          />
        </div>
        <div>
          <label htmlFor={`modelProvider-${id}`} style={labelStyle}>Model Provider</label>
          <select
            id={`modelProvider-${id}`}
            name="modelProvider"
            value={modelProvider || 'coordinator'}
            onChange={handleInputChange}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5] cursor-pointer"
            disabled
          >
            <option value="coordinator">Coordinator</option>
          </select>
        </div>
        <div>
          <label htmlFor={`modelName-${id}`} style={labelStyle}>Model Name</label>
          <select
            id={`modelName-${id}`}
            name="modelName"
            value={modelName || modelOptions.coordinator[0]}
            onChange={handleInputChange}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5] cursor-pointer"
            disabled
          >
            {modelOptions.coordinator.map((model) => (
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
            value={systemPrompt ?? ''}
            onChange={handleInputChange}
            onPaste={(e) => e.stopPropagation()}
            rows={2}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5]"
            placeholder="e.g., You are a specialized agent coordinator."
          />
        </div>
        <div>
          <label htmlFor={`apiKey-${id}`} style={labelStyle}>API Key</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              id={`apiKey-${id}`}
              type="password"
              name="apiKey"
              value={apiKey || ''}
              onChange={handleInputChange}
              onPaste={(e) => e.stopPropagation()}
              style={inputStyle}
              className="focus:ring-1 focus:ring-[#fff5f5]"
              placeholder="Enter API Key..."
            />
            {apiKey && onCopyApiKeyToAllCoordinators && (
              <button
                type="button"
                title="Copy API Key to all Coordinator Nodes"
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
                onClick={() => onCopyApiKeyToAllCoordinators(apiKey)}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/><rect x="3" y="3" width="10" height="10" rx="2"/></svg>
              </button>
            )}
          </div>
        </div>
      </div>
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        isConnectable={isConnectable} 
        style={{
          background: '#9333ea', // Purple handle
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
          background: '#9333ea', // Purple handle
          width: '0.75rem',
          height: '0.75rem',
        }}
      />
    </div>
  );
};

export default memo(CoordinatorNode);
