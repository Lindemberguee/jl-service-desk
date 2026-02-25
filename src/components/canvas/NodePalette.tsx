import { NODE_PRESETS } from './CanvasNode';

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export default function NodePalette({ onDragStart }: NodePaletteProps) {
  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5 bg-card/95 backdrop-blur-sm border border-border rounded-xl p-2 shadow-xl">
      <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest text-center px-1 pb-1">
        Arrastar
      </span>
      {NODE_PRESETS.map(preset => {
        const Icon = preset.icon;
        return (
          <div
            key={preset.type}
            draggable
            onDragStart={(e) => onDragStart(e, preset.type)}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-accent/50 transition-colors group"
            title={preset.label}
          >
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
              style={{ background: `${preset.color}20` }}
            >
              <Icon className="h-3.5 w-3.5" style={{ color: preset.color }} />
            </div>
            <span className="text-[11px] font-medium text-foreground/80 whitespace-nowrap">
              {preset.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
