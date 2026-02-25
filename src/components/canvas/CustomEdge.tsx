import { memo, useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
  useReactFlow,
} from '@xyflow/react';
import { X } from 'lucide-react';

export type EdgeStyle = 'bezier' | 'smoothstep' | 'straight';

export interface CustomEdgeData {
  label?: string;
  edgeStyle?: EdgeStyle;
  color?: string;
  animated?: boolean;
  strokeWidth?: number;
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
  const { setEdges } = useReactFlow();
  const [hovered, setHovered] = useState(false);
  const edgeData = (data || {}) as CustomEdgeData;
  const style = edgeData.edgeStyle || 'bezier';
  const color = edgeData.color || 'hsl(213, 94%, 55%)';
  const strokeWidth = edgeData.strokeWidth || 2;

  const pathParams = { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition };

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (style === 'smoothstep') {
    const [path, lx, ly] = getSmoothStepPath({ ...pathParams, borderRadius: 12 });
    edgePath = path;
    labelX = lx;
    labelY = ly;
  } else if (style === 'straight') {
    const [path, lx, ly] = getStraightPath(pathParams);
    edgePath = path;
    labelX = lx;
    labelY = ly;
  } else {
    const [path, lx, ly] = getBezierPath(pathParams);
    edgePath = path;
    labelX = lx;
    labelY = ly;
  }

  const onDelete = () => {
    setEdges((eds) => eds.filter((e) => e.id !== id));
  };

  return (
    <>
      {/* Invisible wider path for easier selection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? 'hsl(213, 94%, 65%)' : color,
          strokeWidth: selected || hovered ? strokeWidth + 1 : strokeWidth,
          filter: selected ? `drop-shadow(0 0 6px ${color})` : undefined,
          transition: 'stroke-width 0.15s, stroke 0.15s, filter 0.2s',
        }}
      />
      {edgeData.animated && (
        <circle r="3" fill={color}>
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
      <EdgeLabelRenderer>
        {/* Label */}
        {edgeData.label && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="bg-card border border-border rounded-md px-2 py-0.5 text-[10px] font-medium text-foreground/80 shadow-sm whitespace-nowrap"
          >
            {edgeData.label}
          </div>
        )}
        {/* Delete button on hover/select */}
        {(hovered || selected) && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - (edgeData.label ? 20 : 0)}px)`,
              pointerEvents: 'all',
            }}
            className="nopan nodrag"
          >
            <button
              onClick={onDelete}
              className="h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(CustomEdge);
