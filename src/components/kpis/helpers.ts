import type { OkrKeyResult } from '@/hooks/useOkrs';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Percentage progress of a Key Result (0-100, clamped). */
export function krProgress(kr: Pick<OkrKeyResult, 'start_value' | 'target_value' | 'current_value'>) {
  const range = kr.target_value - kr.start_value;
  if (range === 0) return 100;
  return Math.max(0, Math.min(Math.round(((kr.current_value - kr.start_value) / range) * 100), 100));
}

/** Format a nullable ISO date string as dd/MM/yy. */
export function fmtDate(d: string | null, pattern = 'dd/MM/yy') {
  if (!d) return '—';
  return format(parseISO(d), pattern, { locale: ptBR });
}

/** Tailwind text colour class based on how close a deadline is. */
export function deadlineColor(endDate: string | null) {
  if (!endDate) return '';
  const days = differenceInDays(parseISO(endDate), new Date());
  if (days < 0) return 'text-red-500';
  if (days <= 7) return 'text-amber-500';
  return 'text-muted-foreground';
}
