import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantQuery } from '@/hooks/useTenantQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/permissions';
import { Search, Plus, X, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { motion, AnimatePresence } from 'framer-motion';
import { SlaIndicator } from '@/components/SlaIndicator';

export default function WorkOrders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const debouncedSearch = useDebounce(search, 300);

  const { data: workOrders = [], isLoading } = useTenantQuery<any>('work_orders', 'work_orders');

  const filtered = useMemo(() => {
    return workOrders.filter((wo: any) => {
      if (statusFilter !== 'all' && wo.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && wo.priority !== priorityFilter) return false;
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        return wo.title?.toLowerCase().includes(s) || wo.code?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [workOrders, statusFilter, priorityFilter, debouncedSearch]);

  const activeFilters = [
    statusFilter !== 'all' && { key: 'status', label: statusLabels[statusFilter], clear: () => setStatusFilter('all') },
    priorityFilter !== 'all' && { key: 'priority', label: priorityLabels[priorityFilter], clear: () => setPriorityFilter('all') },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ordens de Serviço</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} ordem(ns) encontrada(s)</p>
        </div>
        <Button onClick={() => navigate('/os/nova')}>
          <Plus className="h-4 w-4 mr-2" />
          Nova OS
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou título..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Prioridades</SelectItem>
                {Object.entries(priorityLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {activeFilters.map(f => (
                <Badge key={f.key} variant="secondary" className="gap-1 cursor-pointer" onClick={f.clear}>
                  {f.label}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Filter className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">Nenhuma OS encontrada</p>
            <p className="text-sm">Tente ajustar os filtros ou crie uma nova OS.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((wo: any, i: number) => (
              <motion.div
                key={wo.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card
                  className="cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => navigate(`/os/${wo.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">{wo.code}</span>
                          <Badge variant="outline" className={priorityColors[wo.priority]}>
                            {priorityLabels[wo.priority]}
                          </Badge>
                        </div>
                        <p className="font-medium truncate">{wo.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(wo.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <SlaIndicator workOrder={wo} compact />
                      <Badge variant="outline" className={statusColors[wo.status]}>
                        {statusLabels[wo.status]}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
