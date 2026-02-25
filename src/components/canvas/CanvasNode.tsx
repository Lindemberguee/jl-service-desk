import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Lightbulb, StickyNote, FileText, GitBranch, CheckSquare,
  GripVertical,
} from 'lucide-react';

export interface CanvasNodeData {
  label: string;
  nodeType: string;
  description?: string;
  color?: string;
  [key: string]: unknown;
}

export const NODE_PRESETS = [
  { type: 'idea', label: 'Ideia', icon: Lightbulb, color: '#3b82f6', bgLight: '#eff6ff', bgDark: '#1e3a5f' },
  { type: 'note', label: 'Nota', icon: StickyNote, color: '#f59e0b', bgLight: '#fffbeb', bgDark: '#422006' },
  { type: 'document', label: 'Documento', icon: FileText, color: '#06b6d4', bgLight: '#ecfeff', bgDark: '#0e3744' },
  { type: 'process', label: 'Processo', icon: GitBranch, color: '#22c55e', bgLight: '#f0fdf4', bgDark: '#14352a' },
  { type: 'task', label: 'Tarefa', icon: CheckSquare, color: '#8b5cf6', bgLight: '#f5f3ff', bgDark: '#2e1065' },
] as const;

export function getPreset(type: string) {
  return NODE_PRESETS.find(p => p.type === type) || NODE_PRESETS[0];
}

function CanvasNode({ data, selected }: NodeProps) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState((data as CanvasNodeData).label || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const nodeData = data as CanvasNodeData;
  const preset = getPreset(nodeData.nodeType || 'idea');
  const Icon = preset.icon;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    if (label.trim()) {
      (data as CanvasNodeData).label = label.trim();
    } else {
      setLabel((data as CanvasNodeData).label);
    }
  }, [label, data]);

  return (
    <div
      className="group relative"
      style={{
        minWidth: 160,
        maxWidth: 280,
      }}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !border-2 !border-white/80 !rounded-full transition-all"
        style={{ background: preset.color }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !border-2 !border-white/80 !rounded-full transition-all"
        style={{ background: preset.color }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2.5 !h-2.5 !border-2 !border-white/80 !rounded-full transition-all"
        style={{ background: preset.color }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2.5 !h-2.5 !border-2 !border-white/80 !rounded-full transition-all"
        style={{ background: preset.color }}
      />

      {/* Card */}
      <div
        className="rounded-xl overflow-hidden transition-shadow duration-200"
        style={{
          background: '#0f172a',
          border: `2px solid ${selected ? preset.color : '#1e293b'}`,
          boxShadow: selected
            ? `0 0 0 2px ${preset.color}44, 0 8px 32px ${preset.color}22`
            : '0 2px 12px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header bar */}
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ background: `${preset.color}18` }}
        >
          <GripVertical className="h-3 w-3 text-white/30 shrink-0 cursor-grab" />
          <div
            className="h-5 w-5 rounded-md flex items-center justify-center shrink-0"
            style={{ background: `${preset.color}30` }}
          >
            <Icon className="h-3 w-3" style={{ color: preset.color }} />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: `${preset.color}cc` }}>
            {preset.label}
          </span>
        </div>

        {/* Body */}
        <div className="px-3 py-2.5">
          {editing ? (
            <input
              ref={inputRef}
              value={label}
              onChange={e => setLabel(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') { setLabel((data as CanvasNodeData).label); setEditing(false); }
              }}
              className="w-full bg-transparent text-sm text-white outline-none border-b border-white/20 pb-0.5"
              style={{ caretColor: preset.color }}
            />
          ) : (
            <p
              className="text-sm text-white/90 font-medium cursor-text leading-snug"
              onDoubleClick={() => setEditing(true)}
              title="Clique duplo para editar"
            >
              {(data as CanvasNodeData).label}
            </p>
          )}
          {nodeData.description && (
            <p className="text-[11px] text-white/40 mt-1 leading-relaxed">{nodeData.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(CanvasNode);
