import { useCallback, useState, useEffect } from 'react';
import { useReactFlow, type Node } from '@xyflow/react';
import { NODE_PRESETS, type CanvasNodeData } from './CanvasNode';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Settings2 } from 'lucide-react';

const NODE_COLORS = [
  '#3b82f6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
  '#64748b', '#0ea5e9', '#a855f7', '#d946ef', '#84cc16',
];

interface CanvasInspectorProps {
  selectedNodeId: string | null;
  onClose: () => void;
  readOnly?: boolean;
}

export default function CanvasInspector({ selectedNodeId, onClose, readOnly }: CanvasInspectorProps) {
  const { getNode, setNodes } = useReactFlow();

  const node = selectedNodeId ? getNode(selectedNodeId) : null;
  const data = (node?.data || {}) as CanvasNodeData;

  const [label, setLabel] = useState(data.label || '');
  const [desc, setDesc] = useState(data.description || '');

  useEffect(() => {
    if (node) {
      setLabel((node.data as CanvasNodeData).label || '');
      setDesc((node.data as CanvasNodeData).description || '');
    }
  }, [selectedNodeId, node?.data]);

  const updateNodeData = useCallback((updates: Partial<CanvasNodeData>) => {
    if (!selectedNodeId || readOnly) return;
    setNodes(nds => nds.map(n =>
      n.id === selectedNodeId ? { ...n, data: { ...n.data, ...updates } } : n
    ));
  }, [selectedNodeId, readOnly, setNodes]);

  const commitLabel = useCallback(() => {
    if (label.trim()) updateNodeData({ label: label.trim() });
  }, [label, updateNodeData]);

  const commitDesc = useCallback(() => {
    updateNodeData({ description: desc.trim() || undefined });
  }, [desc, updateNodeData]);

  if (!node) return null;

  const preset = NODE_PRESETS.find(p => p.type === data.nodeType) || NODE_PRESETS[0];
  const Icon = preset.icon;
  const currentColor = data.color || preset.color;

  return (
    <div className="absolute right-3 top-3 bottom-3 z-10 flex flex-col bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl w-[220px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-border/50">
        <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex-1">
          Propriedades
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-4">
          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tipo</Label>
            <Select
              value={data.nodeType || 'idea'}
              onValueChange={(v) => {
                const p = NODE_PRESETS.find(p => p.type === v) || NODE_PRESETS[0];
                updateNodeData({ nodeType: v, color: p.color });
              }}
              disabled={readOnly}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NODE_PRESETS.map(p => {
                  const PIcon = p.icon;
                  return (
                    <SelectItem key={p.type} value={p.type}>
                      <div className="flex items-center gap-2">
                        <PIcon className="h-3.5 w-3.5" style={{ color: p.color }} />
                        {p.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Título</Label>
            <Input
              value={label}
              onChange={e => setLabel(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={e => e.key === 'Enter' && commitLabel()}
              className="h-8 text-xs"
              disabled={readOnly}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Descrição</Label>
            <Textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              onBlur={commitDesc}
              rows={3}
              className="text-xs resize-none"
              disabled={readOnly}
              placeholder="Adicione uma descrição..."
            />
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Cor</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {NODE_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => !readOnly && updateNodeData({ color: c })}
                  disabled={readOnly}
                  className="h-6 w-6 rounded-full border-2 transition-all hover:scale-110 disabled:opacity-50"
                  style={{
                    background: c,
                    borderColor: c === currentColor ? 'white' : 'transparent',
                    boxShadow: c === currentColor ? `0 0 0 2px ${c}44` : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Position */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Posição</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[9px] text-muted-foreground/70">X</Label>
                <Input
                  type="number"
                  value={Math.round(node.position.x)}
                  onChange={e => {
                    if (readOnly) return;
                    const x = parseInt(e.target.value) || 0;
                    setNodes(nds => nds.map(n =>
                      n.id === selectedNodeId ? { ...n, position: { ...n.position, x } } : n
                    ));
                  }}
                  className="h-7 text-[11px]"
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label className="text-[9px] text-muted-foreground/70">Y</Label>
                <Input
                  type="number"
                  value={Math.round(node.position.y)}
                  onChange={e => {
                    if (readOnly) return;
                    const y = parseInt(e.target.value) || 0;
                    setNodes(nds => nds.map(n =>
                      n.id === selectedNodeId ? { ...n, position: { ...n.position, y } } : n
                    ));
                  }}
                  className="h-7 text-[11px]"
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
              <Icon className="h-3 w-3" style={{ color: currentColor }} />
              <span>ID: {node.id.slice(0, 12)}...</span>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
