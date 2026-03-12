import { useState, useMemo, useCallback } from 'react';
import { ExportWorkOrdersDialog } from '@/components/ExportWorkOrdersDialog';
import { PrintWorkOrderGuide } from '@/components/PrintWorkOrderGuide';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { statusLabels, statusColors, priorityLabels, priorityColors, hasPermission } from '@/lib/permissions';
import {
  Search, Plus, X, Filter, ChevronRight, ChevronDown, ChevronUp, ChevronLeft,
  ArrowUpDown, CalendarDays, AlertTriangle, UserCheck, Download, Clock,
  Printer, ChevronsLeft, ChevronsRight, MoreHorizontal, Pencil, Trash2
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
type TabFilter = 'all' | 'open' | 'in_progress' | 'overdue' | 'closed';

const PRIORITY_ORDER: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
const PAGE_SIZES = [10, 25, 50, 100];

const OPEN_STATUSES = ['aberta', 'triagem', 'reaberta'];
const IN_PROGRESS_STATUSES = ['em_execucao', 'aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro'];
const CLOSED_STATUSES = ['concluida', 'aprovada', 'encerrada'];

const statusDot: Record<string, string> = {
  aberta: 'bg-blue-500',
  triagem: 'bg-purple-500',
  em_execucao: 'bg-amber-500',
  aguardando_peca: 'bg-orange-500',
  aguardando_solicitante: 'bg-yellow-500',
  aguardando_terceiro: 'bg-yellow-500',
  concluida: 'bg-emerald-500',
  aprovada: 'bg-emerald-600',
  encerrada: 'bg-muted-foreground',
  reaberta: 'bg-red-500',
};

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

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
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

  // Count per tab (before filters, only excluding deleted)
  const allActive = useMemo(() => workOrders.filter((wo: any) => !wo.deleted_at), [workOrders]);
  const tabCounts = useMemo(() => ({
    all: allActive.length,
    open: allActive.filter((wo: any) => OPEN_STATUSES.includes(wo.status)).length,
    in_progress: allActive.filter((wo: any) => IN_PROGRESS_STATUSES.includes(wo.status)).length,
    overdue: allActive.filter((wo: any) => {
      const sla = calculateSlaStatus(wo);
      return sla.responseOverdue || sla.resolveOverdue;
    }).length,
    closed: allActive.filter((wo: any) => CLOSED_STATUSES.includes(wo.status)).length,
  }), [allActive]);

  const filtered = useMemo(() => {
    let result = allActive.filter((wo: any) => {
      // Tab filter
      if (activeTab === 'open' && !OPEN_STATUSES.includes(wo.status)) return false;
      if (activeTab === 'in_progress' && !IN_PROGRESS_STATUSES.includes(wo.status)) return false;
      if (activeTab === 'closed' && !CLOSED_STATUSES.includes(wo.status)) return false;
      if (activeTab === 'overdue') {
        const sla = calculateSlaStatus(wo);
        if (!sla.responseOverdue && !sla.resolveOverdue) return false;
      }

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
          if (wo.requester_id) { const c = customers.find((c: any) => c.id === wo.requester_id); return c?.name?.toLowerCase() || ''; }
          if (wo.requester_user_id) { const p = profiles.find((p: any) => p.id === wo.requester_user_id); return p?.name?.toLowerCase() || ''; }
          return '';
        })();
        return wo.title?.toLowerCase().includes(s) || wo.code?.toLowerCase().includes(s) || requesterName.includes(s);
      }
      return true;
    });

    result.sort((a: any, b: any) => {
      let cmp = 0;
      switch (sortField) {
        case 'priority': cmp = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9); break;
        case 'status': cmp = (a.status || '').localeCompare(b.status || ''); break;
        case 'code': cmp = (a.code || '').localeCompare(b.code || ''); break;
        case 'title': cmp = (a.title || '').localeCompare(b.title || ''); break;
        default: cmp = new Date(a[sortField] || 0).getTime() - new Date(b[sortField] || 0).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [allActive, activeTab, deptFilter, statusFilter, priorityFilter, categoryFilter, unitFilter, visibilityFilter, assignedFilter, slaFilter, dateFrom, dateTo, debouncedSearch, sortField, sortDir, user?.id, customers, profiles]);

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
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map((wo: any) => wo.id)));
    }
  }, [selectedIds, paginatedData]);

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
    setSearch(''); resetPage();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays}d atrás`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Todas', count: tabCounts.all },
    { key: 'open', label: 'Abertas', count: tabCounts.open },
    { key: 'in_progress', label: 'Em andamento', count: tabCounts.in_progress },
    { key: 'overdue', label: 'Atrasadas', count: tabCounts.overdue },
    { key: 'closed', label: 'Concluídas', count: tabCounts.closed },
  ];

  const allPageSelected = paginatedData.length > 0 && paginatedData.every((wo: any) => selectedIds.has(wo.id));

  return (
    <div className="space-y-4">
      {/* Tabs row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); resetPage(); setSelectedIds(new Set()); }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tab.label}
              <span className={`text-xs font-bold min-w-5 h-5 flex items-center justify-center rounded-md px-1.5 ${
                activeTab === tab.key
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : tab.key === 'overdue' && tab.count > 0
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 hidden sm:flex" onClick={() => setShowPrintGuide(true)}>
            <Printer className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 hidden sm:flex" onClick={() => setShowExportDialog(true)}>
            <Download className="h-3.5 w-3.5" />
          </Button>
          {canCreate && (
            <Button size="sm" onClick={() => navigate('/os/nova')} className="h-8 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Nova OS
            </Button>
          )}
        </div>
      </div>

      {/* Search + Filter row */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar código, título ou solicitante..."
            value={search}
            onChange={e => { setSearch(e.target.value); resetPage(); }}
            className="pl-9 h-9 text-sm"
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

      {/* Filters panel */}
      {showAdvancedFilters && (
        <div className="bg-card rounded-xl border border-border/40 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
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
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
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
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Prioridade</label>
              <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v); resetPage(); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Responsável</label>
              <Select value={assignedFilter} onValueChange={v => { setAssignedFilter(v); resetPage(); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
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
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Unidade</label>
              <Select value={unitFilter} onValueChange={v => { setUnitFilter(v); resetPage(); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Visibilidade</label>
              <Select value={visibilityFilter} onValueChange={v => { setVisibilityFilter(v); resetPage(); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
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
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1 w-full justify-start font-normal">
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
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1 w-full justify-start font-normal">
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
            <Badge key={f.key} variant="secondary" className="gap-1 cursor-pointer text-[11px] h-6 hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={f.clear}>
              {f.label}
              <X className="h-2.5 w-2.5" />
            </Badge>
          ))}
          <button className="text-[11px] text-muted-foreground hover:text-foreground px-1 underline-offset-2 hover:underline" onClick={clearAllFilters}>
            Limpar tudo
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-1">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center text-muted-foreground">
          <Filter className="mx-auto h-10 w-10 mb-3 opacity-15" />
          <p className="text-sm font-medium">Nenhuma OS encontrada</p>
          <p className="text-xs mt-1 text-muted-foreground/70">Ajuste os filtros ou crie uma nova OS.</p>
        </div>
      ) : isMobile ? (
        /* Mobile card view */
        <div className="space-y-2">
          {paginatedData.map((wo: any) => {
            const sla = calculateSlaStatus(wo);
            const isOverdue = sla.responseOverdue || sla.resolveOverdue;
            const assignedProfile = getAssignedProfile(wo.assigned_to_id);

            return (
              <div
                key={wo.id}
                className={`bg-card rounded-xl p-4 cursor-pointer transition-all hover:shadow-md border border-border/30 ${
                  isOverdue ? 'border-l-2 border-l-destructive' : ''
                }`}
                onClick={() => navigate(`/os/${wo.id}`)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">{wo.code}</span>
                      <div className={`h-1.5 w-1.5 rounded-full ${priorityDot[wo.priority] || 'bg-muted'}`} />
                    </div>
                    <p className="text-sm font-medium truncate mt-1">{wo.title}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-1" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${statusDot[wo.status]}`} />
                    <span className="text-[11px] text-muted-foreground">{statusLabels[wo.status]}</span>
                  </div>
                  <SlaIndicator workOrder={wo} compact />
                  {assignedProfile && (
                    <Avatar className="h-5 w-5 ml-auto">
                      <AvatarImage src={assignedProfile.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-medium">
                        {getInitials(assignedProfile.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                    {formatDate(wo.updated_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Desktop Table */
        <TooltipProvider delayDuration={200}>
          <div className="rounded-xl border border-border/40 overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30">
                    {canUpdate && (
                      <th className="w-10 px-3 py-3">
                        <Checkbox
                          checked={allPageSelected}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Selecionar todos"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-left">
                      <button className="inline-flex items-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors" onClick={() => handleSort('code')}>
                        Nº <SortIcon field="code" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left min-w-[200px]">
                      <button className="inline-flex items-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors" onClick={() => handleSort('title')}>
                        Título <SortIcon field="title" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">
                      <button className="inline-flex items-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors" onClick={() => handleSort('status')}>
                        Status <SortIcon field="status" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">
                      <button className="inline-flex items-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors" onClick={() => handleSort('priority')}>
                        Prioridade <SortIcon field="priority" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap hidden lg:table-cell">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Responsável</span>
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap hidden xl:table-cell">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Solicitante</span>
                    </th>
                    {memberships.length > 1 && (
                      <th className="px-4 py-3 text-left whitespace-nowrap hidden lg:table-cell">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Depto</span>
                      </th>
                    )}
                    <th className="px-4 py-3 text-left whitespace-nowrap hidden md:table-cell">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Criada</span>
                    </th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">
                      <button className="inline-flex items-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors ml-auto" onClick={() => handleSort('updated_at')}>
                        Atualizada <SortIcon field="updated_at" />
                      </button>
                    </th>
                    <th className="w-10 px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((wo: any) => {
                    const sla = calculateSlaStatus(wo);
                    const isOverdue = sla.responseOverdue || sla.resolveOverdue;
                    const assignedProfile = getAssignedProfile(wo.assigned_to_id);
                    const isSelected = selectedIds.has(wo.id);

                    return (
                      <tr
                        key={wo.id}
                        className={`group cursor-pointer transition-colors border-b border-border/20 last:border-b-0 ${
                          isSelected
                            ? 'bg-primary/[0.04]'
                            : isOverdue
                              ? 'hover:bg-destructive/[0.03]'
                              : 'hover:bg-muted/40'
                        }`}
                        onClick={() => navigate(`/os/${wo.id}`)}
                      >
                        {canUpdate && (
                          <td className="w-10 px-3 py-3" onClick={e => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(wo.id)}
                              aria-label={`Selecionar ${wo.code}`}
                            />
                          </td>
                        )}

                        {/* Order # with priority indicator */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                            <span className={`font-mono text-[13px] ${isSelected ? 'text-primary font-semibold' : 'text-foreground'}`}>
                              {wo.code}
                            </span>
                          </div>
                        </td>

                        {/* Title + location */}
                        <td className="px-4 py-3 max-w-[280px]">
                          <p className="text-[13px] font-medium truncate leading-tight group-hover:text-primary transition-colors">
                            {wo.title}
                          </p>
                          {(getUnitName(wo.unit_id) || getLocationName(wo.location_id)) && (
                            <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
                              {[getUnitName(wo.unit_id), getLocationName(wo.location_id)].filter(Boolean).join(' › ')}
                            </p>
                          )}
                        </td>

                        {/* Status with dot */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full shrink-0 ${statusDot[wo.status] || 'bg-muted-foreground'}`} />
                            <span className="text-[12px] font-medium text-foreground">{statusLabels[wo.status]}</span>
                          </div>
                        </td>

                        {/* Priority */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant="outline" className={`text-[10px] h-5 font-semibold ${priorityColors[wo.priority]}`}>
                            {priorityLabels[wo.priority]}
                          </Badge>
                        </td>

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
                              <span className="text-[12px] max-w-[100px] truncate">{assignedProfile.name}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/40">—</span>
                          )}
                        </td>

                        {/* Solicitante */}
                        <td className="px-4 py-3 whitespace-nowrap hidden xl:table-cell">
                          <span className="text-[12px] text-muted-foreground max-w-[120px] truncate block">{getRequesterName(wo)}</span>
                        </td>

                        {/* Depto */}
                        {memberships.length > 1 && (
                          <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                            <span className="text-[11px] text-muted-foreground">{tenantMap[wo.tenant_id] || '—'}</span>
                          </td>
                        )}

                        {/* Created */}
                        <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[11px] text-muted-foreground tabular-nums">{formatDate(wo.created_at)}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">{new Date(wo.created_at).toLocaleString('pt-BR')}</TooltipContent>
                          </Tooltip>
                        </td>

                        {/* Updated */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[11px] text-muted-foreground tabular-nums">{formatDate(wo.updated_at)}</span>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">{new Date(wo.updated_at).toLocaleString('pt-BR')}</TooltipContent>
                          </Tooltip>
                        </td>

                        {/* Action menu */}
                        <td className="w-10 px-3 py-3" onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => navigate(`/os/${wo.id}`)}>
                                <Pencil className="h-3.5 w-3.5 mr-2" /> Ver detalhes
                              </DropdownMenuItem>
                              {canUpdate && (
                                <>
                                  <DropdownMenuSeparator />
                                  {Object.entries(statusLabels).filter(([k]) => k !== wo.status).slice(0, 4).map(([k, v]) => (
                                    <DropdownMenuItem key={k} onClick={() => statusMutation.mutate({ id: wo.id, status: k })}>
                                      <div className={`h-2 w-2 rounded-full mr-2 ${statusDot[k] || 'bg-muted'}`} />
                                      {v}
                                    </DropdownMenuItem>
                                  ))}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
            <span className="text-[11px] text-muted-foreground hidden sm:inline">Mostrando</span>
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 w-[70px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(s => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              de {totalCount} resultado{totalCount !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(1)}>
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-3 tabular-nums">
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

      {/* Floating bulk action bar (like image 2) */}
      {selectedIds.size > 0 && canUpdate && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 bg-foreground text-background px-5 py-3 rounded-xl shadow-2xl">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="h-7 w-7 flex items-center justify-center rounded-full bg-background/10 hover:bg-background/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <span className="text-sm font-semibold tabular-nums">
              {selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}
            </span>

            <div className="h-5 w-px bg-background/20" />

            {canAssign && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/10 hover:bg-background/20 text-sm transition-colors">
                    <UserCheck className="h-3.5 w-3.5" /> Atribuir
                  </button>
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
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/10 hover:bg-background/20 text-sm transition-colors">
                  <Pencil className="h-3.5 w-3.5" /> Status
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <DropdownMenuItem key={k} onClick={() => bulkStatusMutation.mutate({ ids: [...selectedIds], status: k })}>
                    <div className={`h-2 w-2 rounded-full mr-2 ${statusDot[k] || 'bg-muted'}`} />
                    {v}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={() => setShowPrintGuide(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/10 hover:bg-background/20 text-sm transition-colors"
            >
              <Printer className="h-3.5 w-3.5" /> Guia
            </button>
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
        workOrders={selectedIds.size > 0 ? filtered.filter((wo: any) => selectedIds.has(wo.id)) : filtered.filter((wo: any) => !CLOSED_STATUSES.includes(wo.status))}
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
