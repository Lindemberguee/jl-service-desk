import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import {
  Lightbulb, StickyNote, FileText, GitBranch, CheckSquare,
  GripVertical, Palette, Copy, Trash2,
} from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';

export interface CanvasNodeData {
  label: string;
  nodeType: string;
  description?: string;
  color?: string;
  [key: string]: unknown;
}

const NODE_COLORS = [
  '#3b82f6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
];

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

const handleStyle = (color: string, show: boolean) => ({
  background: color,
  opacity: show ? 1 : 0,
  transition: 'opacity 0.2s, transform 0.2s',
  transform: show ? 'scale(1)' : 'scale(0.5)',
});

function CanvasNode({ id, data, selected }: NodeProps) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState((data as CanvasNodeData).label || '');
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodeData = data as CanvasNodeData;
  const customColor = nodeData.color;
  const preset = getPreset(nodeData.nodeType || 'idea');
  const color = customColor || preset.color;
  const Icon = preset.icon;
  const { setNodes, setEdges } = useReactFlow();

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

  const setColor = useCallback((c: string) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, color: c } } : n));
  }, [id, setNodes]);

  const duplicateNode = useCallback(() => {
    setNodes(nds => {
      const original = nds.find(n => n.id === id);
      if (!original) return nds;
      const newNode = {
        ...original,
        id: `node_${Date.now()}_dup`,
        position: { x: original.position.x + 30, y: original.position.y + 30 },
        selected: false,
        data: { ...original.data },
      };
      return [...nds, newNode];
    });
  }, [id, setNodes]);

  const deleteNode = useCallback(() => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
  }, [id, setNodes, setEdges]);

  const showHandles = hovered || selected;

  return (
    <div
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ minWidth: 170, maxWidth: 300 }}
    >
      {/* Handles */}
      <Handle type="target" position={Position.Top}
        className="!w-2.5 !h-2.5 !border-2 !border-white/80 !rounded-full"
        style={handleStyle(color, !!showHandles)}
      />
      <Handle type="source" position={Position.Bottom}
        className="!w-2.5 !h-2.5 !border-2 !border-white/80 !rounded-full"
        style={handleStyle(color, !!showHandles)}
      />
      <Handle type="source" position={Position.Right} id="right"
        className="!w-2.5 !h-2.5 !border-2 !border-white/80 !rounded-full"
        style={handleStyle(color, !!showHandles)}
      />
      <Handle type="target" position={Position.Left} id="left"
        className="!w-2.5 !h-2.5 !border-2 !border-white/80 !rounded-full"
        style={handleStyle(color, !!showHandles)}
      />

      {/* Quick action bar */}
      {(hovered || selected) && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-card border border-border rounded-lg px-1 py-0.5 shadow-lg z-10 nopan nodrag">
          <Popover>
            <PopoverTrigger asChild>
              <button className="h-5 w-5 rounded flex items-center justify-center hover:bg-accent transition-colors">
                <Palette className="h-3 w-3 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" side="top">
              <div className="grid grid-cols-5 gap-1">
                {NODE_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-125"
                    style={{
                      background: c,
                      borderColor: c === color ? 'white' : 'transparent',
                    }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <button onClick={duplicateNode} className="h-5 w-5 rounded flex items-center justify-center hover:bg-accent transition-colors">
            <Copy className="h-3 w-3 text-muted-foreground" />
          </button>
          <button onClick={deleteNode} className="h-5 w-5 rounded flex items-center justify-center hover:bg-destructive/20 transition-colors">
            <Trash2 className="h-3 w-3 text-destructive" />
          </button>
        </div>
      )}

      {/* Card */}
      <div
        className="rounded-xl overflow-hidden transition-all duration-200"
        style={{
          background: 'hsl(222, 47%, 8%)',
          border: `2px solid ${selected ? color : 'hsl(222, 47%, 15%)'}`,
          boxShadow: selected
            ? `0 0 0 2px ${color}44, 0 8px 32px ${color}22`
            : hovered
              ? `0 4px 20px rgba(0,0,0,0.4)`
              : '0 2px 12px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header bar */}
        <div className="flex items-center gap-2 px-3 py-2" style={{ background: `${color}15` }}>
          <GripVertical className="h-3 w-3 text-white/25 shrink-0 cursor-grab" />
          <div
            className="h-5 w-5 rounded-md flex items-center justify-center shrink-0"
            style={{ background: `${color}25` }}
          >
            <Icon className="h-3 w-3" style={{ color }} />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: `${color}bb` }}>
            {preset.label}
          </span>
          {customColor && customColor !== preset.color && (
            <div className="ml-auto h-2.5 w-2.5 rounded-full" style={{ background: customColor }} />
          )}
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
              className="w-full bg-transparent text-sm text-white outline-none border-b border-white/20 pb-0.5 nopan nodrag"
              style={{ caretColor: color }}
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
