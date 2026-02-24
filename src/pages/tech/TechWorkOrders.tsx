import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTenantQuery } from '@/hooks/useTenantQuery';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/permissions';
import { calculateSlaStatus, formatRemainingTime } from '@/lib/sla';
import { SlaIndicator } from '@/components/SlaIndicator';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import { Search, Play, Pause, CheckSquare, ChevronRight, AlertTriangle, Clock, ClipboardList, UserCheck, Package, Filter } from 'lucide-react';

const PRIORITY_ORDER: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };

interface SavedView {
  id: string; label: string; icon: any;
  filters: { status?: string; sla?: string; priority?: string };
}

const VIEWS: SavedView[] = [
  { id: 'all', label: 'Todas', icon: ClipboardList, filters: {} },
  { id: 'atrasadas', label: 'Atrasadas', icon: AlertTriangle, filters: { sla: 'overdue' } },
  { id: 'aguardando', label: 'Aguardando', icon: Clock, filters: { status: 'aguardando_peca' } },
  { id: 'criticas', label: 'Críticas', icon: Package, filters: { priority: 'critica' } },
];

export default function TechWorkOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: workOrders = [], isLoading } = useTenantQuery<any>('work_orders', 'work_orders');
  const { data: units = [] } = useTenantQuery<any>('units', 'units');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [activeView, setActiveView] = useState('all');
  const [sortBy, setSortBy] = useState<'sla' | 'updated' | 'priority'>('sla');

  const debouncedSearch = useDebounce(search, 300);

  const applyView = (view: SavedView) => {
    setActiveView(view.id);
    setStatusFilter(view.filters.status || 'all');
    setPriorityFilter(view.filters.priority || 'all');
  };

  // Only my OS
  const myOs = useMemo(() => workOrders.filter((wo: any) => wo.assigned_to_id === user?.id), [workOrders, user?.id]);

  const filtered = useMemo(() => {
    let result = myOs.filter((wo: any) => {
      if (statusFilter !== 'all' && wo.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && wo.priority !== priorityFilter) return false;
      if (unitFilter !== 'all' && wo.unit_id !== unitFilter) return false;
      if (activeView === 'atrasadas') {
        const sla = calculateSlaStatus(wo);
        if (!sla.responseOverdue && !sla.resolveOverdue) return false;
      }
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        return wo.title?.toLowerCase().includes(s) || wo.code?.toLowerCase().includes(s);
      }
      return true;
    });

    result.sort((a: any, b: any) => {
      if (sortBy === 'sla') {
        const aSla = calculateSlaStatus(a);
        const bSla = calculateSlaStatus(b);
        const aRem = aSla.resolveRemainingMs ?? Infinity;
        const bRem = bSla.resolveRemainingMs ?? Infinity;
        return aRem - bRem;
      }
      if (sortBy === 'priority') return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return result;
  }, [myOs, statusFilter, priorityFilter, unitFilter, activeView, debouncedSearch, sortBy]);

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, wo }: { id: string; status: string; wo: any }) => {
      const updates: any = { status };
      if (status === 'em_execucao' && !wo.started_at) updates.started_at = new Date().toISOString();
      if (status === 'concluida') updates.resolved_at = new Date().toISOString();
      const PAUSE = ['aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro'];
      if (PAUSE.includes(status) && !wo.paused_at) updates.paused_at = new Date().toISOString();
      if (!PAUSE.includes(status) && wo.paused_at) {
        updates.total_paused_ms = (wo.total_paused_ms || 0) + (Date.now() - new Date(wo.paused_at).getTime());
        updates.paused_at = null;
      }
      const { error } = await supabase.from('work_orders').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work_orders'] }); toast({ title: 'Status atualizado!' }); },
  });

  const getUnitName = (id: string | null) => units.find((u: any) => u.id === id)?.name || '—';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Minhas Ordens de Serviço</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {filtered.length} de {myOs.length} OS
        </p>
      </div>

      {/* Views */}
      <div className="flex gap-1.5 flex-wrap">
        {VIEWS.map(view => (
          <Button
            key={view.id}
            variant={activeView === view.id ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => applyView(view)}
          >
            <view.icon className="h-3 w-3" />
            {view.label}
          </Button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar código ou título..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sla">SLA (urgente)</SelectItem>
            <SelectItem value="priority">Prioridade</SelectItem>
            <SelectItem value="updated">Atualização</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* OS List - Card-based for mobile */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhuma OS encontrada</p>
          <p className="text-xs mt-1">Ajuste os filtros ou aguarde novas atribuições.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((wo: any) => {
            const sla = calculateSlaStatus(wo);
            const isPaused = ['aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro'].includes(wo.status);
            const isOpen = ['aberta', 'reaberta'].includes(wo.status);
            const isRunning = wo.status === 'em_execucao';
            const isClosed = ['concluida', 'aprovada', 'encerrada'].includes(wo.status);

            return (
              <Card
                key={wo.id}
                className={`border-border shadow-none cursor-pointer hover:bg-muted/50 transition-colors ${
                  (sla.responseOverdue || sla.resolveOverdue) && !isClosed ? 'border-l-2 border-l-destructive' : ''
                }`}
                onClick={() => navigate(`/tech/os/${wo.id}`)}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{wo.code}</span>
                        <Badge variant="outline" className={`text-[10px] h-5 ${priorityColors[wo.priority]}`}>
                          {priorityLabels[wo.priority]}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] h-5 ${statusColors[wo.status]}`}>
                          {statusLabels[wo.status]}
                        </Badge>
                        <SlaIndicator workOrder={wo} compact />
                      </div>
                      <p className="text-sm font-medium truncate">{wo.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                        <span>{getUnitName(wo.unit_id)}</span>
                        {sla.resolveRemainingMs !== null && !isClosed && (
                          <span className={sla.resolveOverdue ? 'text-destructive font-semibold' : ''}>
                            SLA: {formatRemainingTime(sla.resolveRemainingMs)}
                          </span>
                        )}
                        <span>{new Date(wo.updated_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {isOpen && (
                        <Button size="sm" className="h-8 w-8 p-0 sm:w-auto sm:px-2 sm:gap-1" onClick={() => statusMutation.mutate({ id: wo.id, status: 'em_execucao', wo })} disabled={statusMutation.isPending}>
                          <Play className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline text-[11px]">Iniciar</span>
                        </Button>
                      )}
                      {isRunning && (
                        <>
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0 sm:w-auto sm:px-2 sm:gap-1" onClick={() => statusMutation.mutate({ id: wo.id, status: 'aguardando_peca', wo })} disabled={statusMutation.isPending}>
                            <Pause className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline text-[11px]">Pausar</span>
                          </Button>
                          <Button size="sm" className="h-8 w-8 p-0 sm:w-auto sm:px-2 sm:gap-1 bg-green-600 hover:bg-green-700" onClick={() => statusMutation.mutate({ id: wo.id, status: 'concluida', wo })} disabled={statusMutation.isPending}>
                            <CheckSquare className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline text-[11px]">Resolver</span>
                          </Button>
                        </>
                      )}
                      {isPaused && (
                        <Button size="sm" className="h-8 w-8 p-0 sm:w-auto sm:px-2 sm:gap-1" onClick={() => statusMutation.mutate({ id: wo.id, status: 'em_execucao', wo })} disabled={statusMutation.isPending}>
                          <Play className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline text-[11px]">Retomar</span>
                        </Button>
                      )}
                      {!isOpen && !isRunning && !isPaused && !isClosed && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
