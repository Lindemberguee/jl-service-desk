import { useState } from 'react';
import { NODE_PRESETS, NODE_CATEGORIES } from './CanvasNode';
import { ChevronDown, ChevronRight, GripHorizontal } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export default function NodePalette({ onDragStart }: NodePaletteProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');

  const toggleCategory = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = filter
    ? NODE_PRESETS.filter(p => p.label.toLowerCase().includes(filter.toLowerCase()))
    : NODE_PRESETS;

  return (
    <div className="absolute left-3 top-3 bottom-3 z-10 flex flex-col bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl w-[180px] overflow-hidden">
      <div className="px-3 pt-3 pb-1.5">
        <div className="flex items-center gap-1.5 mb-2">
          <GripHorizontal className="h-3 w-3 text-muted-foreground/50" />
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            Componentes
          </span>
        </div>
        <input
          type="text"
          placeholder="Buscar..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full h-7 px-2 text-[11px] bg-muted/50 border border-border rounded-md outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground/50"
        />
      </div>

      <ScrollArea className="flex-1 px-2 pb-2">
        {filter ? (
          <div className="space-y-0.5 pt-1">
            {filtered.map(preset => (
              <PaletteItem key={preset.type} preset={preset} onDragStart={onDragStart} />
            ))}
            {filtered.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-4">Nenhum resultado</p>
            )}
          </div>
        ) : (
          NODE_CATEGORIES.map(cat => {
            const items = NODE_PRESETS.filter(p => p.category === cat.id);
            const isCollapsed = collapsed[cat.id];
            return (
              <div key={cat.id} className="pt-1">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="flex items-center gap-1 w-full px-1.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {cat.label}
                  <span className="ml-auto text-muted-foreground/50 font-normal">{items.length}</span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-0.5 ml-1">
                    {items.map(preset => (
                      <PaletteItem key={preset.type} preset={preset} onDragStart={onDragStart} />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </ScrollArea>

      <div className="px-3 py-2 border-t border-border/50">
        <p className="text-[9px] text-muted-foreground/50 text-center leading-tight">
          Arraste para o canvas<br />ou duplo clique no canvas
        </p>
      </div>
    </div>
  );
}

function PaletteItem({ preset, onDragStart }: { preset: typeof NODE_PRESETS[number]; onDragStart: (e: React.DragEvent, type: string) => void }) {
  const Icon = preset.icon;
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, preset.type)}
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-accent/50 transition-all group active:scale-95"
      title={`Arrastar ${preset.label}`}
    >
      <div
        className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all group-hover:scale-110 group-hover:shadow-md"
        style={{ background: `${preset.color}18`, boxShadow: `inset 0 0 0 1px ${preset.color}15` }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: preset.color }} />
      </div>
      <span className="text-[11px] font-medium text-foreground/70 group-hover:text-foreground whitespace-nowrap transition-colors">
        {preset.label}
      </span>
    </div>
  );
}
