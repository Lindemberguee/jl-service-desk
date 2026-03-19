interface PlannerKpiItem {
  label: string;
  value: number | string;
  helper?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

interface Props {
  items: PlannerKpiItem[];
}

const toneClasses: Record<NonNullable<PlannerKpiItem['tone']>, string> = {
  default: 'border-border/70 bg-card',
  success: 'border-emerald-500/20 bg-emerald-500/5',
  warning: 'border-amber-500/20 bg-amber-500/5',
  danger: 'border-red-500/20 bg-red-500/5',
};

export function PlannerKpiStrip({ items }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className={`rounded-2xl border p-4 shadow-sm ${toneClasses[item.tone || 'default']}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{item.value}</p>
          {item.helper ? <p className="mt-2 text-xs text-muted-foreground">{item.helper}</p> : null}
        </div>
      ))}
    </div>
  );
}
