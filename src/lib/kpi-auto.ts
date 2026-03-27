import type { Kpi, KpiEntry } from '@/hooks/useKpis';
import type { OkrKeyResult } from '@/hooks/useOkrs';

const COMPLETED_ACTIVITY_STATUSES = new Set(['finalizado', 'finalizado_com_atraso']);

type KeyResultWithLinks = Omit<OkrKeyResult, 'links'> & {
  kpi_ids?: string[] | null;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

export function getLinkedKpiIds(
  kr: Pick<KeyResultWithLinks, 'kpi_id'> & Partial<Pick<KeyResultWithLinks, 'kpi_ids'>>
) {
  const ids = [...(kr.kpi_ids || []), ...(kr.kpi_id ? [kr.kpi_id] : [])].filter(Boolean) as string[];
  return Array.from(new Set(ids));
}

export function getKrCompletionRatio(
  kr: Pick<KeyResultWithLinks, 'start_value' | 'target_value' | 'current_value' | 'activity_status'>
) {
  if (COMPLETED_ACTIVITY_STATUSES.has(kr.activity_status)) {
    return 1;
  }

  const range = kr.target_value - kr.start_value;
  if (range === 0) {
    return kr.current_value > kr.start_value ? 1 : 0;
  }

  return clamp((kr.current_value - kr.start_value) / range);
}

export function getAutoKpiValue(kpi: Pick<Kpi, 'id' | 'target_value'>, keyResults: KeyResultWithLinks[]) {
  const linkedKeyResults = keyResults.filter((kr) => getLinkedKpiIds(kr).includes(kpi.id));

  if (linkedKeyResults.length === 0) {
    return null;
  }

  const progressRatio =
    linkedKeyResults.reduce((sum, kr) => sum + getKrCompletionRatio(kr), 0) / linkedKeyResults.length;

  const completedCount = linkedKeyResults.filter((kr) =>
    COMPLETED_ACTIVITY_STATUSES.has(kr.activity_status)
  ).length;

  const value = Number((kpi.target_value * progressRatio).toFixed(2));

  return {
    value,
    progressPct: progressRatio * 100,
    linkedCount: linkedKeyResults.length,
    completedCount,
  };
}

export function isKpiAutoCalculated(kpi: Pick<Kpi, 'id'>, keyResults: KeyResultWithLinks[]) {
  return keyResults.some((kr) => getLinkedKpiIds(kr).includes(kpi.id));
}

export function getLatestManualKpiValue(kpiId: string, entries: KpiEntry[]) {
  const latestEntry = entries.find((entry) => entry.kpi_id === kpiId);
  return latestEntry?.value ?? 0;
}

export function getEffectiveKpiValue(
  kpi: Pick<Kpi, 'id' | 'target_value'>,
  entries: KpiEntry[],
  keyResults: KeyResultWithLinks[]
) {
  const autoValue = getAutoKpiValue(kpi, keyResults);
  if (autoValue) {
    return autoValue.value;
  }

  return getLatestManualKpiValue(kpi.id, entries);
}
