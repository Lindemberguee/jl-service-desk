interface KpiItem {
  label: string;
  value: number | string;
  helper?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

interface Props {
  items: KpiItem[];
}

const toneClasses: Record<NonNullable<KpiItem['tone']>, string> = {
  default: 'border-border/70 bg-card',
  success: 'border-emerald-500/20 bg-emerald-500/5',
  warning: 'border-amber-500/20 bg-amber-500/5',
  danger: 'border-red-500/20 bg-red-500/5',
};

export function WorkOrdersKpiStrip({ items }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-xl border p-4 shadow-sm transition-all ${toneClasses[item.tone || 'default']}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {item.value}
              </p>
            </div>
          </div>
          {item.helper ? (
            <p className="mt-2 text-xs text-muted-foreground">{item.helper}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
