import { useMemo, useState } from 'react';
import { WorkOrder } from '../types/workOrder.types';

export function useWorkOrderFilters(data: WorkOrder[]) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [priority, setPriority] = useState<string>('all');

  const filtered = useMemo(() => {
    return data.filter((wo) => {
      if (status !== 'all' && wo.status !== status) return false;
      if (priority !== 'all' && wo.priority !== priority) return false;

      if (search) {
        const s = search.toLowerCase();
        return (
          wo.title.toLowerCase().includes(s) ||
          wo.code.toLowerCase().includes(s)
        );
      }

      return true;
    });
  }, [data, search, status, priority]);

  return {
    search,
    setSearch,
    status,
    setStatus,
    priority,
    setPriority,
    filtered,
  };
}
