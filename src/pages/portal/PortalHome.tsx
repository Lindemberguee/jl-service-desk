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
import { useDebounce } from '@/hooks/useDebounce';
import { Search, Plus, ChevronRight, ClipboardList, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PortalHome() {
  const { currentTenantId } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const debouncedSearch = useDebounce(search, 300);

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['portal_work_orders', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenantId,
  });

  const OPEN_STATUSES = ['aberta', 'triagem', 'em_execucao', 'aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro', 'reaberta'];
  const CLOSED_STATUSES = ['concluida', 'aprovada', 'encerrada'];

  const filtered = useMemo(() => {
    return workOrders.filter((wo: any) => {
      if (statusFilter === 'open' && !OPEN_STATUSES.includes(wo.status)) return false;
      if (statusFilter === 'closed' && !CLOSED_STATUSES.includes(wo.status)) return false;
      if (statusFilter !== 'all' && statusFilter !== 'open' && statusFilter !== 'closed' && wo.status !== statusFilter) return false;
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        return wo.title?.toLowerCase().includes(s) || wo.code?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [workOrders, statusFilter, debouncedSearch]);

  const openCount = workOrders.filter((wo: any) => OPEN_STATUSES.includes(wo.status)).length;
  const closedCount = workOrders.filter((wo: any) => CLOSED_STATUSES.includes(wo.status)).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold">Minhas Solicitações</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhe suas ordens de serviço
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => navigate('/portal/nova')}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Nova Solicitação</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border shadow-none cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setStatusFilter('all')}>
          <CardContent className="p-3 text-center">
            <ClipboardList className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{workOrders.length}</p>
            <p className="text-[11px] text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setStatusFilter('open')}>
          <CardContent className="p-3 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-bold">{openCount}</p>
            <p className="text-[11px] text-muted-foreground">Em Andamento</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setStatusFilter('closed')}>
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold">{closedCount}</p>
            <p className="text-[11px] text-muted-foreground">Concluídas</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter */}
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="open">Em Andamento</SelectItem>
            <SelectItem value="closed">Concluídas</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma solicitação encontrada</p>
          <p className="text-xs text-muted-foreground mt-1">Crie uma nova solicitação clicando no botão acima.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((wo: any) => (
            <Card
              key={wo.id}
              className="border-border shadow-none cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => navigate(`/portal/os/${wo.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono text-muted-foreground">{wo.code}</span>
                      <Badge variant="outline" className={`text-[10px] h-5 ${priorityColors[wo.priority]}`}>
                        {priorityLabels[wo.priority]}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium truncate">{wo.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className={`text-[10px] h-5 ${statusColors[wo.status]}`}>
                        {statusLabels[wo.status]}
                      </Badge>
                      <SlaIndicator workOrder={wo} compact />
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {new Date(wo.updated_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-2 shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}