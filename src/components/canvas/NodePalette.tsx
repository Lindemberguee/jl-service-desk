import { useMemo, useState } from 'react';
import { NODE_CATEGORIES, NODE_PRESETS } from './CanvasNode';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, ChevronRight, GripHorizontal, PanelLeftClose, Search, Shapes, Sparkles } from 'lucide-react';

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  onClose: () => void;
}

export default function NodePalette({ onDragStart, onClose }: NodePaletteProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');

  const visiblePresets = useMemo(() => {
    const normalized = filter.trim().toLowerCase();
    if (!normalized) return NODE_PRESETS;
    return NODE_PRESETS.filter((preset) => preset.label.toLowerCase().includes(normalized) || preset.category.toLowerCase().includes(normalized));
  }, [filter]);

  const toggle = (categoryId: string) => {
    setCollapsed((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  return (
    <div className="absolute left-3 top-3 bottom-3 z-10 flex w-[224px] flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/95 shadow-2xl backdrop-blur-md">
      <div className="border-b border-border/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-4 pt-4 pb-3">
        <div className="mb-3 flex items-start gap-2">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Shapes className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <GripHorizontal className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Canvas Board</span>
            </div>
            <p className="mt-1 text-sm font-semibold">Blocos e componentes</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Arraste para o canvas ou use duplo clique para criação rápida.</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={onClose}>
                <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Ocultar paleta</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar componente..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-6 w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50"
          />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px] gap-1.5">
            <Sparkles className="h-3 w-3" /> {visiblePresets.length} disponíveis
          </Badge>
          <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px]">Drag & drop</Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        {filter ? (
          <div className="space-y-1.5">
            {visiblePresets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                <p className="text-[11px] text-muted-foreground">Nenhum componente encontrado.</p>
              </div>
            ) : (
              visiblePresets.map((preset) => <PaletteItem key={preset.type} preset={preset} onDragStart={onDragStart} />)
            )}
          </div>
        ) : (
          NODE_CATEGORIES.map((category) => {
            const items = NODE_PRESETS.filter((preset) => preset.category === category.id);
            const isCollapsed = !!collapsed[category.id];
            return (
              <div key={category.id} className="mb-3 last:mb-0">
                <button
                  type="button"
                  onClick={() => toggle(category.id)}
                  className="mb-2 flex w-full items-center gap-2 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-accent/40"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-border/60 bg-background/70">
                    {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{category.label}</p>
                  </div>
                  <Badge variant="outline" className="rounded-full text-[10px]">{items.length}</Badge>
                </button>

                {!isCollapsed ? (
                  <div className="space-y-1.5">
                    {items.map((preset) => <PaletteItem key={preset.type} preset={preset} onDragStart={onDragStart} />)}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </ScrollArea>

      <div className="border-t border-border/60 bg-background/40 px-4 py-3">
        <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
          Dica: use <strong className="text-foreground/80">Ctrl+D</strong> para duplicar blocos e <strong className="text-foreground/80">2× clique</strong> no canvas para criação rápida.
        </p>
      </div>
    </div>
  );
}

function PaletteItem({ preset, onDragStart }: { preset: typeof NODE_PRESETS[number]; onDragStart: (event: React.DragEvent, nodeType: string) => void }) {
  const Icon = preset.icon;
  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(event, preset.type)}
      className="group flex cursor-grab items-center gap-3 rounded-2xl border border-transparent bg-background/30 px-3 py-2.5 transition-all hover:border-border/70 hover:bg-accent/40 hover:shadow-sm active:scale-[0.98]"
      title={`Arrastar ${preset.label}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all group-hover:scale-105" style={{ background: `${preset.color}18`, boxShadow: `inset 0 0 0 1px ${preset.color}18` }}>
        <Icon className="h-4 w-4" style={{ color: preset.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground/90 group-hover:text-foreground">{preset.label}</p>
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{preset.category}</p>
      </div>
    </div>
  );
}
