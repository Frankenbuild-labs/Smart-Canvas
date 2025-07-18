"use client";
import React, { memo, ChangeEvent } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export interface DatabaseNodeData {
  label?: string;
  databaseType?: 'postgresql' | 'mongodb' | 'redis';
  connectionString?: string;
  query?: string;
  operation?: 'select' | 'insert' | 'update' | 'delete' | 'find' | 'insertOne' | 'updateOne' | 'deleteOne' | 'get' | 'set' | 'del' | 'exists';
  collection?: string; // For MongoDB
  key?: string; // For Redis
  value?: string; // For Redis
  timeout?: number; // For Redis
  onNodeDataChange?: (id: string, data: Partial<Omit<DatabaseNodeData, 'onNodeDataChange'>>) => void;
  width?: number;
}

const databaseTypeOptions = {
  postgresql: {
    name: 'PostgreSQL',
    operations: ['select', 'insert', 'update', 'delete'],
    requiresQuery: true,
    supportsCollection: false,
    supportsKeyValue: false
  },
  mongodb: {
    name: 'MongoDB',
    operations: ['find', 'insertOne', 'updateOne', 'deleteOne'],
    requiresQuery: true,
    supportsCollection: true,
    supportsKeyValue: false
  },
  redis: {
    name: 'Redis',
    operations: ['get', 'set', 'del', 'exists'],
    requiresQuery: false,
    supportsCollection: false,
    supportsKeyValue: true
  }
};

interface DatabaseNodeProps extends NodeProps<DatabaseNodeData> {
  onCopyConnectionToAllDatabases?: (connectionString: string) => void;
}

const DatabaseNode: React.FC<DatabaseNodeProps> = ({ id, data, isConnectable, onCopyConnectionToAllDatabases }) => {
  const { 
    label = 'Database', 
    databaseType = 'postgresql',
    connectionString = '',
    query = '',
    operation = 'select',
    collection = '',
    key = '',
    value = '',
    timeout = 30,
    width = 200,
  } = data;

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    let newData: Partial<DatabaseNodeData> = { [name]: value };

    // Convert numeric fields
    if (name === 'timeout') {
      newData.timeout = parseInt(value) || 30;
    }

    // Reset operation if database type changes and operation is not supported
    if (name === 'databaseType') {
      const newDbType = value as keyof typeof databaseTypeOptions;
      const supportedOps = databaseTypeOptions[newDbType]?.operations || [];
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

  const currentDbConfig = databaseTypeOptions[databaseType];
  const supportedOperations = currentDbConfig?.operations || [];

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
          <label htmlFor={`databaseType-${id}`} style={labelStyle}>Database Type</label>
          <select
            id={`databaseType-${id}`}
            name="databaseType"
            value={databaseType}
            onChange={handleInputChange}
            style={inputStyle}
            className="focus:ring-1 focus:ring-[#fff5f5] cursor-pointer"
          >
            <option value="postgresql">PostgreSQL</option>
            <option value="mongodb">MongoDB</option>
            <option value="redis">Redis</option>
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
                {op.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

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
                databaseType === 'postgresql' ? 'postgresql://user:pass@host:5432/db' :
                databaseType === 'mongodb' ? 'mongodb://user:pass@host:27017/db' :
                'redis://host:6379'
              }
            />
            {connectionString && onCopyConnectionToAllDatabases && (
              <button
                type="button"
                title="Copy Connection to all Database Nodes"
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
                onClick={() => onCopyConnectionToAllDatabases(connectionString)}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/><rect x="3" y="3" width="10" height="10" rx="2"/></svg>
              </button>
            )}
          </div>
        </div>

        {currentDbConfig?.supportsCollection && (
          <div>
            <label htmlFor={`collection-${id}`} style={labelStyle}>Collection Name</label>
            <input
              id={`collection-${id}`}
              type="text"
              name="collection"
              value={collection}
              onChange={handleInputChange}
              onPaste={(e) => e.stopPropagation()}
              style={inputStyle}
              className="focus:ring-1 focus:ring-[#fff5f5]"
              placeholder="e.g., users"
            />
          </div>
        )}

        {currentDbConfig?.supportsKeyValue && (
          <>
            <div>
              <label htmlFor={`key-${id}`} style={labelStyle}>Key</label>
              <input
                id={`key-${id}`}
                type="text"
                name="key"
                value={key}
                onChange={handleInputChange}
                onPaste={(e) => e.stopPropagation()}
                style={inputStyle}
                className="focus:ring-1 focus:ring-[#fff5f5]"
                placeholder="e.g., user:123"
              />
            </div>
            
            {(operation === 'set') && (
              <div>
                <label htmlFor={`value-${id}`} style={labelStyle}>Value</label>
                <input
                  id={`value-${id}`}
                  type="text"
                  name="value"
                  value={value}
                  onChange={handleInputChange}
                  onPaste={(e) => e.stopPropagation()}
                  style={inputStyle}
                  className="focus:ring-1 focus:ring-[#fff5f5]"
                  placeholder="Value to store"
                />
              </div>
            )}
            
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
                min="1"
                max="3600"
                placeholder="30"
              />
            </div>
          </>
        )}

        {currentDbConfig?.requiresQuery && (
          <div>
            <label htmlFor={`query-${id}`} style={labelStyle}>
              {databaseType === 'postgresql' ? 'SQL Query' : 
               databaseType === 'mongodb' ? 'MongoDB Query (JSON)' : 'Query'}
            </label>
            <textarea
              id={`query-${id}`}
              name="query"
              value={query}
              onChange={handleInputChange}
              onPaste={(e) => e.stopPropagation()}
              rows={3}
              style={inputStyle}
              className="focus:ring-1 focus:ring-[#fff5f5]"
              placeholder={
                databaseType === 'postgresql' ? 'SELECT * FROM users WHERE id = $1' :
                databaseType === 'mongodb' ? '{"name": "John"}' :
                'Enter your query...'
              }
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

export default memo(DatabaseNode);
