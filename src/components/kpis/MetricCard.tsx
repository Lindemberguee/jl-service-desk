import { cn } from '@/lib/utils';

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: React.ReactNode;
  alert?: boolean;
}

export function MetricCard({ icon: Icon, label, value, sub, alert }: MetricCardProps) {
  return (
    <div className={cn(
      'rounded-lg border bg-card p-3 space-y-0.5 shadow-[0_1px_3px_0_hsl(var(--foreground)/0.02)] transition-shadow hover:shadow-[0_2px_6px_0_hsl(var(--foreground)/0.05)]',
      alert && 'border-red-500/30',
    )}>
      <div className="flex items-center gap-2">
        <div className={cn('h-7 w-7 rounded-md flex items-center justify-center', alert ? 'bg-red-500/10' : 'bg-primary/10')}>
          <Icon className={cn('h-3.5 w-3.5', alert ? 'text-red-500' : 'text-primary')} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
          <p className={cn('text-lg font-bold tracking-tight leading-tight', alert && 'text-red-500')}>{value}</p>
        </div>
      </div>
      {sub && <div>{sub}</div>}
    </div>
  );
}
