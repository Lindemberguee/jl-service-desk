import { useState, useMemo } from 'react';
import { ExportWorkOrdersDialog } from '@/components/ExportWorkOrdersDialog';
import { PrintWorkOrderGuide } from '@/components/PrintWorkOrderGuide';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { statusLabels, statusColors, priorityLabels, priorityColors, hasPermission } from '@/lib/permissions';
import {
  Search, Plus, X, Filter, ChevronRight, ChevronDown, ChevronUp, ChevronLeft,
  ArrowUpDown, CalendarDays, AlertTriangle, UserCheck, Download, Play, Clock,
  ClipboardList, Printer, ChevronsLeft, ChevronsRight, Inbox, CheckCircle2,
  Zap, Timer, LayoutGrid, List, Building2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { SlaIndicator } from '@/components/SlaIndicator';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAllTenantsQuery } from '@/hooks/useAllTenantsQuery';
import { useToast } from '@/hooks/use-toast';
import { calculateSlaStatus } from '@/lib/sla';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type SortField = 'created_at' | 'updated_at' | 'priority' | 'status' | 'code' | 'title';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
const PAGE_SIZES = [10, 25, 50, 100];

interface SavedView {
  id: string;
  label: string;
  icon: typeof AlertTriangle;
  filters: Partial<{
    status: string; priority: string; assigned: string; sla: string;
    category: string; unit: string; visibility: string;
  }>;
}

const SAVED_VIEWS: SavedView[] = [
  { id: 'minhas', label: 'Minhas OS', icon: UserCheck, filters: { assigned: 'me' } },
  { id: 'criticas', label: 'Críticas', icon: AlertTriangle, filters: { priority: 'critica', sla: 'overdue' } },
  { id: 'aguardando_peca', label: 'Aguard. Peça', icon: Clock, filters: { status: 'aguardando_peca' } },
  { id: 'em_execucao', label: 'Em Execução', icon: Play, filters: { status: 'em_execucao' } },
  { id: 'abertas', label: 'Abertas', icon: ClipboardList, filters: { status: 'aberta' } },
];

const priorityDot: Record<string, string> = {
  critica: 'bg-red-500',
  alta: 'bg-orange-500',
  media: 'bg-yellow-500',
  baixa: 'bg-emerald-500',
};

