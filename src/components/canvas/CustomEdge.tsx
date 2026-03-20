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
  neon?: boolean;
  onDeleteEdge?: (id: string) => void;
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
  const strokeWidth = edgeData.strokeWidth || 2.25;

  const pathParams = { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition };

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (style === 'smoothstep') {
    const [path, lx, ly] = getSmoothStepPath({ ...pathParams, borderRadius: 14 });
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
    edgeData.onDeleteEdge?.(id);
    setEdges((eds) => eds.filter((e) => e.id !== id));
  };

  const effectiveColor = selected ? 'hsl(213, 94%, 68%)' : color;

  return (
    <>
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={22} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} />
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: effectiveColor,
          strokeWidth: selected || hovered ? strokeWidth + 0.85 : strokeWidth,
          filter: edgeData.neon
            ? `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 10px ${color}) drop-shadow(0 0 18px ${color})`
            : selected || hovered
              ? `drop-shadow(0 0 8px ${color}88)`
              : `drop-shadow(0 0 3px ${color}33)`,
          opacity: hovered || selected ? 1 : 0.92,
          transition: 'stroke-width 0.15s, stroke 0.15s, filter 0.2s, opacity 0.2s',
        }}
      />
      {edgeData.animated && (
        <circle r="3.2" fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }}>
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
      <EdgeLabelRenderer>
        {edgeData.label && (
          <div
            style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: 'all' }}
            className="bg-card/95 backdrop-blur-md border border-border/70 rounded-full px-2.5 py-1 text-[10px] font-medium text-foreground/85 shadow-md whitespace-nowrap"
          >
            {edgeData.label}
          </div>
        )}
        {(hovered || selected) && (
          <div
            style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - (edgeData.label ? 24 : 0)}px)`, pointerEvents: 'all' }}
            className="nopan nodrag"
          >
            <button onClick={onDelete} className="h-5.5 w-5.5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(CustomEdge);
