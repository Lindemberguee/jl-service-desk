import { memo, useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react';
import { X } from 'lucide-react';

export type EdgeStyle = 'bezier' | 'smoothstep' | 'straight';

export interface CustomEdgeData {
  label?: string;
  edgeStyle?: EdgeStyle;
  color?: string;
  animated?: boolean;
  strokeWidth?: number;
  neon?: boolean;
  [key: string]: unknown;
}

function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps) {
  const edgeData = (data || {}) as CustomEdgeData;
  const [hovered, setHovered] = useState(false);

  const style = edgeData.edgeStyle || 'bezier';
  const color = edgeData.color || '#3b82f6';
  const strokeWidth = edgeData.strokeWidth || 2.3;

  const pathArgs = { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition };

  let edgePath = '';
  let labelX = 0;
  let labelY = 0;

  if (style === 'smoothstep') {
    [edgePath, labelX, labelY] = getSmoothStepPath({ ...pathArgs, borderRadius: 14 });
  } else if (style === 'straight') {
    [edgePath, labelX, labelY] = getStraightPath(pathArgs);
  } else {
    [edgePath, labelX, labelY] = getBezierPath(pathArgs);
  }

  const effectiveStroke = selected || hovered ? strokeWidth + 0.7 : strokeWidth;
  const glow = selected || hovered ? `drop-shadow(0 0 10px ${color}66)` : `drop-shadow(0 0 4px ${color}33)`;

  return (
    <>
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={22} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} />

      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: effectiveStroke,
          opacity: hovered || selected ? 1 : 0.92,
          filter: edgeData.neon ? `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 14px ${color})` : glow,
          transition: 'stroke-width 0.15s ease, opacity 0.2s ease, filter 0.2s ease',
        }}
      />

      {edgeData.animated && (
        <circle r="3.2" fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }}>
          <animateMotion dur="2.2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      <EdgeLabelRenderer>
        {edgeData.label ? (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="rounded-full border border-border/70 bg-card/95 px-2.5 py-1 text-[10px] font-medium text-foreground/85 shadow-md backdrop-blur-md"
          >
            {edgeData.label}
          </div>
        ) : null}

        {(hovered || selected) ? (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - (edgeData.label ? 24 : 0)}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              type="button"
              className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg hover:scale-110 transition-transform"
              title="Selecione a edge e use Delete para remover"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : null}
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(CustomEdge);
