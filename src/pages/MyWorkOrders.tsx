import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/permissions';
import { SlaIndicator } from '@/components/SlaIndicator';
import { calculateSlaStatus } from '@/lib/sla';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Search, ChevronRight, ClipboardList, Clock, CheckCircle2,
  AlertTriangle, Hourglass, Bell, Filter, X, FileText, Calendar,
  ArrowUpRight, TrendingUp, Sparkles, LayoutList
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const OPEN_STATUSES = ['aberta', 'triagem', 'em_execucao', 'aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro', 'reaberta'];
const CLOSED_STATUSES = ['concluida', 'aprovada', 'encerrada'];

type TabFilter = 'all' | 'open' | 'awaiting' | 'closed';

/* ─── Metric Card ───────────────────────────────────────── */
function MetricTile({
  icon: Icon,
  label,
  value,
  color,
  active,
  onClick,
  extra,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  active?: boolean;
  onClick?: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col gap-1.5 rounded-xl border bg-card p-3.5 text-left transition-all duration-200',
        'hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5',
        active && 'ring-2 ring-primary/60 shadow-md shadow-primary/10 border-primary/30',
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', color)}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-2xl font-bold tabular-nums tracking-tight">{value}</span>
      </div>
      <p className="text-[11px] font-medium text-muted-foreground leading-none">{label}</p>
      {extra}
    </button>
  );
}

