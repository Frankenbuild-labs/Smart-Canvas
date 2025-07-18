import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ArrowDownCircle } from 'lucide-react';
import { Button } from '../ui/button';

export interface PatternMetaNodeData {
  patternType: string;
  label: string;
  description: string;
  onExpand?: (id: string) => void;
  onCollapse?: (id: string) => void;
}

const PatternMetaNode: React.FC<NodeProps<PatternMetaNodeData>> = ({ id, data, isConnectable }) => {
  return (
    <div style={{
      background: 'rgba(255, 245, 245, 0.05)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(94, 234, 212, 0.4)',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2), 0 0 8px rgba(94, 234, 212, 0.3)',
      width: '15rem',
      color: '#fff5f5',
      minHeight: '7rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div className="flex items-center gap-2 mb-2">
        <ArrowDownCircle size={20} className="text-[#fff5f5]" />
        <span className="font-semibold text-base text-[#fff5f5]">{data.label}</span>
      </div>
      <div className="text-xs text-[#fff5f5]/70 text-center mb-3">{data.description}</div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-[#fff5f5]/10 text-[#fff5f5] border border-[#fff5f5]/20 hover:bg-[#fff5f5]/20"
          onClick={() => data.onExpand && data.onExpand(id)}
        >
          Expand
        </Button>
        {data.onCollapse && (
          <Button
            size="sm"
            className="bg-[#fff5f5]/10 text-[#fff5f5] border border-[#fff5f5]/20 hover:bg-[#fff5f5]/20"
            onClick={() => data.onCollapse && data.onCollapse(id)}
          >
            Collapse
          </Button>
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

export default PatternMetaNode; 