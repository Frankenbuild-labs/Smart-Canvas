"use client";
import React, { memo, ChangeEvent } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export interface HuggingFaceNodeData {
  label?: string;
  apiKey?: string;
  modelName?: string;
  taskType?: 'text-generation' | 'text-classification' | 'embeddings' | 'summarization' | 'translation' | 'question-answering';
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  customEndpoint?: string;
  useCustomModel?: boolean;
  onNodeDataChange?: (id: string, data: Partial<Omit<HuggingFaceNodeData, 'onNodeDataChange'>>) => void;
  width?: number;
}

const taskTypeOptions = {
  'text-generation': {
    name: 'Text Generation',
    models: ['gpt2', 'microsoft/DialoGPT-medium', 'EleutherAI/gpt-neo-2.7B', 'facebook/blenderbot-400M-distill'],
    supportsParams: ['maxTokens', 'temperature', 'topP']
  },
  'text-classification': {
    name: 'Text Classification',
    models: ['cardiffnlp/twitter-roberta-base-sentiment-latest', 'facebook/bart-large-mnli', 'microsoft/DialoGPT-medium'],
    supportsParams: []
  },
  'embeddings': {
    name: 'Embeddings',
    models: ['sentence-transformers/all-MiniLM-L6-v2', 'sentence-transformers/all-mpnet-base-v2', 'microsoft/codebert-base'],
    supportsParams: []
  },
  'summarization': {
    name: 'Summarization',
    models: ['facebook/bart-large-cnn', 'google/pegasus-xsum', 't5-base'],
    supportsParams: ['maxTokens']
  },
  'translation': {
    name: 'Translation',
    models: ['Helsinki-NLP/opus-mt-en-de', 'Helsinki-NLP/opus-mt-en-fr', 't5-base'],
    supportsParams: ['maxTokens']
  },
  'question-answering': {
    name: 'Question Answering',
    models: ['deepset/roberta-base-squad2', 'distilbert-base-cased-distilled-squad', 'microsoft/DialoGPT-medium'],
    supportsParams: []
  }
};

interface HuggingFaceNodeProps extends NodeProps<HuggingFaceNodeData> {
  onCopyApiKeyToAllHuggingFace?: (apiKey: string) => void;
}

const HuggingFaceNode: React.FC<HuggingFaceNodeProps> = ({ id, data, isConnectable, onCopyApiKeyToAllHuggingFace }) => {
  const { 
    label = 'Hugging Face', 
    apiKey = '',
    modelName = '',
    taskType = 'text-generation',
    maxTokens = 100,
    temperature = 0.7,
    topP = 0.9,
    customEndpoint = '',
    useCustomModel = false,
    width = 200,
  } = data;

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    let newData: Partial<HuggingFaceNodeData> = {};

    if (type === 'checkbox') {
      const checked = (event.target as HTMLInputElement).checked;
      newData[name as keyof HuggingFaceNodeData] = checked as any;
    } else if (name === 'maxTokens') {
      newData.maxTokens = parseInt(value) || 100;
    } else if (name === 'temperature' || name === 'topP') {
      newData[name] = parseFloat(value) || 0;
    } else {
      newData[name as keyof HuggingFaceNodeData] = value as any;
    }

    // Reset model name if task type changes
    if (name === 'taskType') {
      const newTaskType = value as keyof typeof taskTypeOptions;
      const availableModels = taskTypeOptions[newTaskType]?.models || [];
      if (availableModels.length > 0 && !availableModels.includes(modelName)) {
        newData.modelName = availableModels[0];
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

  const currentTaskConfig = taskTypeOptions[taskType];
  const availableModels = currentTaskConfig?.models || [];
  const supportedParams = currentTaskConfig?.supportsParams || [];

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
          <label htmlFor={`taskType-${id}`} style={labelStyle}>Task Type</label>
          <select
            id={`taskType-${id}`}
            name="taskType"
            value={taskType}
            onChange={handleInputChange}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5] cursor-pointer"
          >
            {Object.entries(taskTypeOptions).map(([key, config]) => (
              <option key={key} value={key}>
                {config.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`useCustomModel-${id}`} style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              id={`useCustomModel-${id}`}
              type="checkbox"
              name="useCustomModel"
              checked={useCustomModel}
              onChange={handleInputChange}
              style={{ margin: 0 }}
            />
            Use Custom Model
          </label>
        </div>

        {useCustomModel ? (
          <div>
            <label htmlFor={`customEndpoint-${id}`} style={labelStyle}>Custom Model/Endpoint</label>
            <input
              id={`customEndpoint-${id}`}
              type="text"
              name="customEndpoint"
              value={customEndpoint}
              onChange={handleInputChange}
              onPaste={(e) => e.stopPropagation()}
              style={inputStyle}
              className="focus:ring-1 focus:ring-[#fff5f5]"
              placeholder="e.g., my-org/my-model"
            />
          </div>
        ) : (
          <div>
            <label htmlFor={`modelName-${id}`} style={labelStyle}>Model</label>
            <select
              id={`modelName-${id}`}
              name="modelName"
              value={modelName || availableModels[0] || ''}
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
        )}

        <div>
          <label htmlFor={`apiKey-${id}`} style={labelStyle}>API Key (Optional)</label>
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
              placeholder="For private models..."
            />
            {apiKey && onCopyApiKeyToAllHuggingFace && (
              <button
                type="button"
                title="Copy API Key to all Hugging Face Nodes"
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
                onClick={() => onCopyApiKeyToAllHuggingFace(apiKey)}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/><rect x="3" y="3" width="10" height="10" rx="2"/></svg>
              </button>
            )}
          </div>
        </div>

        {supportedParams.includes('maxTokens') && (
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
              max="2048"
              placeholder="100"
            />
          </div>
        )}

        {supportedParams.includes('temperature') && (
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
        )}

        {supportedParams.includes('topP') && (
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

export default memo(HuggingFaceNode);
