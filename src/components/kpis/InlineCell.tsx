import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { fmtDate } from './helpers';

interface InlineCellProps {
  value: string;
  field: string;
  krId: string;
  canManage: boolean;
  onSave: (krId: string, field: string, value: string) => void;
  type?: 'text' | 'date';
  className?: string;
}

export function InlineCell({ value, field, krId, canManage, onSave, type = 'text', className: cls }: InlineCellProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  useEffect(() => { setVal(value); }, [value]);

  const commit = () => {
    setEditing(false);
    if (val !== value) onSave(krId, field, val);
  };

  if (!canManage) {
    return (
      <span className={cn('text-xs text-muted-foreground truncate block', cls)}>
        {type === 'date' ? fmtDate(value || null) : (value || '—')}
      </span>
    );
  }

  if (editing) {
    return (
      <Input
        ref={ref}
        type={type}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setVal(value); setEditing(false); }
        }}
        className="h-6 text-xs px-1.5 py-0 border-primary/40 bg-background"
      />
    );
  }

  return (
    <span
      className={cn(
        'text-xs text-muted-foreground truncate block cursor-text rounded px-1 -mx-1 hover:bg-accent/40 hover:text-foreground transition-colors',
        cls,
      )}
      onClick={e => { e.stopPropagation(); setEditing(true); }}
      title="Clique para editar"
    >
      {type === 'date' ? fmtDate(value || null) : (value || '—')}
    </span>
  );
}
