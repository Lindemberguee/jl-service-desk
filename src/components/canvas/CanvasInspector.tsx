import { useEffect, useMemo, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { NODE_CATEGORIES, NODE_PRESETS, type CanvasNodeData } from './CanvasNode';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, MapPin, Palette, Settings2, Shapes, SmilePlus, Sparkles, Type, X } from 'lucide-react';

const NODE_COLORS = [
  '#3b82f6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
  '#64748b', '#0ea5e9', '#a855f7', '#d946ef', '#84cc16',
];

const EMOJIS = ['💡', '📌', '⚠️', '✅', '📄', '🔗', '🎯', '🚀', '🧠', '🛠️', '👥', '📍'];

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
  const [description, setDescription] = useState(data.description || '');
  const [emoji, setEmoji] = useState((data.emoji as string) || '');

  useEffect(() => {
    if (!node) return;
    const nodeData = node.data as CanvasNodeData;
    setLabel(nodeData.label || '');
    setDescription(nodeData.description || '');
    setEmoji((nodeData.emoji as string) || '');
  }, [node?.data, node, selectedNodeId]);

  const preset = useMemo(() => {
    return NODE_PRESETS.find((item) => item.type === data.nodeType) || NODE_PRESETS[0];
  }, [data.nodeType]);

  const groupedPresets = useMemo(() => {
    return NODE_CATEGORIES.map((category) => ({
      ...category,
      items: NODE_PRESETS.filter((item) => item.category === category.id),
    }));
  }, []);

  if (!node) return null;

  const currentColor = data.color || preset.color;
  const Icon = preset.icon;

  const patchNode = (updates: Partial<CanvasNodeData>) => {
    if (!selectedNodeId || readOnly) return;
    setNodes((prev) => prev.map((item) => item.id === selectedNodeId ? { ...item, data: { ...item.data, ...updates } } : item));
  };

  return (
    <div className="absolute right-3 top-3 bottom-3 z-10 flex w-[320px] flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-border/50 bg-background/70 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Settings2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Inspector</span>
          <p className="truncate text-sm font-semibold">{data.label || 'Elemento selecionado'}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={onClose}>
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-inner" style={{ backgroundColor: currentColor }}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full text-[10px]">{preset.label}</Badge>
                  {emoji ? <Badge variant="secondary" className="rounded-full text-[10px]">{emoji}</Badge> : null}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Edite conteúdo, tipo, cor e posicionamento do bloco selecionado.</p>
              </div>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Conteúdo</h3>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Título</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={() => patchNode({ label: label.trim() || 'Bloco' })}
                onKeyDown={(e) => e.key === 'Enter' && patchNode({ label: label.trim() || 'Bloco' })}
                className="h-9 rounded-xl text-sm"
                disabled={readOnly}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => patchNode({ description: description.trim() || undefined })}
                rows={4}
                className="resize-none rounded-xl text-sm"
                disabled={readOnly}
                placeholder="Adicione contexto, instruções ou detalhes operacionais..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Emoji</Label>
              <div className="flex gap-2">
                <Input
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  onBlur={() => patchNode({ emoji: emoji.trim() || undefined })}
                  onKeyDown={(e) => e.key === 'Enter' && patchNode({ emoji: emoji.trim() || undefined })}
                  className="h-9 rounded-xl text-sm"
                  disabled={readOnly}
                  placeholder="Ex: 🚀"
                />
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" disabled={readOnly} onClick={() => patchNode({ emoji: emoji.trim() || undefined })}>
                  <SmilePlus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {EMOJIS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      if (readOnly) return;
                      setEmoji(item);
                      patchNode({ emoji: item });
                    }}
                    className="h-8 w-8 rounded-xl border border-border/70 bg-background transition-colors hover:bg-accent"
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
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tipo do bloco</Label>
              <Select
                value={data.nodeType || 'idea'}
                onValueChange={(value) => {
                  const nextPreset = NODE_PRESETS.find((item) => item.type === value) || NODE_PRESETS[0];
                  patchNode({ nodeType: value, color: nextPreset.color });
                }}
                disabled={readOnly}
              >
                <SelectTrigger className="h-9 rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {groupedPresets.map((group) => (
                    <div key={group.id} className="p-1">
                      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group.label}</p>
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        return (
                          <SelectItem key={item.type} value={item.type}>
                            <div className="flex items-center gap-2">
                              <ItemIcon className="h-3.5 w-3.5" style={{ color: item.color }} />
                              {item.label}
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
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Cor</Label>
              <div className="grid grid-cols-5 gap-2">
                {NODE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => !readOnly && patchNode({ color })}
                    className="h-9 w-full rounded-xl border-2 transition-all hover:scale-[1.04]"
                    style={{
                      background: color,
                      borderColor: color === currentColor ? 'white' : 'transparent',
                      boxShadow: color === currentColor ? `0 0 0 2px ${color}44` : undefined,
                    }}
                    disabled={readOnly}
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
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Eixo X</Label>
                <Input
                  type="number"
                  value={Math.round(node.position.x)}
                  onChange={(e) => {
                    if (readOnly || !selectedNodeId) return;
                    const x = parseInt(e.target.value) || 0;
                    setNodes((prev) => prev.map((item) => item.id === selectedNodeId ? { ...item, position: { ...item.position, x } } : item));
                  }}
                  className="h-9 rounded-xl text-sm"
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Eixo Y</Label>
                <Input
                  type="number"
                  value={Math.round(node.position.y)}
                  onChange={(e) => {
                    if (readOnly || !selectedNodeId) return;
                    const y = parseInt(e.target.value) || 0;
                    setNodes((prev) => prev.map((item) => item.id === selectedNodeId ? { ...item, position: { ...item.position, y } } : item));
                  }}
                  className="h-9 rounded-xl text-sm"
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
            <div className="space-y-2 rounded-2xl border border-border/70 bg-background/60 p-3">
              <InfoRow icon={FileText} label="ID do bloco" value={`${node.id.slice(0, 18)}...`} />
              <InfoRow icon={Shapes} label="Categoria" value={preset.category} />
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
      <div className="min-w-0 flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate text-xs">{label}</span>
      </div>
      <span className={`text-right text-xs font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
