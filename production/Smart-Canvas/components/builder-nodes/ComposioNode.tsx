"use client";
import React, { memo, ChangeEvent, useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import ToolsWindow from './ToolsWindow';

export interface ComposioNodeData {
  label?: string;
  toolActions?: string; // comma-separated actions, e.g., "gmail.send_email,github.create_issue"
  onNodeDataChange?: (id: string, data: Partial<Omit<ComposioNodeData, 'onNodeDataChange'>>) => void;
}

interface ComposioNodeProps extends NodeProps<ComposioNodeData> {
  onOpenToolsWindow?: () => void;
}

const toolkitOptions = [
  { slug: 'gmail', name: 'Gmail' },
  { slug: 'github', name: 'GitHub' },
  { slug: 'slack', name: 'Slack' },
  { slug: 'notion', name: 'Notion' },
  { slug: 'google_drive', name: 'Google Drive' },
  // Add more toolkits as needed
];

const ComposioNode: React.FC<ComposioNodeProps & { _forceRerender?: number }> = ({ id, data, isConnectable, onOpenToolsWindow, _forceRerender }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const selectedActionsList = (data.toolActions || '').split(',').map(t => t.trim()).filter(Boolean);

  // Dev API key is handled automatically - users don't need to see or configure it
  const devApiKey = 'ykv9efkzffsw4cr79xsi2g';

  const handleNodeConfigChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    if (data.onNodeDataChange) data.onNodeDataChange(id, { [name]: value });
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    fontSize: '0.75rem',
    color: '#1f2937',
    background: '#ffffff',
    border: '1px solid #d1d5db',
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
    <div className="bg-white border-2 rounded-lg shadow-lg min-w-[280px] border-gray-300">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-400" />

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <div className="flex-1">
            <input
              type="text"
              name="label"
              value={data.label ?? 'Action Tool'}
              onChange={handleNodeConfigChange}
              onPaste={(e) => e.stopPropagation()}
              className="bg-transparent border-none outline-none text-white font-medium w-full"
              placeholder="Node Label"
            />
            <div className="text-white/70 text-xs mt-0.5">300+ action tools</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* API Key section hidden - using hardcoded backend key */}
        <div className="relative">
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
                  if (onOpenToolsWindow) onOpenToolsWindow();
                  setShowDropdown(false);
                }}
              >
                + Add Tool
              </div>
            </div>
          )}
          <div 
            className="flex flex-wrap gap-2 mt-2"
          >
            {selectedActionsList.map(actionKey => (
              <div key={actionKey} className="bg-purple-100 text-purple-800 rounded-full px-3 py-1 text-xs flex items-center gap-1.5">
                <button
                  type="button"
                  className="text-purple-600 hover:text-purple-800 leading-none mr-1.5"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1em', padding: '0'}}
                  onClick={() => {
                    const updated = selectedActionsList.filter(a => a !== actionKey);
                    if (data.onNodeDataChange) data.onNodeDataChange(id, { toolActions: updated.join(',') });
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

export default memo(ComposioNode); 