/* ─── Work Order Card ───────────────────────────────────── */
function WoCard({
  wo,
  onClick,
}: {
  wo: any;
  onClick: () => void;
}) {
  const sla = calculateSlaStatus(wo);
  const isOverdue = sla.responseOverdue || sla.resolveOverdue;
  const isAwaiting = wo.status === 'aguardando_solicitante';

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(parseISO(wo.updated_at), { addSuffix: true, locale: ptBR });
    } catch {
      return '';
    }
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-start gap-4 rounded-xl border bg-card p-4 text-left transition-all duration-200',
        'hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 hover:border-primary/20',
        'active:scale-[0.998]',
        isAwaiting && 'border-l-[3px] border-l-warning',
        isOverdue && !isAwaiting && 'border-l-[3px] border-l-destructive',
      )}
    >
      {/* Status indicator dot */}
      <div className="mt-1 shrink-0">
        <div className={cn(
          'h-10 w-10 rounded-xl flex items-center justify-center transition-colors',
          isAwaiting
            ? 'bg-warning/10'
            : isOverdue
            ? 'bg-destructive/10'
            : CLOSED_STATUSES.includes(wo.status)
            ? 'bg-emerald-500/10'
            : 'bg-primary/10',
        )}>
          {isAwaiting ? (
            <Hourglass className="h-4.5 w-4.5 text-warning" />
          ) : isOverdue ? (
            <AlertTriangle className="h-4.5 w-4.5 text-destructive" />
          ) : CLOSED_STATUSES.includes(wo.status) ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
          ) : (
            <Clock className="h-4.5 w-4.5 text-primary" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Row 1: Code + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-md">
            {wo.code}
          </span>
          <Badge variant="outline" className={cn('text-[10px] h-5 font-semibold', priorityColors[wo.priority])}>
            {priorityLabels[wo.priority]}
          </Badge>
          {isAwaiting && (
            <Badge className="text-[10px] h-5 bg-warning/15 text-warning border-warning/20 gap-1 font-semibold animate-pulse">
              <Hourglass className="h-2.5 w-2.5" /> Aguardando você
            </Badge>
          )}
          {isOverdue && !isAwaiting && (
            <Badge variant="destructive" className="text-[10px] h-5 gap-1 font-semibold">
              <AlertTriangle className="h-2.5 w-2.5" /> SLA
            </Badge>
          )}
        </div>

        {/* Row 2: Title */}
        <p className="text-sm font-semibold truncate leading-tight group-hover:text-primary transition-colors">
          {wo.title}
        </p>

        {/* Row 3: Status + SLA + Time */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn('text-[10px] h-5 font-medium', statusColors[wo.status])}>
            {statusLabels[wo.status]}
          </Badge>
          <SlaIndicator workOrder={wo} compact />
          <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {timeAgo}
          </span>
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 mt-5 shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════ */

export default function MyWorkOrders() {
  const { memberships, user, currentTenantId } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data: myCustomerIds = [] } = useQuery({
    queryKey: ['my_customer_ids', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from('customers').select('id').eq('user_id', user.id);
      return (data || []).map((c: any) => c.id);
    },
    enabled: !!user?.id,
  });

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['my_work_orders', currentTenantId, user?.id, myCustomerIds],
    queryFn: async () => {
      if (!currentTenantId || !user?.id) return [];
      let allWOs: any[] = [];
      const { data: byUser } = await supabase
        .from('work_orders').select('*')
        .eq('tenant_id', currentTenantId)
        .eq('requester_user_id', user.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      allWOs = byUser || [];

      if (myCustomerIds.length > 0) {
        const { data: byCustomer } = await supabase
          .from('work_orders').select('*')
          .eq('tenant_id', currentTenantId)
          .in('requester_id', myCustomerIds)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false });
        const existingIds = new Set(allWOs.map((wo: any) => wo.id));
        for (const wo of (byCustomer || [])) {
          if (!existingIds.has(wo.id)) allWOs.push(wo);
        }
      }

      allWOs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return allWOs;
    },
    enabled: !!currentTenantId && !!user?.id,
  });

  const openCount = workOrders.filter((wo: any) => OPEN_STATUSES.includes(wo.status)).length;
  const closedCount = workOrders.filter((wo: any) => CLOSED_STATUSES.includes(wo.status)).length;
  const awaitingMeCount = workOrders.filter((wo: any) => wo.status === 'aguardando_solicitante').length;
  const overdueCount = workOrders.filter((wo: any) => {
    const sla = calculateSlaStatus(wo);
    return sla.responseOverdue || sla.resolveOverdue;
  }).length;
  const completionRate = workOrders.length > 0 ? Math.round((closedCount / workOrders.length) * 100) : 0;

  const filtered = useMemo(() => {
    return workOrders.filter((wo: any) => {
      if (activeTab === 'open' && !OPEN_STATUSES.includes(wo.status)) return false;
      if (activeTab === 'closed' && !CLOSED_STATUSES.includes(wo.status)) return false;
      if (activeTab === 'awaiting' && wo.status !== 'aguardando_solicitante') return false;
      if (priorityFilter !== 'all' && wo.priority !== priorityFilter) return false;
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        return wo.title?.toLowerCase().includes(s) || wo.code?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [workOrders, activeTab, priorityFilter, debouncedSearch]);

  const hasActiveFilters = priorityFilter !== 'all';

  const clearFilters = () => {
    setPriorityFilter('all');
    setSearch('');
    setActiveTab('all');
  };

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <LayoutList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Minhas OS</h1>
            <p className="text-xs text-muted-foreground">Acompanhe suas ordens de serviço</p>
          </div>
        </div>
        {overdueCount > 0 && (
          <Badge variant="destructive" className="text-[10px] gap-1.5 h-6 animate-pulse font-semibold">
            <AlertTriangle className="h-3 w-3" />
            {overdueCount} atrasada{overdueCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* ─── Alert banner ─── */}
      {awaitingMeCount > 0 && (
        <button
          type="button"
          onClick={() => setActiveTab('awaiting')}
          className="w-full flex items-center gap-3 rounded-xl border border-warning/25 bg-warning/5 p-3.5 transition-all hover:bg-warning/10 hover:shadow-sm"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15">
            <Bell className="h-5 w-5 text-warning" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-semibold">{awaitingMeCount} OS aguardando sua resposta</p>
            <p className="text-[11px] text-muted-foreground">Clique para visualizar</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-warning shrink-0" />
        </button>
      )}

      {/* ─── KPI Strip ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricTile
          icon={ClipboardList}
          label="Total de OS"
          value={workOrders.length}
          color="bg-muted/80 text-muted-foreground"
          active={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
        />
        <MetricTile
          icon={Clock}
          label="Em andamento"
          value={openCount}
          color="bg-primary/10 text-primary"
          active={activeTab === 'open'}
          onClick={() => setActiveTab('open')}
        />
        <MetricTile
          icon={CheckCircle2}
          label="Concluídas"
          value={closedCount}
          color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          active={activeTab === 'closed'}
          onClick={() => setActiveTab('closed')}
        />
        <MetricTile
          icon={TrendingUp}
          label="Taxa de conclusão"
          value={completionRate}
          color="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          extra={<Progress value={completionRate} className="h-1.5 mt-0.5" />}
        />
      </div>

      {/* ─── Tabs + Search ─── */}
      <div className="space-y-3">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
          <TabsList className="h-9 bg-muted/50">
            <TabsTrigger value="all" className="text-xs px-3 gap-1.5">
              Todas <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">{workOrders.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="open" className="text-xs px-3 gap-1.5">
              Abertas <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">{openCount}</Badge>
            </TabsTrigger>
            {awaitingMeCount > 0 && (
              <TabsTrigger value="awaiting" className="text-xs px-3 gap-1.5">
                Aguardando <Badge variant="destructive" className="text-[10px] h-4 px-1.5 ml-1">{awaitingMeCount}</Badge>
              </TabsTrigger>
            )}
            <TabsTrigger value="closed" className="text-xs px-3 gap-1.5">
              Concluídas <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">{closedCount}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou título..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 text-sm bg-card"
            />
          </div>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {showFilters && (
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 text-xs max-w-xs bg-card">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              {Object.entries(priorityLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ─── Results info ─── */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground font-medium">
          {filtered.length} de {workOrders.length} ordem(ns)
        </p>
      </div>

      {/* ─── List ─── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-5">
              <Sparkles className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <h2 className="text-base font-semibold mb-1">Nenhuma OS encontrada</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {hasActiveFilters || debouncedSearch
                ? 'Tente ajustar os filtros ou a busca.'
                : 'Você ainda não possui ordens de serviço vinculadas.'}
            </p>
            {(hasActiveFilters || debouncedSearch) && (
              <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" /> Limpar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((wo: any) => (
            <WoCard key={wo.id} wo={wo} onClick={() => navigate(`/minhas-os/${wo.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
