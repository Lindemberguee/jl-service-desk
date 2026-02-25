import { useState, useRef, useEffect } from 'react';
import { NODE_PRESETS, NODE_CATEGORIES } from './CanvasNode';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickNodeMenuProps {
  position: { x: number; y: number };
  onSelect: (type: string) => void;
  onClose: () => void;
}

export default function QuickNodeMenu({ position, onSelect, onClose }: QuickNodeMenuProps) {
  const [filter, setFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [onClose]);

  const filtered = filter
    ? NODE_PRESETS.filter(p => p.label.toLowerCase().includes(filter.toLowerCase()))
    : NODE_PRESETS;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filtered.length > 0) {
      onSelect(filtered[0].type);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.9, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 5 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        style={{ left: position.x - 110, top: position.y - 20, width: 240 }}
      >
        <div className="p-2 border-b border-border/50">
          <input
            ref={inputRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Que tipo de bloco?"
            className="w-full h-8 px-3 text-sm bg-muted/50 border border-border rounded-lg outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground/50"
          />
        </div>
        <div className="max-h-[280px] overflow-y-auto p-1.5">
          {filter ? (
            <div className="space-y-0.5">
              {filtered.map((p, i) => (
                <NodeOption key={p.type} preset={p} onClick={() => onSelect(p.type)} highlighted={i === 0} />
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum resultado</p>
              )}
            </div>
          ) : (
            NODE_CATEGORIES.map(cat => {
              const items = NODE_PRESETS.filter(p => p.category === cat.id);
              return (
                <div key={cat.id}>
                  <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider px-2 pt-2 pb-1">
                    {cat.label}
                  </p>
                  {items.map(p => (
                    <NodeOption key={p.type} preset={p} onClick={() => onSelect(p.type)} />
                  ))}
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function NodeOption({ preset, onClick, highlighted }: { preset: typeof NODE_PRESETS[number]; onClick: () => void; highlighted?: boolean }) {
  const Icon = preset.icon;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg transition-all text-left hover:bg-accent/60 active:scale-[0.98] ${highlighted ? 'bg-accent/40' : ''}`}
    >
      <div
        className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${preset.color}18` }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: preset.color }} />
      </div>
      <span className="text-xs font-medium text-foreground/80">{preset.label}</span>
    </button>
  );
}
