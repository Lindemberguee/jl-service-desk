import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  ArrowUpRight, TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';

const OPEN_STATUSES = ['aberta', 'triagem', 'em_execucao', 'aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro', 'reaberta'];
const CLOSED_STATUSES = ['concluida', 'aprovada', 'encerrada'];

type TabFilter = 'all' | 'open' | 'awaiting' | 'closed';

export default function MyWorkOrders() {
  const { memberships, user, currentTenantId } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

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

  // Fetch OS where I'm the requester
  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['my_work_orders', currentTenantId, user?.id, myCustomerIds],
    queryFn: async () => {
      if (!currentTenantId || !user?.id) return [];

      let allWOs: any[] = [];

      const { data: byUser } = await supabase
        .from('work_orders')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .eq('requester_user_id', user.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      allWOs = byUser || [];

      if (myCustomerIds.length > 0) {
        const { data: byCustomer } = await supabase
          .from('work_orders')
          .select('*')
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

  const completionRate = workOrders.length > 0
    ? Math.round((closedCount / workOrders.length) * 100)
    : 0;

  const filtered = useMemo(() => {
    return workOrders.filter((wo: any) => {
      // Tab filter
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

  const getTimeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: ptBR });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Minhas OS
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Acompanhe suas ordens de serviço</p>
        </div>
        {overdueCount > 0 && (
          <Badge variant="destructive" className="text-[10px] gap-1 animate-pulse">
            <AlertTriangle className="h-3 w-3" />
            {overdueCount} atrasada{overdueCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Alert banner */}
      {awaitingMeCount > 0 && (
        <Card
          className="border-orange-500/30 bg-orange-500/5 shadow-none cursor-pointer hover:bg-orange-500/10 transition-colors"
          onClick={() => setActiveTab('awaiting')}
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
              <Bell className="h-4.5 w-4.5 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {awaitingMeCount} OS aguardando sua resposta
              </p>
              <p className="text-[11px] text-muted-foreground">Clique para ver detalhes</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-orange-500 shrink-0" />
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50 shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span className="text-xl font-bold">{workOrders.length}</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">Total</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xl font-bold text-primary">{openCount}</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">Em andamento</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-xl font-bold text-success">{closedCount}</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">Concluídas</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xl font-bold">{completionRate}%</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">Taxa de conclusão</p>
            <Progress value={completionRate} className="h-1 mt-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Search */}
      <div className="space-y-3">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs px-3">
              Todas <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1.5">{workOrders.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="open" className="text-xs px-3">
              Abertas <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1.5">{openCount}</Badge>
            </TabsTrigger>
            {awaitingMeCount > 0 && (
              <TabsTrigger value="awaiting" className="text-xs px-3">
                Aguardando <Badge variant="destructive" className="ml-1.5 text-[10px] h-4 px-1.5">{awaitingMeCount}</Badge>
              </TabsTrigger>
            )}
            <TabsTrigger value="closed" className="text-xs px-3">
              Concluídas <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1.5">{closedCount}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

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
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 text-xs max-w-xs"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              {Object.entries(priorityLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Results info */}
      <p className="text-[11px] text-muted-foreground">
        {filtered.length} de {workOrders.length} ordem(ns)
      </p>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-border shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <ClipboardList className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold mb-1">Nenhuma OS encontrada</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {hasActiveFilters || debouncedSearch
                ? 'Tente ajustar os filtros ou a busca.'
                : 'Você ainda não possui ordens de serviço vinculadas.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((wo: any) => {
            const sla = calculateSlaStatus(wo);
            const isOverdue = sla.responseOverdue || sla.resolveOverdue;
            const isAwaiting = wo.status === 'aguardando_solicitante';

            return (
              <Card
                key={wo.id}
                className={`border-border/50 shadow-none cursor-pointer hover:bg-muted/30 transition-all duration-200 rounded-xl active:scale-[0.995] ${
                  isAwaiting ? 'border-l-2 border-l-orange-500' : isOverdue ? 'border-l-2 border-l-destructive' : ''
                }`}
                onClick={() => navigate(`/minhas-os/${wo.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Row 1: Code + Priority + Special badges */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">{wo.code}</span>
                        <Badge variant="outline" className={`text-[10px] h-5 ${priorityColors[wo.priority]}`}>
                          {priorityLabels[wo.priority]}
                        </Badge>
                        {isAwaiting && (
                          <Badge className="text-[10px] h-5 bg-orange-500 text-white border-0 gap-0.5">
                            <Hourglass className="h-2.5 w-2.5" /> Aguardando você
                          </Badge>
                        )}
                        {isOverdue && !isAwaiting && (
                          <Badge variant="destructive" className="text-[10px] h-5 gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" /> SLA
                          </Badge>
                        )}
                      </div>

                      {/* Row 2: Title */}
                      <p className="text-sm font-semibold truncate leading-tight">{wo.title}</p>

                      {/* Row 3: Status + SLA + Time */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] h-5 ${statusColors[wo.status]}`}>
                          {statusLabels[wo.status]}
                        </Badge>
                        <SlaIndicator workOrder={wo} compact />
                        <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {getTimeAgo(wo.updated_at)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground mt-4 shrink-0" />
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
