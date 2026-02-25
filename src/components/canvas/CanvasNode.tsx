import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import {
  Lightbulb, StickyNote, FileText, GitBranch, CheckSquare,
  GripVertical, Palette, Copy, Trash2, AlertTriangle,
  MessageSquare, Link2, Users, Star, Clock, Target,
  Zap, Flag, Bookmark, Heart, Shield, Award,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';

export interface CanvasNodeData {
  label: string;
  nodeType: string;
  description?: string;
  color?: string;
  emoji?: string;
  [key: string]: unknown;
}

const NODE_COLORS = [
  '#3b82f6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
  '#64748b', '#0ea5e9', '#a855f7', '#d946ef', '#84cc16',
];

export const NODE_PRESETS = [
  { type: 'idea', label: 'Ideia', icon: Lightbulb, color: '#3b82f6', category: 'core' },
  { type: 'note', label: 'Nota', icon: StickyNote, color: '#f59e0b', category: 'core' },
  { type: 'task', label: 'Tarefa', icon: CheckSquare, color: '#8b5cf6', category: 'core' },
  { type: 'document', label: 'Documento', icon: FileText, color: '#06b6d4', category: 'core' },
  { type: 'process', label: 'Processo', icon: GitBranch, color: '#22c55e', category: 'core' },
  { type: 'warning', label: 'Alerta', icon: AlertTriangle, color: '#ef4444', category: 'status' },
  { type: 'goal', label: 'Meta', icon: Target, color: '#10b981', category: 'status' },
  { type: 'milestone', label: 'Marco', icon: Flag, color: '#f97316', category: 'status' },
  { type: 'priority', label: 'Prioridade', icon: Star, color: '#eab308', category: 'status' },
  { type: 'comment', label: 'Comentário', icon: MessageSquare, color: '#64748b', category: 'comm' },
  { type: 'team', label: 'Equipe', icon: Users, color: '#0ea5e9', category: 'comm' },
  { type: 'link', label: 'Link', icon: Link2, color: '#a855f7', category: 'comm' },
  { type: 'trigger', label: 'Gatilho', icon: Zap, color: '#d946ef', category: 'special' },
  { type: 'bookmark', label: 'Favorito', icon: Bookmark, color: '#ec4899', category: 'special' },
  { type: 'reward', label: 'Conquista', icon: Award, color: '#84cc16', category: 'special' },
] as const;

export const NODE_CATEGORIES = [
  { id: 'core', label: 'Básicos' },
  { id: 'status', label: 'Status' },
  { id: 'comm', label: 'Comunicação' },
  { id: 'special', label: 'Especiais' },
];

export function getPreset(type: string) {
  return NODE_PRESETS.find(p => p.type === type) || NODE_PRESETS[0];
}

// Arrow-only handles: invisible handle + visible arrow outside the node
function ArrowHandle({ position, type, color, show, id }: {
  position: Position; type: 'source' | 'target'; color: string; show: boolean; id: string;
}) {
  const isOut = type === 'source';

  // Arrow SVG rotation
  const rotations: Record<string, number> = {
    [Position.Top]: isOut ? 0 : 180,
    [Position.Bottom]: isOut ? 180 : 0,
    [Position.Left]: isOut ? 270 : 90,
    [Position.Right]: isOut ? 90 : 270,
  };

  // Position the arrow OUTSIDE the node
  const arrowPositions: Record<string, React.CSSProperties> = {
    [`${Position.Top}-source`]: { top: -16, left: 'calc(50% - 14px)', transform: `rotate(${rotations[Position.Top]}deg)` },
    [`${Position.Top}-target`]: { top: -16, left: 'calc(50% + 4px)', transform: `rotate(${rotations[Position.Top]}deg)` },
    [`${Position.Bottom}-source`]: { bottom: -16, left: 'calc(50% - 14px)', transform: `rotate(${rotations[Position.Bottom]}deg)` },
    [`${Position.Bottom}-target`]: { bottom: -16, left: 'calc(50% + 4px)', transform: `rotate(${rotations[Position.Bottom]}deg)` },
    [`${Position.Left}-source`]: { left: -16, top: 'calc(50% - 14px)', transform: `rotate(${rotations[Position.Left]}deg)` },
    [`${Position.Left}-target`]: { left: -16, top: 'calc(50% + 4px)', transform: `rotate(${rotations[Position.Left]}deg)` },
    [`${Position.Right}-source`]: { right: -16, top: 'calc(50% - 14px)', transform: `rotate(${rotations[Position.Right]}deg)` },
    [`${Position.Right}-target`]: { right: -16, top: 'calc(50% + 4px)', transform: `rotate(${rotations[Position.Right]}deg)` },
  };

  const handlePositions: Record<string, React.CSSProperties> = {
    [`${Position.Top}-source`]: { left: 'calc(50% - 8px)' },
    [`${Position.Top}-target`]: { left: 'calc(50% + 10px)' },
    [`${Position.Bottom}-source`]: { left: 'calc(50% - 8px)' },
    [`${Position.Bottom}-target`]: { left: 'calc(50% + 10px)' },
    [`${Position.Left}-source`]: { top: 'calc(50% - 8px)' },
    [`${Position.Left}-target`]: { top: 'calc(50% + 10px)' },
    [`${Position.Right}-source`]: { top: 'calc(50% - 8px)' },
    [`${Position.Right}-target`]: { top: 'calc(50% + 10px)' },
  };

  const key = `${position}-${type}`;
  const arrowColor = isOut ? color : `${color}99`;

  return (
    <>
      {/* Invisible handle for xyflow connections */}
      <Handle
        type={type}
        position={position}
        id={id}
        style={{
          width: 14,
          height: 14,
          background: 'transparent',
          border: 'none',
          opacity: show ? 1 : 0,
          zIndex: 10,
          ...handlePositions[key],
        }}
      />
      {/* Visible arrow indicator */}
      <div
        className="absolute pointer-events-none"
        style={{
          opacity: show ? 0.85 : 0,
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          ...arrowPositions[key],
        }}
      >
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
          <path d="M6 0L11.5 9H0.5L6 0Z" fill={arrowColor} />
        </svg>
      </div>
    </>
  );
}

function CanvasNode({ id, data, selected }: NodeProps) {
  const [editing, setEditing] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [label, setLabel] = useState((data as CanvasNodeData).label || '');
  const [desc, setDesc] = useState((data as CanvasNodeData).description || '');
  const [hovered, setHovered] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const nodeData = data as CanvasNodeData;
  const customColor = nodeData.color;
  const preset = getPreset(nodeData.nodeType || 'idea');
  const color = customColor || preset.color;
  const Icon = preset.icon;
  const { setNodes, setEdges } = useReactFlow();

  // Sync label/desc when data changes externally (e.g., type switch)
  useEffect(() => { setLabel((data as CanvasNodeData).label || ''); }, [(data as CanvasNodeData).label]);
  useEffect(() => { setDesc((data as CanvasNodeData).description || ''); }, [(data as CanvasNodeData).description]);

  useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editing]);

  useEffect(() => {
    if (editingDesc && descRef.current) { descRef.current.focus(); }
  }, [editingDesc]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    if (label.trim()) {
      setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, label: label.trim() } } : n));
    } else {
      setLabel((data as CanvasNodeData).label);
    }
  }, [label, data, id, setNodes]);

  const commitDesc = useCallback(() => {
    setEditingDesc(false);
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, description: desc.trim() || undefined } } : n));
  }, [desc, id, setNodes]);

  const setColor = useCallback((c: string) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, color: c } } : n));
  }, [id, setNodes]);

  const switchType = useCallback((newType: string) => {
    const newPreset = getPreset(newType);
    setNodes(nds => nds.map(n => n.id === id ? {
      ...n,
      data: { ...n.data, nodeType: newType, color: newPreset.color },
    } : n));
    setTypeMenuOpen(false);
  }, [id, setNodes]);

  const currentIdx = NODE_PRESETS.findIndex(p => p.type === (nodeData.nodeType || 'idea'));

  const prevType = useCallback(() => {
    const idx = currentIdx <= 0 ? NODE_PRESETS.length - 1 : currentIdx - 1;
    switchType(NODE_PRESETS[idx].type);
  }, [currentIdx, switchType]);

  const nextType = useCallback(() => {
    const idx = currentIdx >= NODE_PRESETS.length - 1 ? 0 : currentIdx + 1;
    switchType(NODE_PRESETS[idx].type);
  }, [currentIdx, switchType]);

  const duplicateNode = useCallback(() => {
    setNodes(nds => {
      const original = nds.find(n => n.id === id);
      if (!original) return nds;
      return [...nds, {
        ...original,
        id: `node_${Date.now()}_dup`,
        position: { x: original.position.x + 30, y: original.position.y + 30 },
        selected: false,
        data: { ...original.data },
      }];
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
      style={{ minWidth: 180, maxWidth: 320 }}
    >
      {/* Arrow handles - no circles, arrows only, positioned outside */}
      {([
        { pos: Position.Top, type: 'source' as const, id: 'top-source' },
        { pos: Position.Top, type: 'target' as const, id: 'top-target' },
        { pos: Position.Bottom, type: 'source' as const, id: 'bottom-source' },
        { pos: Position.Bottom, type: 'target' as const, id: 'bottom-target' },
        { pos: Position.Left, type: 'source' as const, id: 'left-source' },
        { pos: Position.Left, type: 'target' as const, id: 'left-target' },
        { pos: Position.Right, type: 'source' as const, id: 'right-source' },
        { pos: Position.Right, type: 'target' as const, id: 'right-target' },
      ]).map(h => (
        <ArrowHandle
          key={h.id}
          position={h.pos}
          type={h.type}
          color={color}
          show={!!showHandles}
          id={h.id}
        />
      ))}

      {/* Quick action bar */}
      {(hovered || selected) && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-card border border-border rounded-lg px-1 py-0.5 shadow-xl z-10 nopan nodrag animate-in fade-in slide-in-from-bottom-1 duration-150">
          {/* Type switcher arrows */}
          <button onClick={prevType} className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-accent transition-colors" title="Tipo anterior">
            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {/* Type selector popover */}
          <Popover open={typeMenuOpen} onOpenChange={setTypeMenuOpen}>
            <PopoverTrigger asChild>
              <button
                className="h-6 px-1.5 rounded-md flex items-center gap-1 hover:bg-accent transition-colors"
                title="Alterar tipo"
              >
                <Icon className="h-3.5 w-3.5" style={{ color }} />
                <span className="text-[10px] font-semibold text-muted-foreground">{preset.label}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2" side="top">
              <p className="text-[10px] text-muted-foreground mb-1.5 font-bold uppercase tracking-wider">Alterar tipo</p>
              <div className="grid grid-cols-3 gap-1">
                {NODE_PRESETS.map(p => {
                  const PIcon = p.icon;
                  const isActive = p.type === (nodeData.nodeType || 'idea');
                  return (
                    <button
                      key={p.type}
                      onClick={() => switchType(p.type)}
                      className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 transition-all duration-200 ${
                        isActive
                          ? 'bg-accent ring-1 ring-primary/30 scale-105'
                          : 'hover:bg-accent/60 hover:scale-105'
                      }`}
                    >
                      <div
                        className="h-6 w-6 rounded-md flex items-center justify-center transition-colors duration-200"
                        style={{ background: `${p.color}20` }}
                      >
                        <PIcon className="h-3.5 w-3.5" style={{ color: p.color }} />
                      </div>
                      <span className="text-[9px] font-medium text-foreground/70 leading-none">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
          <button onClick={nextType} className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-accent transition-colors" title="Próximo tipo">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          <div className="w-px h-4 bg-border mx-0.5" />

          <Popover>
            <PopoverTrigger asChild>
              <button className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-accent transition-colors">
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2.5" side="top">
              <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Cor do nó</p>
              <div className="grid grid-cols-5 gap-1.5">
                {NODE_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="h-6 w-6 rounded-full border-2 transition-all hover:scale-125 hover:shadow-md"
                    style={{
                      background: c,
                      borderColor: c === color ? 'white' : 'transparent',
                      boxShadow: c === color ? `0 0 0 2px ${c}44` : undefined,
                    }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <button onClick={duplicateNode} className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-accent transition-colors" title="Duplicar">
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button onClick={deleteNode} className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-destructive/20 transition-colors" title="Excluir">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </button>
        </div>
      )}

      {/* Card */}
      <div
        className="rounded-xl overflow-hidden transition-all duration-300"
        style={{
          background: 'hsl(222, 47%, 8%)',
          border: `2px solid ${selected ? color : hovered ? `${color}44` : 'hsl(222, 47%, 15%)'}`,
          boxShadow: selected
            ? `0 0 0 2px ${color}44, 0 8px 32px ${color}22, inset 0 1px 0 ${color}15`
            : hovered
              ? `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${color}22`
              : '0 2px 12px rgba(0,0,0,0.3)',
        }}
      >
        {/* Color accent bar */}
        <div className="h-1 transition-all duration-300" style={{ background: `linear-gradient(90deg, ${color}, ${color}66)` }} />

        {/* Header bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 transition-colors duration-300" style={{ background: `${color}08` }}>
          <GripVertical className="h-3 w-3 text-white/20 shrink-0 cursor-grab" />
          <div
            className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300"
            style={{ background: `${color}20`, boxShadow: `inset 0 0 0 1px ${color}15` }}
          >
            <Icon className="h-3.5 w-3.5 transition-colors duration-300" style={{ color }} />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider flex-1 transition-colors duration-300" style={{ color: `${color}aa` }}>
            {preset.label}
          </span>
          {nodeData.emoji && <span className="text-sm">{nodeData.emoji}</span>}
        </div>

        {/* Body */}
        <div className="px-3 py-2.5 space-y-1">
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
              className="w-full bg-white/5 text-sm text-white outline-none border border-white/10 rounded-md px-2 py-1 nopan nodrag"
              style={{ caretColor: color }}
            />
          ) : (
            <p
              className="text-sm text-white/90 font-medium cursor-text leading-snug hover:text-white transition-colors"
              onDoubleClick={() => setEditing(true)}
              title="Duplo clique para editar título"
            >
              {(data as CanvasNodeData).label}
            </p>
          )}
          {editingDesc ? (
            <textarea
              ref={descRef}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              onBlur={commitDesc}
              onKeyDown={e => {
                if (e.key === 'Escape') { setDesc((data as CanvasNodeData).description || ''); setEditingDesc(false); }
              }}
              rows={2}
              className="w-full bg-white/5 text-[11px] text-white/70 outline-none border border-white/10 rounded-md px-2 py-1 resize-none nopan nodrag"
              placeholder="Adicionar descrição..."
            />
          ) : (
            <p
              className="text-[11px] text-white/35 leading-relaxed cursor-text hover:text-white/50 transition-colors min-h-[16px]"
              onDoubleClick={() => setEditingDesc(true)}
              title="Duplo clique para editar descrição"
            >
              {nodeData.description || (hovered ? '+ Adicionar descrição...' : '')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(CanvasNode);
