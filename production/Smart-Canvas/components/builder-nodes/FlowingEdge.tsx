"use client";

import React from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';

export default function FlowingEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      <path
        id={`${id}-glow`}
        style={{
          stroke: 'rgba(255, 255, 255, 0.4)',
          strokeWidth: 6,
          filter: 'blur(4px)',
          animation: 'flowingGlow 4s linear infinite',
        }}
        className="react-flow__edge-path"
        d={edgePath}
      />
      <path
        id={`${id}-flow`}
        style={{
          stroke: 'white',
          strokeWidth: 2,
          strokeDasharray: '6 3',
          animation: 'flowingDash 0.75s linear infinite, flowingColor 4s linear infinite',
        }}
        className="react-flow__edge-path"
        d={edgePath}
      />
      <style jsx global>{`
        @keyframes flowingDash {
          from {
            stroke-dashoffset: 9;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes flowingColor {
          0% {
            stroke: #2E67F8;  /* Jedi blue */
            filter: drop-shadow(0 0 6px #2E67F8);
          }
          33% {
            stroke: #30BF78;  /* Jedi green */
            filter: drop-shadow(0 0 6px #30BF78);
          }
          66% {
            stroke: #FF3B3B;  /* Sith red */
            filter: drop-shadow(0 0 6px #FF3B3B);
          }
          100% {
            stroke: #2E67F8;  /* Back to blue */
            filter: drop-shadow(0 0 6px #2E67F8);
          }
        }
        @keyframes flowingGlow {
          0% {
            stroke: rgba(46, 103, 248, 0.4);  /* Jedi blue */
          }
          33% {
            stroke: rgba(48, 191, 120, 0.4);  /* Jedi green */
          }
          66% {
            stroke: rgba(255, 59, 59, 0.4);  /* Sith red */
          }
          100% {
            stroke: rgba(46, 103, 248, 0.4);  /* Back to blue */
          }
        }
      `}</style>
    </>
  );
} 