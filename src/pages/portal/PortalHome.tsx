import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/permissions';
import { SlaIndicator } from '@/components/SlaIndicator';
import { calculateSlaStatus } from '@/lib/sla';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Search, Plus, ChevronRight, ClipboardList, Clock, CheckCircle2,
  AlertTriangle, Hourglass, Bell, Filter, X, Building2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const OPEN_STATUSES = ['aberta', 'triagem', 'em_execucao', 'aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro', 'reaberta'];
const CLOSED_STATUSES = ['concluida', 'aprovada', 'encerrada'];

type SavedView = { label: string; status: string; priority: string; period: string; slaOnly: boolean };
const SAVED_VIEWS: SavedView[] = [
  { label: 'Minhas atrasadas', status: 'all', priority: 'all', period: 'all', slaOnly: true },
  { label: 'Aguardando retorno', status: 'aguardando_solicitante', priority: 'all', period: 'all', slaOnly: false },
  { label: 'Críticas', status: 'all', priority: 'critica', period: 'all', slaOnly: false },
  { label: 'Últimos 7 dias', status: 'all', priority: 'all', period: '7', slaOnly: false },
];

export default function PortalHome() {
  const { memberships, user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [slaOnlyFilter, setSlaOnlyFilter] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const tenantIds = memberships.map(m => m.tenant_id);

  // Get customer IDs linked to this user
  const { data: myCustomerIds = [] } = useQuery({
    queryKey: ['my_customer_ids', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id);
      return (data || []).map((c: any) => c.id);
    },
    enabled: !!user?.id,
  });

  // Fetch OS filtered by requester
  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['portal_work_orders', tenantIds, user?.id, myCustomerIds],
    queryFn: async () => {
      if (tenantIds.length === 0 || !user?.id) return [];
      
      // Fetch WOs where requester_user_id = me OR requester_id is one of my linked customers
      let allWOs: any[] = [];
      
      // 1) WOs where I'm the requester_user_id
      const { data: byUser } = await supabase
        .from('work_orders')
        .select('*')
        .in('tenant_id', tenantIds)
        .eq('requester_user_id', user.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      allWOs = byUser || [];

      // 2) WOs where requester_id is one of my linked customers
      if (myCustomerIds.length > 0) {
        const { data: byCustomer } = await supabase
          .from('work_orders')
          .select('*')
          .in('tenant_id', tenantIds)
          .in('requester_id', myCustomerIds)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false });
        
        // Merge without duplicates
        const existingIds = new Set(allWOs.map((wo: any) => wo.id));
        for (const wo of (byCustomer || [])) {
          if (!existingIds.has(wo.id)) {
            allWOs.push(wo);
          }
        }
      }
      
      // Sort by updated_at desc
      allWOs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return allWOs;
    },
    enabled: tenantIds.length > 0 && !!user?.id,
  });

  const getDeptName = (tenantId: string) => memberships.find(m => m.tenant_id === tenantId)?.tenant_name || '—';

  const applyView = (view: SavedView) => {
    setStatusFilter(view.status);
    setPriorityFilter(view.priority);
    setPeriodFilter(view.period);
    setSlaOnlyFilter(view.slaOnly);
    setShowFilters(true);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setPeriodFilter('all');
    setDeptFilter('all');
    setSlaOnlyFilter(false);
    setSearch('');
  };

  const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all' || periodFilter !== 'all' || deptFilter !== 'all' || slaOnlyFilter;

  const filtered = useMemo(() => {
    return workOrders.filter((wo: any) => {
      // Dept filter
      if (deptFilter !== 'all' && wo.tenant_id !== deptFilter) return false;
      // Status filter
      if (statusFilter === 'open' && !OPEN_STATUSES.includes(wo.status)) return false;
      if (statusFilter === 'closed' && !CLOSED_STATUSES.includes(wo.status)) return false;
      if (statusFilter !== 'all' && statusFilter !== 'open' && statusFilter !== 'closed' && wo.status !== statusFilter) return false;
      // Priority filter
      if (priorityFilter !== 'all' && wo.priority !== priorityFilter) return false;
      // Period filter
      if (periodFilter !== 'all') {
        const days = parseInt(periodFilter);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        if (new Date(wo.created_at) < cutoff) return false;
      }
      // SLA overdue only
      if (slaOnlyFilter) {
        const sla = calculateSlaStatus(wo);
        if (!sla.responseOverdue && !sla.resolveOverdue) return false;
      }
      // Search
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        return wo.title?.toLowerCase().includes(s) || wo.code?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [workOrders, statusFilter, priorityFilter, periodFilter, deptFilter, slaOnlyFilter, debouncedSearch]);

  const openCount = workOrders.filter((wo: any) => OPEN_STATUSES.includes(wo.status)).length;
  const closedCount = workOrders.filter((wo: any) => CLOSED_STATUSES.includes(wo.status)).length;
  const awaitingMeCount = workOrders.filter((wo: any) => wo.status === 'aguardando_solicitante').length;
  const overdueCount = workOrders.filter((wo: any) => {
    const sla = calculateSlaStatus(wo);
    return sla.responseOverdue || sla.resolveOverdue;
  }).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold">Minhas Solicitações</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Acompanhe suas ordens de serviço</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => navigate('/portal/nova')}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Nova Solicitação</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </div>

      {/* Alerts */}
      {awaitingMeCount > 0 && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm cursor-pointer hover:bg-warning/15 transition-colors"
          onClick={() => { setStatusFilter('aguardando_solicitante'); setShowFilters(true); }}
        >
          <Bell className="h-4 w-4 text-warning shrink-0" />
          <span className="font-medium text-warning-foreground">
            {awaitingMeCount} solicitação(ões) aguardando sua resposta
          </span>
          <ChevronRight className="h-4 w-4 text-warning ml-auto shrink-0" />
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: 'Total', count: workOrders.length, icon: ClipboardList, filter: 'all', color: 'text-muted-foreground' },
          { label: 'Abertas', count: openCount, icon: Clock, filter: 'open', color: 'text-blue-500' },
          { label: 'Aguard. Você', count: awaitingMeCount, icon: Hourglass, filter: 'aguardando_solicitante', color: 'text-warning' },
          { label: 'Concluídas', count: closedCount, icon: CheckCircle2, filter: 'closed', color: 'text-green-500' },
          { label: 'Atrasadas', count: overdueCount, icon: AlertTriangle, filter: 'sla', color: 'text-destructive' },
        ].map(item => (
          <Card
            key={item.label}
            className={`border-border/50 shadow-none cursor-pointer hover:bg-muted/30 transition-all duration-200 rounded-xl ${
              (statusFilter === item.filter || (item.filter === 'sla' && slaOnlyFilter)) ? 'ring-2 ring-primary shadow-md shadow-primary/10' : ''
            }`}
            onClick={() => {
              if (item.filter === 'sla') {
                setSlaOnlyFilter(!slaOnlyFilter);
                setStatusFilter('all');
              } else {
                setStatusFilter(statusFilter === item.filter ? 'all' : item.filter);
                setSlaOnlyFilter(false);
              }
            }}
          >
            <CardContent className="p-3 text-center">
              <item.icon className={`h-4 w-4 mx-auto mb-1 ${item.color}`} />
              <p className="text-xl font-bold">{item.count}</p>
              <p className="text-[10px] text-muted-foreground leading-tight font-medium">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Saved views */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {SAVED_VIEWS.map(view => (
          <Button
            key={view.label}
            variant="outline"
            size="sm"
            className="h-7 text-[11px] shrink-0"
            onClick={() => applyView(view)}
          >
            {view.label}
          </Button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou título..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3.5 w-3.5" />
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-fade-in">
            {/* Department filter */}
            {memberships.length > 1 && (
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Departamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos departamentos</SelectItem>
                  {memberships.map(m => (
                    <SelectItem key={m.tenant_id} value={m.tenant_id}>{m.tenant_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="open">Em Andamento</SelectItem>
                <SelectItem value="closed">Concluídas</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Prioridade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas prioridades</SelectItem>
                {Object.entries(priorityLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Results count */}
      <p className="text-[11px] text-muted-foreground">
        {filtered.length} de {workOrders.length} solicitação(ões)
      </p>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma solicitação encontrada</p>
          <p className="text-xs text-muted-foreground mt-1">
            {hasActiveFilters ? 'Tente limpar os filtros.' : 'Crie uma nova solicitação clicando no botão acima.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((wo: any) => (
            <Card
              key={wo.id}
              className="border-border/50 shadow-none cursor-pointer hover:bg-muted/30 transition-all duration-200 rounded-xl active:scale-[0.99]"
              onClick={() => navigate(`/portal/os/${wo.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{wo.code}</span>
                      {memberships.length > 1 && (
                        <Badge variant="outline" className="text-[10px] h-5 gap-1">
                          <Building2 className="h-2.5 w-2.5" />
                          {getDeptName(wo.tenant_id)}
                        </Badge>
                      )}
                      <Badge variant="outline" className={`text-[10px] h-5 ${priorityColors[wo.priority]}`}>
                        {priorityLabels[wo.priority]}
                      </Badge>
                      {wo.status === 'aguardando_solicitante' && (
                        <Badge variant="outline" className="text-[10px] h-5 bg-warning/10 text-warning border-warning/20 animate-pulse">
                          Aguardando você
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold truncate">{wo.title}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] h-5 ${statusColors[wo.status]}`}>
                        {statusLabels[wo.status]}
                      </Badge>
                      <SlaIndicator workOrder={wo} compact />
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {new Date(wo.updated_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-3 shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}