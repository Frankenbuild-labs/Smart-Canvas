"use client";

import React, { memo, ChangeEvent, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export interface InputNodeData {
  label?: string;
  query?: string;
  chatMode?: boolean; // New: Toggle for chat mode
  onNodeDataChange?: (id: string, data: Partial<Omit<InputNodeData, 'onNodeDataChange'>>) => void;
}

const InputNode: React.FC<NodeProps<InputNodeData>> = ({ id, data, isConnectable }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, { [name]: value });
    }
  };

  const handleToggleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;
    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, { chatMode: checked });
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [data.query]);

  return (
    <div style={{
      background: 'rgba(147, 51, 234, 0.15)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(147, 51, 234, 0.4)',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2), 0 0 8px rgba(147, 51, 234, 0.3)',
      width: data.width || 160,
      maxWidth: 160,
      color: '#fff5f5',
      fontSize: '0.85rem',
      minHeight: 80,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
    }}>
      <div style={{
        padding: '0.5rem',
        borderBottom: '1px solid rgba(255, 245, 245, 0.1)',
      }}>
        <input
          type="text"
          name="label"
          value={data.label ?? 'Input Node'}
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
          placeholder="Input Label"
        />
      </div>
      <div style={{ padding: '0.5rem', flex: 1 }}>
        {/* Chat Mode Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '0.5rem',
          padding: '0.25rem',
          background: 'rgba(255, 245, 245, 0.03)',
          borderRadius: '0.25rem',
          border: '1px solid rgba(255, 245, 245, 0.1)'
        }}>
          <input
            type="checkbox"
            id={`chatMode-${id}`}
            checked={data.chatMode || false}
            onChange={handleToggleChange}
            style={{
              marginRight: '0.5rem',
              accentColor: '#069494'
            }}
          />
          <label htmlFor={`chatMode-${id}`} style={{
            fontSize: '0.7rem',
            fontWeight: '500',
            color: data.chatMode ? '#069494' : 'rgba(255, 245, 245, 0.7)',
            cursor: 'pointer'
          }}>
            💬 Chat Mode
          </label>
        </div>

        <label htmlFor={`query-${id}`} style={{
          display: 'block',
          fontSize: '0.75rem',
          fontWeight: '500',
          color: 'rgba(255, 245, 245, 0.7)',
          marginBottom: '0.15rem'
        }}>
          {data.chatMode ? 'Default Query (Optional)' : 'User Query'}
        </label>
        <textarea
          ref={textareaRef}
          id={`query-${id}`}
          name="query"
          value={data.query || ''}
          onChange={handleInputChange}
          onPaste={(e) => e.stopPropagation()}
          rows={1}
          disabled={data.chatMode}
          style={{
            width: '100%',
            padding: '0.3rem',
            fontSize: '0.75rem',
            color: data.chatMode ? 'rgba(255, 245, 245, 0.4)' : '#fff5f5',
            background: data.chatMode ? 'rgba(255, 245, 245, 0.02)' : 'rgba(255, 245, 245, 0.05)',
            border: '1px solid rgba(255, 245, 245, 0.1)',
            borderRadius: '0.375rem',
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            minHeight: 32,
            maxHeight: 200,
            transition: 'height 0.2s',
            cursor: data.chatMode ? 'not-allowed' : 'text'
          }}
          className="focus:ring-1 focus:ring-[#fff5f5]"
          placeholder={data.chatMode ? "Input will come from chat..." : "Enter the initial query..."}
        />
        {data.chatMode && (
          <div style={{
            fontSize: '0.65rem',
            color: '#069494',
            marginTop: '0.25rem',
            fontStyle: 'italic'
          }}>
            ✨ This flow will receive input from main chat
          </div>
        )}
      </div>
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

export default memo(InputNode); 