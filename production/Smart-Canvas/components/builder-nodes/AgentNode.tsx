"use client";
import React, { useState, useCallback, useEffect, ChangeEvent, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import ToolsWindow from './ToolsWindow';

// Updated model options for PydanticAI integration - LATEST MODELS ONLY
const modelOptions = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
  anthropic: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  google: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash-exp'],
  orchestrator: ['metatron-pydantic-orchestrator'],
};

// Updated AgentNodeData interface
export interface AgentNodeData {
  label?: string;
  systemPrompt?: string;
  llmApiKey?: string;
  modelProvider?: 'openai' | 'anthropic' | 'google' | 'orchestrator';
  modelName?: string;
  composioApiKey?: string;
  allowedTools?: string;
  onNodeDataChange?: (id: string, data: Partial<Omit<AgentNodeData, 'onNodeDataChange'>>) => void;
}

interface AgentNodeProps extends NodeProps<AgentNodeData> {
  onOpenToolsWindow?: () => void;
  onCopyFieldToAll?: (field: string, value: string) => void;
  onCopyApiKeyToAllAgents?: (apiKey: string) => void;
}

const AgentNode: React.FC<AgentNodeProps & { _forceRerender?: number }> = ({ id, data, isConnectable, onOpenToolsWindow, onCopyFieldToAll, onCopyApiKeyToAllAgents, _forceRerender }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectedActionsList = (data.allowedTools || '').split(',').map(t => t.trim()).filter(Boolean);

  const handleNodeConfigChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    let newData: Partial<AgentNodeData> = { [name]: value };
    if (name === 'modelProvider') {
      const newProvider = value as keyof typeof modelOptions;
      newData.modelName = modelOptions[newProvider]?.[0] || undefined;
    }
    if (name === 'composioApiKey') {
      setLocalComposioApiKey(value);
    }
    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, newData);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [data.systemPrompt]);

  const handleResize = (nodeId: string, newWidth: number, newHeight: number) => {
    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, { width: newWidth, height: newHeight });
    }
  };

  // Common styles
  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    fontSize: '0.75rem',
    color: '#cbfcfc', // Use agent node color
    background: 'rgba(180, 245, 245, 0.05)',
    border: '1px solid rgba(180, 245, 245, 0.1)',
    borderRadius: '0.375rem',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: 'rgba(180, 245, 245, 0.7)',
    marginBottom: '0.25rem'
  };

  return (
    <div className="bg-white border-2 rounded-lg shadow-lg min-w-[280px] border-gray-300">
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-400" />

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-3 rounded-t-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <div className="flex-1">
              <input
                type="text"
                name="label"
                value={data.label ?? 'Action Agent'}
                onChange={handleNodeConfigChange}
                onPaste={(e) => e.stopPropagation()}
                className="bg-transparent border-none outline-none text-white font-medium w-full"
                placeholder="Agent Label"
              />
              <div className="text-white/70 text-xs mt-0.5">LLM agent with 300+ tool access</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* LLM Configuration Section */}
          <div className="border-b border-gray-200 pb-3 mb-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">LLM Configuration</h4>
            <div className="space-y-2">
              <div>
                <label htmlFor={`modelProvider-${id}`} className="block text-sm font-medium text-gray-700 mb-1">Model Provider</label>
                <select
                  id={`modelProvider-${id}`}
                  name="modelProvider"
                  value={data.modelProvider || 'openai'}
                  onChange={handleNodeConfigChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#1f2937',
                  }}
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="orchestrator">Orchestrator</option>
                </select>
              </div>
              <div>
                <label htmlFor={`modelName-${id}`} className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
                <select
                  id={`modelName-${id}`}
                  name="modelName"
                  value={data.modelName || modelOptions[data.modelProvider || 'openai'][0]}
                  onChange={handleNodeConfigChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#1f2937',
                  }}
                >
                {(modelOptions[data.modelProvider || 'openai'] || []).map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
                {!(modelOptions[data.modelProvider || 'openai']?.length) && (
                  <option value="" disabled>No models available</option>
                )}
              </select>
              </div>
              <div>
                <label htmlFor={`llmApiKey-${id}`} className="block text-sm font-medium text-gray-700 mb-1">LLM API Key</label>
                <div className="flex items-center gap-2">
                  <input
                    id={`llmApiKey-${id}`}
                    type="password"
                    name="llmApiKey"
                    value={data.llmApiKey || ''}
                    onChange={handleNodeConfigChange}
                    onPaste={e => { e.stopPropagation(); }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter LLM API Key..."
                  />
                  {data.llmApiKey && onCopyApiKeyToAllAgents && (
                    <button
                      type="button"
                      title="Copy API Key to all Agents"
                      className="px-2 py-2 text-gray-500 hover:text-purple-600 transition-colors"
                      onClick={() => onCopyApiKeyToAllAgents(data.llmApiKey!)}
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/><rect x="3" y="3" width="10" height="10" rx="2"/></svg>
                    </button>
                  )}
              </div>
            </div>
              <div>
                <label htmlFor={`systemPrompt-${id}`} className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
                <textarea
                  id={`systemPrompt-${id}`}
                  name="systemPrompt"
                  value={data.systemPrompt || ''}
                  onChange={handleNodeConfigChange}
                  onPaste={(e) => e.stopPropagation()}
                  rows={3}
                  ref={textareaRef}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-gray-900 bg-white"
                  placeholder="e.g., You are a helpful agent..."
                />
              </div>
            </div>
          </div>
          {/* Tool Configuration Section */}
          <div className="border-t border-gray-200 pt-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Tool Configuration</h4>
            {/* API Key section hidden - using hardcoded backend key */}

            {/* Tools Selection */}
            <div className="relative mt-3">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Available Actions</label>
              </div>
              <div
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-500">
                  Select an action...
                </span>
                <svg width="20" height="20" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {showDropdown && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                  <div
                    className="px-3 py-2 cursor-pointer hover:bg-purple-50 text-gray-700 font-medium border-b border-gray-100"
                    onClick={() => {
                      if (onOpenToolsWindow) {
                        onOpenToolsWindow();
                      }
                      setShowDropdown(false);
                    }}
                  >
                    + Add Tool
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {selectedActionsList.map(actionKey => (
                <div key={actionKey} className="bg-purple-100 text-purple-800 rounded-full px-3 py-1 text-xs flex items-center gap-1.5">
                  <button
                    type="button"
                    className="text-purple-600 hover:text-purple-800 leading-none mr-1.5"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1em', padding: '0'}}
                    onClick={() => {
                      const updated = selectedActionsList.filter(a => a !== actionKey);
                      if (data.onNodeDataChange) data.onNodeDataChange(id, { allowedTools: updated.join(',') });
                    }}
                    aria-label={`Remove ${actionKey}`}
                  >
                    ×
                  </button>
                  {actionKey}
                </div>
              ))}
            </div>
          </div>
        </div>
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-gray-400" />
      </div>
  );
};

export default AgentNode;