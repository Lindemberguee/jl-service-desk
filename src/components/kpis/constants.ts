import {
  Clock, Play, Pause, CheckCircle2, AlertTriangle, Timer, Trash2,
} from 'lucide-react';

/* ───────── Activity / KR statuses ───────── */

export const ACTIVITY_STATUSES: Record<
  string,
  { label: string; color: string; icon: React.ElementType; cls: string }
> = {
  a_iniciar:             { label: 'Pendente',            color: 'text-muted-foreground', icon: Clock,        cls: 'bg-muted/60 text-muted-foreground border-border' },
  em_andamento:          { label: 'Em andamento',        color: 'text-blue-500',         icon: Play,         cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  no_prazo:              { label: 'No prazo',            color: 'text-emerald-500',      icon: CheckCircle2, cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  fora_do_prazo:         { label: 'Fora do Prazo',       color: 'text-red-500',          icon: AlertTriangle, cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  atrasado:              { label: 'Fora do Prazo',       color: 'text-red-500',          icon: AlertTriangle, cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  finalizado:            { label: 'Concluído',           color: 'text-emerald-600',      icon: CheckCircle2, cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  finalizado_com_atraso: { label: 'Concluído c/ atraso', color: 'text-orange-500',       icon: Timer,        cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  pausado:               { label: 'Pausado',             color: 'text-muted-foreground', icon: Pause,        cls: 'bg-muted/60 text-muted-foreground border-border' },
  cancelado:             { label: 'Cancelado',           color: 'text-muted-foreground', icon: Trash2,       cls: 'bg-muted/60 text-muted-foreground border-border line-through' },
};

/** Plain label map (for exports) */
export const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(ACTIVITY_STATUSES).map(([k, v]) => [k, v.label])
);

export const COMPLETED_STATUSES = new Set(['finalizado', 'finalizado_com_atraso']);

/* ───────── Cycle types ───────── */

export const CYCLE_TYPES = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semester', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
];

/* ───────── KPI categories / directions / data sources ───────── */

export const KPI_CATEGORIES = ['Operacional', 'Financeiro', 'Qualidade', 'Satisfação', 'Produtividade', 'SLA'];

export const KPI_DIRECTIONS = [
  { value: 'higher_is_better', label: 'Maior é melhor' },
  { value: 'lower_is_better', label: 'Menor é melhor' },
  { value: 'target_is_best', label: 'Meta exata' },
];

export const KPI_DATA_SOURCES = [
  { value: 'manual', label: 'Manual' },
  { value: 'auto_os', label: 'Automático (OS)' },
  { value: 'auto_stock', label: 'Automático (Estoque)' },
  { value: 'auto_maintenance', label: 'Automático (Manutenção)' },
  { value: 'auto_sla', label: 'Automático (SLA)' },
];
