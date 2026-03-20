import { useCallback, useState, useEffect, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { NODE_PRESETS, NODE_CATEGORIES, type CanvasNodeData } from './CanvasNode';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Settings2, Sparkles, Palette, Shapes, MapPin, Type, FileText, SmilePlus } from 'lucide-react';

const NODE_COLORS = [
  '#3b82f6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
  '#64748b', '#0ea5e9', '#a855f7', '#d946ef', '#84cc16',
];

const EMOJI_SUGGESTIONS = ['💡', '📌', '⚠️', '✅', '📄', '🔗', '🎯', '🚀', '🧠', '🛠️', '👥', '📍'];

interface CanvasInspectorProps {
  selectedNodeId: string | null;
  onClose: () => void;
  readOnly?: boolean;
  onNodeUpdate?: (nodeId: string, data: Record<string, unknown>) => void;
  onNodeMove?: (nodeId: string, position: { x: number; y: number }) => void;
}

export default function CanvasInspector({ selectedNodeId, onClose, readOnly, onNodeUpdate, onNodeMove }: CanvasInspectorProps) {
  const { getNode, setNodes } = useReactFlow();

  const node = selectedNodeId ? getNode(selectedNodeId) : null;
  const data = (node?.data || {}) as CanvasNodeData;

  const [label, setLabel] = useState(data.label || '');
  const [desc, setDesc] = useState(data.description || '');
  const [emoji, setEmoji] = useState((data.emoji as string) || '');

  useEffect(() => {
    if (node) {
      setLabel((node.data as CanvasNodeData).label || '');
      setDesc((node.data as CanvasNodeData).description || '');
      setEmoji(((node.data as CanvasNodeData).emoji as string) || '');
    }
  }, [selectedNodeId, node?.data]);

  const updateNodeData = useCallback((updates: Partial<CanvasNodeData>) => {
    if (!selectedNodeId || readOnly) return;
    setNodes((nds) => nds.map((n) =>
      n.id === selectedNodeId ? { ...n, data: { ...n.data, ...updates } } : n
    ));
    onNodeUpdate?.(selectedNodeId, updates as Record<string, unknown>);
  }, [selectedNodeId, readOnly, setNodes, onNodeUpdate]);

  const commitLabel = useCallback(() => {
    if (label.trim()) updateNodeData({ label: label.trim() });
  }, [label, updateNodeData]);

  const commitDesc = useCallback(() => {
    updateNodeData({ description: desc.trim() || undefined });
  }, [desc, updateNodeData]);

  const commitEmoji = useCallback(() => {
    updateNodeData({ emoji: emoji.trim() || undefined });
  }, [emoji, updateNodeData]);

  const currentPreset = useMemo(() => {
    return NODE_PRESETS.find((p) => p.type === data.nodeType) || NODE_PRESETS[0];
  }, [data.nodeType]);

  const categorizedPresets = useMemo(() => {
    return NODE_CATEGORIES.map((category) => ({
      ...category,
      items: NODE_PRESETS.filter((preset) => preset.category === category.id),
    }));
  }, []);

  if (!node) return null;

  const currentColor = data.color || currentPreset.color;
  const Icon = currentPreset.icon;

  return (
    <div className="absolute right-3 top-3 bottom-3 z-10 flex flex-col bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl w-[320px] overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border/50 bg-background/70">
        <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Settings2 className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Inspetor</span>
          <p className="text-sm font-semibold truncate">{data.label || 'Elemento selecionado'}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={onClose}>
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl flex items-center justify-center text-white shadow-inner" style={{ backgroundColor: currentColor }}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="rounded-full text-[10px]">{currentPreset.label}</Badge>
                  {emoji ? <Badge variant="secondary" className="rounded-full text-[10px]">{emoji}</Badge> : null}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Use o inspetor para padronizar, enriquecer e organizar o nó selecionado.</p>
              </div>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Conteúdo</h3>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Título</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={commitLabel}
                onKeyDown={(e) => e.key === 'Enter' && commitLabel()}
                className="h-9 text-sm rounded-xl"
                disabled={readOnly}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Descrição</Label>
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                onBlur={commitDesc}
                rows={4}
                className="text-sm resize-none rounded-xl"
                disabled={readOnly}
                placeholder="Adicione contexto, instruções ou detalhes operacionais..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Emoji / Identificador visual</Label>
              <div className="flex gap-2">
                <Input
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  onBlur={commitEmoji}
                  onKeyDown={(e) => e.key === 'Enter' && commitEmoji()}
                  className="h-9 text-sm rounded-xl"
                  disabled={readOnly}
                  placeholder="Ex: 🚀"
                />
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" disabled={readOnly} onClick={commitEmoji}>
                  <SmilePlus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {EMOJI_SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      if (readOnly) return;
                      setEmoji(item);
                      updateNodeData({ emoji: item });
                    }}
                    className="h-8 w-8 rounded-xl border border-border/70 bg-background hover:bg-accent transition-colors"
                    disabled={readOnly}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Shapes className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Tipo e visual</h3>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tipo do nó</Label>
              <Select
                value={data.nodeType || 'idea'}
                onValueChange={(value) => {
                  const preset = NODE_PRESETS.find((p) => p.type === value) || NODE_PRESETS[0];
                  updateNodeData({ nodeType: value, color: preset.color });
                }}
                disabled={readOnly}
              >
                <SelectTrigger className="h-9 text-sm rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {categorizedPresets.map((group) => (
                    <div key={group.id} className="p-1">
                      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group.label}</p>
                      {group.items.map((preset) => {
                        const PIcon = preset.icon;
                        return (
                          <SelectItem key={preset.type} value={preset.type}>
                            <div className="flex items-center gap-2">
                              <PIcon className="h-3.5 w-3.5" style={{ color: preset.color }} />
                              {preset.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Cor</Label>
              <div className="grid grid-cols-5 gap-2">
                {NODE_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => !readOnly && updateNodeData({ color })}
                    disabled={readOnly}
                    className="h-9 w-full rounded-xl border-2 transition-all hover:scale-[1.04] disabled:opacity-50"
                    style={{
                      background: color,
                      borderColor: color === currentColor ? 'white' : 'transparent',
                      boxShadow: color === currentColor ? `0 0 0 2px ${color}44` : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Posicionamento</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Eixo X</Label>
                <Input
                  type="number"
                  value={Math.round(node.position.x)}
                  onChange={(e) => {
                    if (readOnly) return;
                    const x = parseInt(e.target.value) || 0;
                    setNodes((nds) => nds.map((n) =>
                      n.id === selectedNodeId ? { ...n, position: { ...n.position, x } } : n
                    ));
                    onNodeMove?.(selectedNodeId!, { x, y: node.position.y });
                  }}
                  className="h-9 text-sm rounded-xl"
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Eixo Y</Label>
                <Input
                  type="number"
                  value={Math.round(node.position.y)}
                  onChange={(e) => {
                    if (readOnly) return;
                    const y = parseInt(e.target.value) || 0;
                    setNodes((nds) => nds.map((n) =>
                      n.id === selectedNodeId ? { ...n, position: { ...n.position, y } } : n
                    ));
                    onNodeMove?.(selectedNodeId!, { x: node.position.x, y });
                  }}
                  className="h-9 text-sm rounded-xl"
                  disabled={readOnly}
                />
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Metadados</h3>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-3 space-y-2">
              <InfoRow icon={FileText} label="ID do nó" value={`${node.id.slice(0, 18)}...`} />
              <InfoRow icon={Shapes} label="Categoria" value={currentPreset.category} />
              <InfoRow icon={Palette} label="Cor ativa" value={currentColor} mono />
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background px-3 py-2">
      <div className="flex items-center gap-2 text-muted-foreground min-w-0">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs truncate">{label}</span>
      </div>
      <span className={`text-xs font-medium text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