export default function WorkOrders() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { currentTenantId, currentRole, user, memberships } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { tenantName, primaryColor } = useTenantBranding();

  const [activeView, setActiveView] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>('all');
  const [slaFilter, setSlaFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showPrintGuide, setShowPrintGuide] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const applyView = (view: SavedView) => {
    if (activeView === view.id) {
      setActiveView(null);
      setStatusFilter('all'); setPriorityFilter('all'); setAssignedFilter('all');
      setSlaFilter('all'); setCategoryFilter('all'); setUnitFilter('all');
      setVisibilityFilter('all');
    } else {
      setActiveView(view.id);
      setStatusFilter(view.filters.status || 'all');
      setPriorityFilter(view.filters.priority || 'all');
      setAssignedFilter(view.filters.assigned || 'all');
      setSlaFilter(view.filters.sla || 'all');
      setCategoryFilter(view.filters.category || 'all');
      setUnitFilter(view.filters.unit || 'all');
      setVisibilityFilter(view.filters.visibility || 'all');
    }
    setPage(1);
  };

  const debouncedSearch = useDebounce(search, 300);
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: workOrders = [], isLoading } = useAllTenantsQuery<any>('work_orders_all', 'work_orders');
  const { data: categories = [] } = useAllTenantsQuery<any>('categories_all', 'categories');
  const { data: units = [] } = useAllTenantsQuery<any>('units_all', 'units');
  const { data: locations = [] } = useAllTenantsQuery<any>('locations_all', 'locations');
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles_list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, name, email, avatar_url');
      return data || [];
    },
  });
  const { data: customers = [] } = useAllTenantsQuery<any>('customers_all', 'customers');

  const tenantMap = Object.fromEntries(memberships.map(m => [m.tenant_id, m.tenant_name || m.tenant_slug || '']));
  const canCreate = currentRole && hasPermission(currentRole, 'os:create');
  const canUpdate = currentRole && hasPermission(currentRole, 'os:update');
  const canAssign = currentRole && hasPermission(currentRole, 'os:assign');

  // Stats
  const stats = useMemo(() => {
    const all = workOrders.filter((wo: any) => !wo.deleted_at);
    const abertas = all.filter((wo: any) => wo.status === 'aberta').length;
    const emExecucao = all.filter((wo: any) => wo.status === 'em_execucao').length;
    const atrasadas = all.filter((wo: any) => {
      const sla = calculateSlaStatus(wo);
      return sla.responseOverdue || sla.resolveOverdue;
    }).length;
    const concluidas = all.filter((wo: any) => ['concluida', 'aprovada', 'encerrada'].includes(wo.status)).length;
    return { abertas, emExecucao, atrasadas, concluidas, total: all.length };
  }, [workOrders]);

  const filtered = useMemo(() => {
    let result = workOrders.filter((wo: any) => wo.deleted_at === null || wo.deleted_at === undefined).filter((wo: any) => {
      if (deptFilter !== 'all' && wo.tenant_id !== deptFilter) return false;
      if (statusFilter !== 'all' && wo.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && wo.priority !== priorityFilter) return false;
      if (categoryFilter !== 'all' && wo.category_id !== categoryFilter) return false;
      if (unitFilter !== 'all' && wo.unit_id !== unitFilter) return false;
      if (visibilityFilter !== 'all' && wo.visibility !== visibilityFilter) return false;
      if (assignedFilter === 'me' && wo.assigned_to_id !== user?.id) return false;
      if (assignedFilter === 'unassigned' && wo.assigned_to_id) return false;
      if (assignedFilter !== 'all' && assignedFilter !== 'me' && assignedFilter !== 'unassigned' && wo.assigned_to_id !== assignedFilter) return false;
      if (slaFilter === 'overdue') {
        const sla = calculateSlaStatus(wo);
        if (!sla.responseOverdue && !sla.resolveOverdue) return false;
      }
      if (dateFrom && new Date(wo.created_at) < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(wo.created_at) > end) return false;
      }
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        const requesterName = (() => {
          if (wo.requester_id) {
            const c = customers.find((c: any) => c.id === wo.requester_id);
            return c?.name?.toLowerCase() || '';
          }
          if (wo.requester_user_id) {
            const p = profiles.find((p: any) => p.id === wo.requester_user_id);
            return p?.name?.toLowerCase() || '';
          }
          return '';
        })();
        return wo.title?.toLowerCase().includes(s) || wo.code?.toLowerCase().includes(s) || requesterName.includes(s);
      }
      return true;
    });

    result.sort((a: any, b: any) => {
      let cmp = 0;
      switch (sortField) {
        case 'priority':
          cmp = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
          break;
        case 'status':
          cmp = (a.status || '').localeCompare(b.status || '');
          break;
        case 'code':
          cmp = (a.code || '').localeCompare(b.code || '');
          break;
        case 'title':
          cmp = (a.title || '').localeCompare(b.title || '');
          break;
        default:
          cmp = new Date(a[sortField] || 0).getTime() - new Date(b[sortField] || 0).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [workOrders, deptFilter, statusFilter, priorityFilter, categoryFilter, unitFilter, visibilityFilter, assignedFilter, slaFilter, dateFrom, dateTo, debouncedSearch, sortField, sortDir, user?.id]);

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const resetPage = () => setPage(1);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    resetPage();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-0.5 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('work_orders').update({ status } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work_orders'] });
      qc.invalidateQueries({ queryKey: ['work_orders_all'] });
      toast({ title: 'Status atualizado' });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ ids, assignedToId }: { ids: string[]; assignedToId: string | null }) => {
      for (const id of ids) {
        const { error } = await supabase.from('work_orders').update({ assigned_to_id: assignedToId } as any).eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work_orders'] });
      qc.invalidateQueries({ queryKey: ['work_orders_all'] });
      setSelectedIds(new Set());
      toast({ title: 'OS atribuída(s) com sucesso' });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      for (const id of ids) {
        const { error } = await supabase.from('work_orders').update({ status } as any).eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work_orders'] });
      qc.invalidateQueries({ queryKey: ['work_orders_all'] });
      setSelectedIds(new Set());
      toast({ title: 'Status atualizado em lote' });
    },
  });

  const getUnitName = (id: string | null) => units.find((u: any) => u.id === id)?.name || '';
  const getLocationName = (id: string | null) => locations.find((l: any) => l.id === id)?.name || '';

  const activeFilters = [
    deptFilter !== 'all' && { key: 'dept', label: `Depto: ${tenantMap[deptFilter] || ''}`, clear: () => { setDeptFilter('all'); resetPage(); } },
    statusFilter !== 'all' && { key: 'status', label: `${statusLabels[statusFilter]}`, clear: () => { setStatusFilter('all'); resetPage(); } },
    priorityFilter !== 'all' && { key: 'priority', label: `${priorityLabels[priorityFilter]}`, clear: () => { setPriorityFilter('all'); resetPage(); } },
    categoryFilter !== 'all' && { key: 'category', label: `${categories.find((c: any) => c.id === categoryFilter)?.name || ''}`, clear: () => { setCategoryFilter('all'); resetPage(); } },
    unitFilter !== 'all' && { key: 'unit', label: `${units.find((u: any) => u.id === unitFilter)?.name || ''}`, clear: () => { setUnitFilter('all'); resetPage(); } },
    slaFilter !== 'all' && { key: 'sla', label: 'Atrasadas', clear: () => { setSlaFilter('all'); resetPage(); } },
    visibilityFilter !== 'all' && { key: 'visibility', label: visibilityFilter === 'internal' ? 'Interna' : 'Cliente', clear: () => { setVisibilityFilter('all'); resetPage(); } },
    assignedFilter !== 'all' && { key: 'assigned', label: assignedFilter === 'me' ? 'Minhas' : assignedFilter === 'unassigned' ? 'Sem resp.' : 'Filtrado', clear: () => { setAssignedFilter('all'); resetPage(); } },
    dateFrom && { key: 'dateFrom', label: `De ${format(dateFrom, 'dd/MM')}`, clear: () => { setDateFrom(undefined); resetPage(); } },
    dateTo && { key: 'dateTo', label: `Até ${format(dateTo, 'dd/MM')}`, clear: () => { setDateTo(undefined); resetPage(); } },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const getAssignedProfile = (id: string | null) => id ? profiles.find((p: any) => p.id === id) || null : null;
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  const getRequesterName = (wo: any) => {
    if (wo.requester_id) { const c = customers.find((c: any) => c.id === wo.requester_id); return c?.name || '—'; }
    if (wo.requester_user_id) { const p = profiles.find((p: any) => p.id === wo.requester_user_id); return p?.name || '—'; }
    return '—';
  };

  const clearAllFilters = () => {
    setStatusFilter('all'); setPriorityFilter('all'); setCategoryFilter('all');
    setUnitFilter('all'); setAssignedFilter('all'); setSlaFilter('all');
    setVisibilityFilter('all'); setDeptFilter('all'); setDateFrom(undefined); setDateTo(undefined);
    setSearch(''); setActiveView(null); resetPage();
  };

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin}min`;
    if (diffHrs < 24) return `${diffHrs}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Ordens de Serviço</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalCount} de {stats.total} registros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center bg-muted/50 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs hidden sm:flex" onClick={() => setShowPrintGuide(true)}>
            <Printer className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs hidden sm:flex" onClick={() => setShowExportDialog(true)}>
            <Download className="h-3.5 w-3.5" />
          </Button>
          {canCreate && (
            <Button size="sm" onClick={() => navigate('/os/nova')} className="h-8 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nova OS</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => { setStatusFilter(statusFilter === 'aberta' ? 'all' : 'aberta'); setActiveView(null); resetPage(); }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            statusFilter === 'aberta'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-card shadow-[0_1px_4px_0_hsl(var(--foreground)/0.04)] hover:shadow-[0_2px_8px_0_hsl(var(--foreground)/0.08)]'
          }`}
        >
          <div className={`p-2 rounded-lg ${statusFilter === 'aberta' ? 'bg-primary-foreground/20' : 'bg-blue-500/10'}`}>
            <Inbox className={`h-4 w-4 ${statusFilter === 'aberta' ? 'text-primary-foreground' : 'text-blue-500'}`} />
          </div>
          <div className="text-left">
            <p className={`text-lg font-bold leading-none ${statusFilter === 'aberta' ? '' : 'text-foreground'}`}>{stats.abertas}</p>
            <p className={`text-[10px] mt-0.5 ${statusFilter === 'aberta' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>Abertas</p>
          </div>
        </button>

        <button
          onClick={() => { setStatusFilter(statusFilter === 'em_execucao' ? 'all' : 'em_execucao'); setActiveView(null); resetPage(); }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            statusFilter === 'em_execucao'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-card shadow-[0_1px_4px_0_hsl(var(--foreground)/0.04)] hover:shadow-[0_2px_8px_0_hsl(var(--foreground)/0.08)]'
          }`}
        >
          <div className={`p-2 rounded-lg ${statusFilter === 'em_execucao' ? 'bg-primary-foreground/20' : 'bg-amber-500/10'}`}>
            <Zap className={`h-4 w-4 ${statusFilter === 'em_execucao' ? 'text-primary-foreground' : 'text-amber-500'}`} />
          </div>
          <div className="text-left">
            <p className={`text-lg font-bold leading-none ${statusFilter === 'em_execucao' ? '' : 'text-foreground'}`}>{stats.emExecucao}</p>
            <p className={`text-[10px] mt-0.5 ${statusFilter === 'em_execucao' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>Executando</p>
          </div>
        </button>

        <button
          onClick={() => { setSlaFilter(slaFilter === 'overdue' ? 'all' : 'overdue'); setActiveView(null); resetPage(); }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            slaFilter === 'overdue'
              ? 'bg-destructive text-destructive-foreground shadow-md'
              : 'bg-card shadow-[0_1px_4px_0_hsl(var(--foreground)/0.04)] hover:shadow-[0_2px_8px_0_hsl(var(--foreground)/0.08)]'
          }`}
        >
          <div className={`p-2 rounded-lg ${slaFilter === 'overdue' ? 'bg-destructive-foreground/20' : 'bg-red-500/10'}`}>
            <Timer className={`h-4 w-4 ${slaFilter === 'overdue' ? 'text-destructive-foreground' : 'text-red-500'}`} />
          </div>
          <div className="text-left">
            <p className={`text-lg font-bold leading-none ${slaFilter === 'overdue' ? '' : 'text-foreground'}`}>{stats.atrasadas}</p>
            <p className={`text-[10px] mt-0.5 ${slaFilter === 'overdue' ? 'text-destructive-foreground/70' : 'text-muted-foreground'}`}>Atrasadas</p>
          </div>
        </button>

        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card shadow-[0_1px_4px_0_hsl(var(--foreground)/0.04)]">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-left">
            <p className="text-lg font-bold leading-none text-foreground">{stats.concluidas}</p>
            <p className="text-[10px] mt-0.5 text-muted-foreground">Concluídas</p>
          </div>
        </div>
      </div>

      {/* Search + Filters bar */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar código, título ou solicitante..."
            value={search}
            onChange={e => { setSearch(e.target.value); resetPage(); }}
            className="pl-9 h-9 text-sm border-border/40 bg-card shadow-[0_1px_3px_0_hsl(var(--foreground)/0.03)] focus-visible:shadow-[0_2px_8px_0_hsl(var(--foreground)/0.06)]"
          />
          {search && (
            <button onClick={() => { setSearch(''); resetPage(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button
          variant={showAdvancedFilters ? 'default' : 'outline'}
          size="sm"
          className="h-9 gap-1.5 text-xs shrink-0"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          <Filter className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Filtros</span>
          {activeFilters.length > 0 && (
            <span className="h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
              {activeFilters.length}
            </span>
          )}
        </Button>
      </div>

      {/* Quick view pills */}
      <div className="flex gap-1.5 flex-wrap">
        {SAVED_VIEWS.map(view => (
          <button
            key={view.id}
            onClick={() => applyView(view)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              activeView === view.id
                ? 'bg-primary text-primary-foreground shadow-sm scale-[1.02]'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <view.icon className="h-3 w-3" />
            {view.label}
          </button>
        ))}
      </div>

      {/* Collapsible Filters Panel */}
      {showAdvancedFilters && (
        <div className="bg-card rounded-xl shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtros avançados</span>
            {activeFilters.length > 0 && (
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground" onClick={clearAllFilters}>
                Limpar todos
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {memberships.length > 1 && (
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Departamento</label>
                <Select value={deptFilter} onValueChange={v => { setDeptFilter(v); resetPage(); }}>
                  <SelectTrigger className="h-8 text-xs border-border/40 bg-muted/30"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {memberships.map(m => <SelectItem key={m.tenant_id} value={m.tenant_id}>{m.tenant_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Status</label>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); resetPage(); }}>
                <SelectTrigger className="h-8 text-xs border-border/40 bg-muted/30"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Prioridade</label>
              <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v); resetPage(); }}>
                <SelectTrigger className="h-8 text-xs border-border/40 bg-muted/30"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Responsável</label>
              <Select value={assignedFilter} onValueChange={v => { setAssignedFilter(v); resetPage(); }}>
                <SelectTrigger className="h-8 text-xs border-border/40 bg-muted/30"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="me">Minhas OS</SelectItem>
                  <SelectItem value="unassigned">Sem responsável</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Categoria</label>
              <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); resetPage(); }}>
                <SelectTrigger className="h-8 text-xs border-border/40 bg-muted/30"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Unidade</label>
              <Select value={unitFilter} onValueChange={v => { setUnitFilter(v); resetPage(); }}>
                <SelectTrigger className="h-8 text-xs border-border/40 bg-muted/30"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Visibilidade</label>
              <Select value={visibilityFilter} onValueChange={v => { setVisibilityFilter(v); resetPage(); }}>
                <SelectTrigger className="h-8 text-xs border-border/40 bg-muted/30"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="internal">Interna</SelectItem>
                  <SelectItem value="customer">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Data de</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1 w-full justify-start border-border/40 bg-muted/30 font-normal">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yy') : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={d => { setDateFrom(d); resetPage(); }} locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Data até</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1 w-full justify-start border-border/40 bg-muted/30 font-normal">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    {dateTo ? format(dateTo, 'dd/MM/yy') : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={d => { setDateTo(d); resetPage(); }} locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeFilters.length > 0 && !showAdvancedFilters && (
        <div className="flex gap-1.5 flex-wrap items-center">
          {activeFilters.map(f => (
            <Badge key={f.key} variant="secondary" className="gap-1 cursor-pointer text-[11px] h-6 bg-muted/60 hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={f.clear}>
              {f.label}
              <X className="h-2.5 w-2.5" />
            </Badge>
          ))}
          <button className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1 underline-offset-2 hover:underline" onClick={clearAllFilters}>
            Limpar tudo
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && canUpdate && (
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex items-center gap-2 flex-wrap animate-in slide-in-from-top-1 duration-200">
          <span className="text-xs font-semibold text-primary">{selectedIds.size} selecionada(s)</span>
          <div className="flex gap-1.5 ml-auto">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowPrintGuide(true)}>
              <Printer className="h-3 w-3" /> Guia
            </Button>
            {canAssign && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"><UserCheck className="h-3 w-3" /> Atribuir</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => assignMutation.mutate({ ids: [...selectedIds], assignedToId: user?.id || null })}>Para mim</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {profiles.slice(0, 15).map((p: any) => (
                    <DropdownMenuItem key={p.id} onClick={() => assignMutation.mutate({ ids: [...selectedIds], assignedToId: p.id })}>{p.name}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1">Mudar Status</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <DropdownMenuItem key={k} onClick={() => bulkStatusMutation.mutate({ ids: [...selectedIds], status: k })}>{v}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] py-20 text-center text-muted-foreground">
          <Filter className="mx-auto h-10 w-10 mb-3 opacity-15" />
          <p className="text-sm font-medium">Nenhuma OS encontrada</p>
          <p className="text-xs mt-1 text-muted-foreground/70">Ajuste os filtros ou crie uma nova OS.</p>
        </div>
      ) : (isMobile || viewMode === 'cards') ? (
        /* Card view */
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedData.map((wo: any) => {
            const sla = calculateSlaStatus(wo);
            const isOverdue = sla.responseOverdue || sla.resolveOverdue;
            const assignedProfile = getAssignedProfile(wo.assigned_to_id);

            return (
              <div
                key={wo.id}
                className={`bg-card rounded-xl p-4 cursor-pointer transition-all hover:shadow-[0_4px_16px_0_hsl(var(--foreground)/0.08)] shadow-[0_1px_4px_0_hsl(var(--foreground)/0.04)] ${
                  isOverdue ? 'border-l-2 border-l-destructive' : 'border-l-2 border-l-transparent'
                }`}
                onClick={() => navigate(`/os/${wo.id}`)}
              >
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">{wo.code}</span>
                      <div className={`h-1.5 w-1.5 rounded-full ${priorityDot[wo.priority] || 'bg-muted'}`} />
                      {memberships.length > 1 && (
                        <span className="text-[10px] text-muted-foreground/60 truncate">{tenantMap[wo.tenant_id]}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate mt-1 leading-snug">{wo.title}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-1" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] h-5 ${statusColors[wo.status]}`}>
                    {statusLabels[wo.status]}
                  </Badge>
                  <SlaIndicator workOrder={wo} compact />
                  {assignedProfile && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-5 w-5 ml-auto">
                          <AvatarImage src={assignedProfile.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-medium">
                            {getInitials(assignedProfile.name)}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">{assignedProfile.name}</TooltipContent>
                    </Tooltip>
                  )}
                  <span className="text-[10px] text-muted-foreground/60 ml-auto tabular-nums">
                    {formatRelativeDate(wo.updated_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Desktop Table */
        <TooltipProvider delayDuration={200}>
          <div className="bg-card rounded-xl overflow-hidden shadow-[0_1px_4px_0_hsl(var(--foreground)/0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="px-4 py-3 text-left">
                      <button className="inline-flex items-center text-[10px] font-semibold uppercase text-muted-foreground tracking-wider" onClick={() => handleSort('code')}>
                        Código <SortIcon field="code" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left min-w-[220px]">
                      <button className="inline-flex items-center text-[10px] font-semibold uppercase text-muted-foreground tracking-wider" onClick={() => handleSort('title')}>
                        Título <SortIcon field="title" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap hidden md:table-cell">
                      <button className="inline-flex items-center text-[10px] font-semibold uppercase text-muted-foreground tracking-wider" onClick={() => handleSort('priority')}>
                        Status <SortIcon field="priority" />
                      </button>
                    </th>
                    {memberships.length > 1 && (
                      <th className="px-4 py-3 text-left whitespace-nowrap hidden lg:table-cell">
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Depto</span>
                      </th>
                    )}
                    <th className="px-4 py-3 text-left whitespace-nowrap hidden lg:table-cell">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Responsável</span>
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap hidden xl:table-cell">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Solicitante</span>
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap hidden md:table-cell">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">SLA</span>
                    </th>
                    <th className="px-4 py-3 text-right whitespace-nowrap hidden sm:table-cell">
                      <button className="inline-flex items-center text-[10px] font-semibold uppercase text-muted-foreground tracking-wider ml-auto" onClick={() => handleSort('updated_at')}>
                        Atualizada <SortIcon field="updated_at" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((wo: any, idx: number) => {
                    const sla = calculateSlaStatus(wo);
                    const isOverdue = sla.responseOverdue || sla.resolveOverdue;
                    const assignedProfile = getAssignedProfile(wo.assigned_to_id);
                    const unitName = getUnitName(wo.unit_id);
                    const locationName = getLocationName(wo.location_id);
                    const locationStr = [unitName, locationName].filter(Boolean).join(' › ');

                    return (
                      <tr
                        key={wo.id}
                        className={`cursor-pointer group transition-colors border-b border-border/10 last:border-b-0 ${
                          isOverdue
                            ? 'hover:bg-destructive/[0.03] bg-destructive/[0.01]'
                            : 'hover:bg-muted/30'
                        }`}
                        onClick={() => navigate(`/os/${wo.id}`)}
                      >
                        {/* Code + Priority dot */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full shrink-0 ${priorityDot[wo.priority] || 'bg-muted'}`} />
                            <span className="font-mono text-xs text-muted-foreground">{wo.code}</span>
                          </div>
                        </td>

                        {/* Title + location subtitle */}
                        <td className="px-4 py-3 max-w-[300px]">
                          <p className="text-[13px] font-medium truncate leading-tight group-hover:text-primary transition-colors">{wo.title}</p>
                          {locationStr && (
                            <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{locationStr}</p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1.5 md:hidden flex-wrap">
                            <Badge variant="outline" className={`text-[10px] h-5 ${priorityColors[wo.priority]}`}>{priorityLabels[wo.priority]}</Badge>
                            <Badge variant="outline" className={`text-[10px] h-5 ${statusColors[wo.status]}`}>{statusLabels[wo.status]}</Badge>
                            <SlaIndicator workOrder={wo} compact />
                          </div>
                        </td>

                        {/* Priority + Status */}
                        <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className={`text-[10px] h-5 font-semibold ${priorityColors[wo.priority]}`}>
                              {priorityLabels[wo.priority]}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] h-5 ${statusColors[wo.status]}`}>
                              {statusLabels[wo.status]}
                            </Badge>
                          </div>
                        </td>

                        {/* Depto (conditional) */}
                        {memberships.length > 1 && (
                          <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                            <span className="text-[11px] text-muted-foreground">{tenantMap[wo.tenant_id] || '—'}</span>
                          </td>
                        )}

                        {/* Responsável */}
                        <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                          {assignedProfile ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={assignedProfile.avatar_url || undefined} alt={assignedProfile.name} />
                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                                  {getInitials(assignedProfile.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[11px] font-medium max-w-[90px] truncate">{assignedProfile.name}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/40">Sem responsável</span>
                          )}
                        </td>

                        {/* Solicitante */}
                        <td className="px-4 py-3 whitespace-nowrap hidden xl:table-cell">
                          <span className="text-[11px] text-muted-foreground max-w-[110px] truncate block">{getRequesterName(wo)}</span>
                        </td>

                        {/* SLA */}
                        <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                          <SlaIndicator workOrder={wo} compact />
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 whitespace-nowrap text-right hidden sm:table-cell">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[11px] text-muted-foreground/70 tabular-nums">
                                {formatRelativeDate(wo.updated_at)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">
                              {new Date(wo.updated_at).toLocaleString('pt-BR')}
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TooltipProvider>
      )}

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 w-[70px] text-xs border-border/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(s => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">por página</span>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(1)}>
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            <span className="text-xs text-muted-foreground px-2 tabular-nums">
              {page} / {totalPages}
            </span>

            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ExportWorkOrdersDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        workOrders={filtered}
        profiles={profiles}
        customers={customers}
        locations={locations}
        units={units}
        tenantMap={tenantMap}
        tenantName={tenantName}
        primaryColor={primaryColor}
      />
      <PrintWorkOrderGuide
        open={showPrintGuide}
        onOpenChange={setShowPrintGuide}
        workOrders={selectedIds.size > 0 ? filtered.filter((wo: any) => selectedIds.has(wo.id)) : filtered.filter((wo: any) => !['concluida', 'aprovada', 'encerrada'].includes(wo.status))}
        profiles={profiles}
        customers={customers}
        locations={locations}
        units={units}
        tenantName={tenantName}
        primaryColor={primaryColor}
      />
    </div>
  );
}
