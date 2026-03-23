import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import {
  Lightbulb,
  StickyNote,
  FileText,
  GitBranch,
  CheckSquare,
  AlertTriangle,
  MessageSquare,
  Link2,
  Users,
  Star,
  Target,
  Zap,
  Flag,
  Bookmark,
  Award,
} from 'lucide-react';

export interface CanvasNodeData {
  label: string;
  nodeType: string;
  description?: string;
  color?: string;
  emoji?: string;
  [key: string]: unknown;
}

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
  return NODE_PRESETS.find((preset) => preset.type === type) || NODE_PRESETS[0];
}

function CanvasNode({ id, data, selected }: NodeProps) {
  const nodeData = (data || {}) as CanvasNodeData;
  const preset = getPreset(nodeData.nodeType || 'idea');
  const Icon = preset.icon;
  const accent = nodeData.color || preset.color;
  const { setNodes } = useReactFlow();

  const [title, setTitle] = useState(nodeData.label || '');
  const [description, setDescription] = useState(nodeData.description || '');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(nodeData.label || '');
  }, [nodeData.label]);

  useEffect(() => {
    setDescription(nodeData.description || '');
  }, [nodeData.description]);

  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editingTitle]);

  useEffect(() => {
    if (editingDescription && descRef.current) {
      descRef.current.focus();
    }
  }, [editingDescription]);

  const surfaceStyle = useMemo(() => ({
    border: `1px solid ${selected ? `${accent}99` : `${accent}26`}`,
    boxShadow: selected
      ? `0 0 0 1px ${accent}40, 0 18px 40px rgba(0,0,0,0.32)`
      : `0 8px 24px rgba(0,0,0,0.22)`,
    background: 'linear-gradient(180deg, rgba(9,16,31,0.98) 0%, rgba(7,12,23,0.98) 100%)',
  }), [accent, selected]);

  const commitTitle = () => {
    const next = title.trim() || nodeData.label || 'Bloco';
    setTitle(next);
    setEditingTitle(false);
    setNodes((prev) => prev.map((node) => node.id === id ? { ...node, data: { ...node.data, label: next } } : node));
  };

  const commitDescription = () => {
    const next = description.trim();
    setDescription(next);
    setEditingDescription(false);
    setNodes((prev) => prev.map((node) => node.id === id ? { ...node, data: { ...node.data, description: next || undefined } } : node));
  };

  const handleStyle = {
    width: 12,
    height: 12,
    borderRadius: 999,
    background: accent,
    border: '2px solid rgba(5, 9, 18, 0.95)',
    boxShadow: `0 0 0 2px ${accent}22, 0 0 10px ${accent}55`,
  } as const;

  return (
    <div className="relative min-w-[220px] max-w-[320px]">
      <Handle type="target" position={Position.Top} id="top-target" style={handleStyle} />
      <Handle type="source" position={Position.Top} id="top-source" style={handleStyle} />
      <Handle type="target" position={Position.Bottom} id="bottom-target" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" style={handleStyle} />
      <Handle type="target" position={Position.Left} id="left-target" style={handleStyle} />
      <Handle type="source" position={Position.Left} id="left-source" style={handleStyle} />
      <Handle type="target" position={Position.Right} id="right-target" style={handleStyle} />
      <Handle type="source" position={Position.Right} id="right-source" style={handleStyle} />

      <div className="overflow-hidden rounded-2xl transition-all duration-200" style={surfaceStyle}>
        <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />

        <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2" style={{ background: `${accent}10` }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `${accent}18`, boxShadow: `inset 0 0 0 1px ${accent}22` }}>
            <Icon className="h-4 w-4" style={{ color: accent }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: `${accent}dd` }}>
              {preset.label}
            </p>
          </div>
          {nodeData.emoji ? <span className="text-sm leading-none">{nodeData.emoji}</span> : null}
        </div>

        <div className="space-y-2 px-3 py-3">
          {editingTitle ? (
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle();
                if (e.key === 'Escape') {
                  setTitle(nodeData.label || '');
                  setEditingTitle(false);
                }
              }}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm font-semibold text-white outline-none"
              style={{ caretColor: accent }}
            />
          ) : (
            <button
              type="button"
              onDoubleClick={() => setEditingTitle(true)}
              className="block w-full text-left text-sm font-semibold leading-snug text-white/95"
              title="Duplo clique para editar"
            >
              {nodeData.label || 'Bloco'}
            </button>
          )}

          {editingDescription ? (
            <textarea
              ref={descRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={commitDescription}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setDescription(nodeData.description || '');
                  setEditingDescription(false);
                }
              }}
              rows={3}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] leading-relaxed text-white/75 outline-none"
              style={{ caretColor: accent }}
              placeholder="Adicione uma descrição..."
            />
          ) : (
            <button
              type="button"
              onDoubleClick={() => setEditingDescription(true)}
              className="block min-h-[18px] w-full text-left text-[11px] leading-relaxed text-white/50"
              title="Duplo clique para editar descrição"
            >
              {nodeData.description || 'Sem descrição'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(CanvasNode);
