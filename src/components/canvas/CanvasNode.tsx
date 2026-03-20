import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import {
  Lightbulb, StickyNote, FileText, GitBranch, CheckSquare,
  GripVertical, Palette, Copy, Trash2, AlertTriangle,
  MessageSquare, Link2, Users, Star, Target,
  Zap, Flag, Bookmark, Award,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface CanvasNodeData {
  label: string;
  nodeType: string;
  description?: string;
  color?: string;
  emoji?: string;
  onDeleteNode?: (id: string) => void;
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
  return NODE_PRESETS.find((p) => p.type === type) || NODE_PRESETS[0];
}

function ArrowHandle({ position, type, color, show, id }: { position: Position; type: 'source' | 'target'; color: string; show: boolean; id: string }) {
  const isOut = type === 'source';
  const rotations: Record<string, number> = {
    [Position.Top]: isOut ? 0 : 180,
    [Position.Bottom]: isOut ? 180 : 0,
    [Position.Left]: isOut ? 270 : 90,
    [Position.Right]: isOut ? 90 : 270,
  };
  const arrowPositions: Record<string, React.CSSProperties> = {
    [`${Position.Top}-source`]: { top: -17, left: 'calc(50% - 14px)', transform: `rotate(${rotations[Position.Top]}deg)` },
    [`${Position.Top}-target`]: { top: -17, left: 'calc(50% + 4px)', transform: `rotate(${rotations[Position.Top]}deg)` },
    [`${Position.Bottom}-source`]: { bottom: -17, left: 'calc(50% - 14px)', transform: `rotate(${rotations[Position.Bottom]}deg)` },
    [`${Position.Bottom}-target`]: { bottom: -17, left: 'calc(50% + 4px)', transform: `rotate(${rotations[Position.Bottom]}deg)` },
    [`${Position.Left}-source`]: { left: -17, top: 'calc(50% - 14px)', transform: `rotate(${rotations[Position.Left]}deg)` },
    [`${Position.Left}-target`]: { left: -17, top: 'calc(50% + 4px)', transform: `rotate(${rotations[Position.Left]}deg)` },
    [`${Position.Right}-source`]: { right: -17, top: 'calc(50% - 14px)', transform: `rotate(${rotations[Position.Right]}deg)` },
    [`${Position.Right}-target`]: { right: -17, top: 'calc(50% + 4px)', transform: `rotate(${rotations[Position.Right]}deg)` },
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
      <Handle type={type} position={position} id={id} style={{ width: 14, height: 14, background: 'transparent', border: 'none', opacity: show ? 1 : 0, zIndex: 10, ...handlePositions[key] }} />
      <div className="absolute pointer-events-none" style={{ opacity: show ? 0.95 : 0, transition: 'opacity 0.2s ease, transform 0.2s ease', filter: show ? `drop-shadow(0 0 6px ${arrowColor})` : undefined, ...arrowPositions[key] }}>
        <svg width="13" height="11" viewBox="0 0 12 10" fill="none">
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

  useEffect(() => { setLabel((data as CanvasNodeData).label || ''); }, [(data as CanvasNodeData).label]);
  useEffect(() => { setDesc((data as CanvasNodeData).description || ''); }, [(data as CanvasNodeData).description]);
  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);
  useEffect(() => { if (editingDesc && descRef.current) { descRef.current.focus(); } }, [editingDesc]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    if (label.trim()) {
      setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label: label.trim() } } : n));
    } else {
      setLabel((data as CanvasNodeData).label);
    }
  }, [label, data, id, setNodes]);

  const commitDesc = useCallback(() => {
    setEditingDesc(false);
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, description: desc.trim() || undefined } } : n));
  }, [desc, id, setNodes]);

  const setColor = useCallback((c: string) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, color: c } } : n));
  }, [id, setNodes]);

  const switchType = useCallback((newType: string) => {
    const newPreset = getPreset(newType);
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, nodeType: newType, color: newPreset.color } } : n));
    setTypeMenuOpen(false);
  }, [id, setNodes]);

  const currentIdx = NODE_PRESETS.findIndex((p) => p.type === (nodeData.nodeType || 'idea'));
  const prevType = useCallback(() => { const idx = currentIdx <= 0 ? NODE_PRESETS.length - 1 : currentIdx - 1; switchType(NODE_PRESETS[idx].type); }, [currentIdx, switchType]);
  const nextType = useCallback(() => { const idx = currentIdx >= NODE_PRESETS.length - 1 ? 0 : currentIdx + 1; switchType(NODE_PRESETS[idx].type); }, [currentIdx, switchType]);

  const duplicateNode = useCallback(() => {
    setNodes((nds) => {
      const original = nds.find((n) => n.id === id);
      if (!original) return nds;
      return [...nds, { ...original, id: `node_${Date.now()}_dup`, position: { x: original.position.x + 30, y: original.position.y + 30 }, selected: false, data: { ...original.data } }];
    });
  }, [id, setNodes]);

  const deleteNode = useCallback(() => {
    nodeData.onDeleteNode?.(id);
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }, [id, setNodes, setEdges, nodeData]);

  const showHandles = hovered || selected;
  const cardBorder = selected ? `${color}aa` : hovered ? `${color}44` : 'hsl(222, 47%, 15%)';
  const cardShadow = selected
    ? `0 0 0 1px ${color}55, 0 14px 36px ${color}18, inset 0 1px 0 rgba(255,255,255,0.04)`
    : hovered
      ? `0 10px 28px rgba(0,0,0,0.45), 0 0 0 1px ${color}18`
      : '0 4px 18px rgba(0,0,0,0.28)';

  return (
    <div className="group relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ minWidth: 210, maxWidth: 340 }}>
      {([
        { pos: Position.Top, type: 'source' as const, id: 'top-source' },
        { pos: Position.Top, type: 'target' as const, id: 'top-target' },
        { pos: Position.Bottom, type: 'source' as const, id: 'bottom-source' },
        { pos: Position.Bottom, type: 'target' as const, id: 'bottom-target' },
        { pos: Position.Left, type: 'source' as const, id: 'left-source' },
        { pos: Position.Left, type: 'target' as const, id: 'left-target' },
        { pos: Position.Right, type: 'source' as const, id: 'right-source' },
        { pos: Position.Right, type: 'target' as const, id: 'right-target' },
      ]).map((h) => <ArrowHandle key={h.id} position={h.pos} type={h.type} color={color} show={!!showHandles} id={h.id} />)}

      {(hovered || selected) && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-card/95 border border-border/70 rounded-xl px-1 py-0.5 shadow-2xl z-10 nopan nodrag animate-in fade-in slide-in-from-bottom-1 duration-150 backdrop-blur-md">
          <button onClick={prevType} className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-accent transition-colors" title="Tipo anterior"><ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" /></button>
          <Popover open={typeMenuOpen} onOpenChange={setTypeMenuOpen}>
            <PopoverTrigger asChild>
              <button className="h-6 px-1.5 rounded-md flex items-center gap-1 hover:bg-accent transition-colors" title="Alterar tipo">
                <Icon className="h-3.5 w-3.5" style={{ color }} />
                <span className="text-[10px] font-semibold text-muted-foreground">{preset.label}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2" side="top">
              <p className="text-[10px] text-muted-foreground mb-1.5 font-bold uppercase tracking-wider">Alterar tipo</p>
              <div className="grid grid-cols-3 gap-1">
                {NODE_PRESETS.map((p) => {
                  const PIcon = p.icon;
                  const isActive = p.type === (nodeData.nodeType || 'idea');
                  return (
                    <button key={p.type} onClick={() => switchType(p.type)} className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 transition-all duration-200 ${isActive ? 'bg-accent ring-1 ring-primary/30 scale-105' : 'hover:bg-accent/60 hover:scale-105'}`}>
                      <div className="h-6 w-6 rounded-md flex items-center justify-center transition-colors duration-200" style={{ background: `${p.color}20` }}><PIcon className="h-3.5 w-3.5" style={{ color: p.color }} /></div>
                      <span className="text-[9px] font-medium text-foreground/70 leading-none">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
          <button onClick={nextType} className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-accent transition-colors" title="Próximo tipo"><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Popover>
            <PopoverTrigger asChild><button className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-accent transition-colors"><Palette className="h-3.5 w-3.5 text-muted-foreground" /></button></PopoverTrigger>
            <PopoverContent className="w-auto p-2.5" side="top">
              <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Cor do nó</p>
              <div className="grid grid-cols-5 gap-1.5">{NODE_COLORS.map((c) => <button key={c} onClick={() => setColor(c)} className="h-6 w-6 rounded-full border-2 transition-all hover:scale-125 hover:shadow-md" style={{ background: c, borderColor: c === color ? 'white' : 'transparent', boxShadow: c === color ? `0 0 0 2px ${c}44` : undefined }} />)}</div>
            </PopoverContent>
          </Popover>
          <button onClick={duplicateNode} className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-accent transition-colors" title="Duplicar"><Copy className="h-3.5 w-3.5 text-muted-foreground" /></button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button onClick={deleteNode} className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-destructive/20 transition-colors" title="Excluir"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden transition-all duration-300 bg-[hsl(222,47%,8%)]" style={{ border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
        <div className="h-[3px] transition-all duration-300" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
        <div className="flex items-center gap-2 px-3 py-2 transition-colors duration-300 border-b border-white/5" style={{ background: `${color}09` }}>
          <GripVertical className="h-3 w-3 text-white/20 shrink-0 cursor-grab" />
          <div className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300" style={{ background: `${color}20`, boxShadow: `inset 0 0 0 1px ${color}18` }}><Icon className="h-3.5 w-3.5 transition-colors duration-300" style={{ color }} /></div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider transition-colors duration-300 block" style={{ color: `${color}cc` }}>{preset.label}</span>
          </div>
          {nodeData.emoji && <span className="text-sm">{nodeData.emoji}</span>}
        </div>
        <div className="px-3 py-3 space-y-1.5">
          {editing ? (
            <input ref={inputRef} value={label} onChange={(e) => setLabel(e.target.value)} onBlur={commitEdit} onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setLabel((data as CanvasNodeData).label); setEditing(false); } }} className="w-full bg-white/5 text-sm text-white outline-none border border-white/10 rounded-lg px-2.5 py-1.5 nopan nodrag" style={{ caretColor: color }} />
          ) : (
            <p className="text-sm text-white/95 font-semibold cursor-text leading-snug hover:text-white transition-colors" onDoubleClick={() => setEditing(true)} title="Duplo clique para editar título">{(data as CanvasNodeData).label}</p>
          )}
          {editingDesc ? (
            <textarea ref={descRef} value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={commitDesc} onKeyDown={(e) => { if (e.key === 'Escape') { setDesc((data as CanvasNodeData).description || ''); setEditingDesc(false); } }} rows={3} className="w-full bg-white/5 text-[11px] text-white/75 outline-none border border-white/10 rounded-lg px-2.5 py-1.5 resize-none nopan nodrag" placeholder="Adicionar descrição..." />
          ) : (
            <p className="text-[11px] text-white/45 leading-relaxed cursor-text hover:text-white/60 transition-colors min-h-[18px]" onDoubleClick={() => setEditingDesc(true)} title="Duplo clique para editar descrição">{nodeData.description || (hovered ? '+ Adicionar descrição...' : '')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(CanvasNode);
