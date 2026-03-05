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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { statusLabels, statusColors, priorityLabels, priorityColors, hasPermission } from '@/lib/permissions';
import { Search, Plus, X, Filter, ChevronRight, ChevronDown, ChevronUp, ChevronLeft, MoreHorizontal, ArrowUpDown, CalendarDays, AlertTriangle, Eye, UserCheck, Download, Play, Clock, ClipboardList, Building2, Printer, MapPin, Hash, User2, CalendarClock, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { SlaIndicator } from '@/components/SlaIndicator';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTenantQuery } from '@/hooks/useTenantQuery';
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
  { id: 'criticas', label: 'Críticas Atrasadas', icon: AlertTriangle, filters: { priority: 'critica', sla: 'overdue' } },
  { id: 'aguardando_peca', label: 'Aguard. Peça', icon: Clock, filters: { status: 'aguardando_peca' } },
  { id: 'em_execucao', label: 'Em Execução', icon: Play, filters: { status: 'em_execucao' } },
  { id: 'abertas', label: 'Abertas', icon: ClipboardList, filters: { status: 'aberta' } },
];

export default function WorkOrders() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { currentTenantId, currentRole, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { tenantName, primaryColor } = useTenantBranding();

  // Saved view
  const [activeView, setActiveView] = useState<string | null>(null);

  // Filters
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

  const applyView = (view: SavedView) => {
    if (activeView === view.id) {
      // Deselect view = clear all
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

  // Sorting
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Data — fetch work orders from ALL tenants
  const { memberships } = useAuth();
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

  // Filter + Sort + Paginate
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

    // Sort
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

  // Reset page on filter change
  const resetPage = () => setPage(1);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    resetPage();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map((wo: any) => wo.id)));
    }
  };

  // Inline status change
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

  // Active filters
  const activeFilters = [
    deptFilter !== 'all' && { key: 'dept', label: `Depto: ${tenantMap[deptFilter] || ''}`, clear: () => { setDeptFilter('all'); resetPage(); } },
    statusFilter !== 'all' && { key: 'status', label: `Status: ${statusLabels[statusFilter]}`, clear: () => { setStatusFilter('all'); resetPage(); } },
    priorityFilter !== 'all' && { key: 'priority', label: `Prioridade: ${priorityLabels[priorityFilter]}`, clear: () => { setPriorityFilter('all'); resetPage(); } },
    categoryFilter !== 'all' && { key: 'category', label: `Categoria: ${categories.find((c: any) => c.id === categoryFilter)?.name || ''}`, clear: () => { setCategoryFilter('all'); resetPage(); } },
    unitFilter !== 'all' && { key: 'unit', label: `Unidade: ${units.find((u: any) => u.id === unitFilter)?.name || ''}`, clear: () => { setUnitFilter('all'); resetPage(); } },
    slaFilter !== 'all' && { key: 'sla', label: 'Somente atrasadas', clear: () => { setSlaFilter('all'); resetPage(); } },
    visibilityFilter !== 'all' && { key: 'visibility', label: `Vis: ${visibilityFilter === 'internal' ? 'Interna' : 'Cliente'}`, clear: () => { setVisibilityFilter('all'); resetPage(); } },
    assignedFilter !== 'all' && { key: 'assigned', label: assignedFilter === 'me' ? 'Minhas OS' : assignedFilter === 'unassigned' ? 'Sem responsável' : 'Responsável filtrado', clear: () => { setAssignedFilter('all'); resetPage(); } },
    dateFrom && { key: 'dateFrom', label: `De: ${format(dateFrom, 'dd/MM/yy')}`, clear: () => { setDateFrom(undefined); resetPage(); } },
    dateTo && { key: 'dateTo', label: `Até: ${format(dateTo, 'dd/MM/yy')}`, clear: () => { setDateTo(undefined); resetPage(); } },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const getAssignedProfile = (id: string | null) => {
    if (!id) return null;
    return profiles.find((p: any) => p.id === id) || null;
  };

  const getAssignedName = (id: string | null) => {
    if (!id) return '—';
    const p = profiles.find((p: any) => p.id === id);
    return p?.name || id.slice(0, 8);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  };

  const getRequesterName = (wo: any) => {
    if (wo.requester_id) {
      const c = customers.find((c: any) => c.id === wo.requester_id);
      return c?.name || '—';
    }
    if (wo.requester_user_id) {
      const p = profiles.find((p: any) => p.id === wo.requester_user_id);
      return p?.name || '—';
    }
    return '—';
  };

  const clearAllFilters = () => {
    setStatusFilter('all'); setPriorityFilter('all'); setCategoryFilter('all');
    setUnitFilter('all'); setAssignedFilter('all'); setSlaFilter('all');
    setVisibilityFilter('all'); setDeptFilter('all'); setDateFrom(undefined); setDateTo(undefined);
    setSearch(''); setActiveView(null); resetPage();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Gerenciamento de Ordens de Serviço</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Módulo de Gestão de Chamados ({totalCount} registros)
            {selectedIds.size > 0 && ` • ${selectedIds.size} selecionada(s)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs hidden sm:flex" onClick={() => setShowPrintGuide(true)}>
            <Printer className="h-3.5 w-3.5" />
            Guia
          </Button>
          <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs hidden sm:flex" onClick={() => setShowExportDialog(true)}>
            <Download className="h-3.5 w-3.5" />
            Excel
          </Button>
          {canCreate && (
            <Button size="sm" onClick={() => navigate('/os/nova')} className="h-9 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nova OS</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search + Filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, título ou solicitante..."
            value={search}
            onChange={e => { setSearch(e.target.value); resetPage(); }}
            className="pl-9 h-10 text-sm border-transparent shadow-[0_1px_3px_0_hsl(var(--foreground)/0.04)] bg-card"
          />
        </div>
        <Button
          variant={showAdvancedFilters ? "default" : "outline"}
          size="sm"
          className="h-9 gap-1.5 text-xs shrink-0 border-transparent shadow-[0_1px_3px_0_hsl(var(--foreground)/0.04)]"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          <Filter className="h-3.5 w-3.5" />
          Filtros
          {activeFilters.length > 0 && (
            <span className="h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
              {activeFilters.length}
            </span>
          )}
        </Button>
      </div>

      {/* Saved Views - compact pills */}
      <div className="flex gap-1.5 flex-wrap">
        {SAVED_VIEWS.map(view => (
          <button
            key={view.id}
            onClick={() => applyView(view)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeView === view.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            }`}
          >
            <view.icon className="h-3 w-3" />
            {view.label}
          </button>
        ))}
      </div>

      {/* Collapsible Filters Panel */}
      {showAdvancedFilters && (
        <div className="bg-card rounded-xl shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtros</span>
            {activeFilters.length > 0 && (
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground" onClick={clearAllFilters}>
                Limpar todos
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {memberships.length > 1 && (
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Departamento</label>
                <Select value={deptFilter} onValueChange={v => { setDeptFilter(v); resetPage(); }}>
                  <SelectTrigger className="h-8 text-xs border-transparent bg-muted/40">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {memberships.map(m => (
                      <SelectItem key={m.tenant_id} value={m.tenant_id}>{m.tenant_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Status</label>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); resetPage(); }}>
                <SelectTrigger className="h-8 text-xs border-transparent bg-muted/40">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Prioridade</label>
              <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v); resetPage(); }}>
                <SelectTrigger className="h-8 text-xs border-transparent bg-muted/40">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(priorityLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Responsável</label>
              <Select value={assignedFilter} onValueChange={v => { setAssignedFilter(v); resetPage(); }}>
                <SelectTrigger className="h-8 text-xs border-transparent bg-muted/40">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
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
                <SelectTrigger className="h-8 text-xs border-transparent bg-muted/40">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Unidade</label>
              <Select value={unitFilter} onValueChange={v => { setUnitFilter(v); resetPage(); }}>
                <SelectTrigger className="h-8 text-xs border-transparent bg-muted/40">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {units.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Visibilidade</label>
              <Select value={visibilityFilter} onValueChange={v => { setVisibilityFilter(v); resetPage(); }}>
                <SelectTrigger className="h-8 text-xs border-transparent bg-muted/40">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="internal">Interna</SelectItem>
                  <SelectItem value="customer">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">SLA</label>
              <Select value={slaFilter} onValueChange={v => { setSlaFilter(v); resetPage(); }}>
                <SelectTrigger className="h-8 text-xs border-transparent bg-muted/40">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="overdue">Atrasadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Data de</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1 w-full justify-start border-transparent bg-muted/40 font-normal">
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
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1 w-full justify-start border-transparent bg-muted/40 font-normal">
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
        <div className="flex gap-1.5 flex-wrap">
          {activeFilters.map(f => (
            <Badge key={f.key} variant="secondary" className="gap-1 cursor-pointer text-xs h-6 bg-muted/60 hover:bg-muted" onClick={f.clear}>
              {f.label}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          <button className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1" onClick={clearAllFilters}>
            Limpar
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && canUpdate && (
        <div className="bg-primary/5 rounded-xl p-3 flex items-center gap-2 flex-wrap shadow-sm">
          <span className="text-xs font-medium">{selectedIds.size} selecionada(s)</span>
          <div className="flex gap-1.5 ml-auto">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowPrintGuide(true)}>
              <Printer className="h-3 w-3" /> Imprimir Guia
            </Button>
            {canAssign && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <UserCheck className="h-3 w-3" /> Atribuir
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => assignMutation.mutate({ ids: [...selectedIds], assignedToId: user?.id || null })}>
                    Para mim
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {profiles.slice(0, 15).map((p: any) => (
                    <DropdownMenuItem key={p.id} onClick={() => assignMutation.mutate({ ids: [...selectedIds], assignedToId: p.id })}>
                      {p.name}
                    </DropdownMenuItem>
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
                  <DropdownMenuItem key={k} onClick={() => bulkStatusMutation.mutate({ ids: [...selectedIds], status: k })}>
                    {v}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] py-16 text-center text-muted-foreground">
          <Filter className="mx-auto h-8 w-8 mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhuma OS encontrada</p>
          <p className="text-xs mt-1">Ajuste os filtros ou crie uma nova OS.</p>
        </div>
      ) : isMobile ? (
        /* Mobile: Card list */
        <div className="space-y-2">
          {paginatedData.map((wo: any) => (
            <div
              key={wo.id}
              className="bg-card rounded-xl shadow-[0_1px_3px_0_hsl(var(--foreground)/0.04)] p-3.5 cursor-pointer active:bg-muted/50 transition-colors"
              onClick={() => navigate(`/os/${wo.id}`)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono text-muted-foreground">{wo.code}</span>
                    {memberships.length > 1 && (
                      <span className="text-[10px] text-muted-foreground">{tenantMap[wo.tenant_id] || ''}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate mt-0.5">{wo.title}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1" />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className={`text-[10px] h-5 ${priorityColors[wo.priority]}`}>
                  {priorityLabels[wo.priority]}
                </Badge>
                <Badge variant="outline" className={`text-[10px] h-5 ${statusColors[wo.status]}`}>
                  {statusLabels[wo.status]}
                </Badge>
                <SlaIndicator workOrder={wo} compact />
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(wo.updated_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop: Table */
        <TooltipProvider delayDuration={200}>
          <div className="rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/30 hover:bg-transparent">
                    <TableHead className="px-4 h-11">
                      <button className="inline-flex items-center text-[11px] font-semibold uppercase text-muted-foreground select-none tracking-wider gap-1" onClick={() => handleSort('code')}>
                        Código <SortIcon field="code" />
                      </button>
                    </TableHead>
                    <TableHead className="px-4 h-11 min-w-[200px]">
                      <button className="inline-flex items-center text-[11px] font-semibold uppercase text-muted-foreground select-none tracking-wider gap-1" onClick={() => handleSort('title')}>
                        Título <SortIcon field="title" />
                      </button>
                    </TableHead>
                    <TableHead className="px-4 h-11 whitespace-nowrap hidden md:table-cell">
                      <button className="inline-flex items-center text-[11px] font-semibold uppercase text-muted-foreground select-none tracking-wider gap-1" onClick={() => handleSort('priority')}>
                        Prioridade / Status <SortIcon field="priority" />
                      </button>
                    </TableHead>
                    <TableHead className="px-4 h-11 whitespace-nowrap hidden lg:table-cell">
                      <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Depto</span>
                    </TableHead>
                    <TableHead className="px-4 h-11 whitespace-nowrap hidden lg:table-cell">
                      <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Responsável</span>
                    </TableHead>
                    <TableHead className="px-4 h-11 whitespace-nowrap hidden xl:table-cell">
                      <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Solicitante</span>
                    </TableHead>
                    <TableHead className="px-4 h-11 whitespace-nowrap hidden md:table-cell">
                      <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">SLA</span>
                    </TableHead>
                    <TableHead className="px-4 h-11 text-right whitespace-nowrap hidden sm:table-cell">
                      <button className="inline-flex items-center text-[11px] font-semibold uppercase text-muted-foreground select-none ml-auto tracking-wider gap-1" onClick={() => handleSort('updated_at')}>
                        Atualizada <SortIcon field="updated_at" />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((wo: any) => {
                    const sla = calculateSlaStatus(wo);
                    const isOverdue = sla.responseOverdue || sla.resolveOverdue;
                    const assignedProfile = getAssignedProfile(wo.assigned_to_id);

                    return (
                      <TableRow
                        key={wo.id}
                        className={`cursor-pointer group transition-colors border-b border-border/20 ${
                          isOverdue ? 'hover:bg-destructive/[0.04]' : 'hover:bg-muted/30'
                        }`}
                        onClick={() => navigate(`/os/${wo.id}`)}
                      >
                        {/* Code */}
                        <TableCell className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-[13px] text-muted-foreground">{wo.code}</span>
                        </TableCell>

                        {/* Title */}
                        <TableCell className="px-4 py-3.5 max-w-[320px]">
                          <p className="text-sm font-medium truncate leading-tight">{wo.title}</p>
                          <div className="flex items-center gap-1.5 mt-1 md:hidden flex-wrap">
                            <Badge variant="outline" className={`text-[10px] h-5 ${priorityColors[wo.priority]}`}>
                              {priorityLabels[wo.priority]}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] h-5 ${statusColors[wo.status]}`}>
                              {statusLabels[wo.status]}
                            </Badge>
                            <SlaIndicator workOrder={wo} compact />
                          </div>
                        </TableCell>

                        {/* Priority + Status combined */}
                        <TableCell className="px-4 py-3.5 whitespace-nowrap hidden md:table-cell">
                          <div className="inline-flex items-center gap-1.5">
                            <Badge variant="outline" className={`text-[10px] h-5 font-semibold ${priorityColors[wo.priority]}`}>
                              {priorityLabels[wo.priority]}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] h-5 ${statusColors[wo.status]}`}>
                              {statusLabels[wo.status]}
                            </Badge>
                          </div>
                        </TableCell>

                        {/* Depto */}
                        <TableCell className="px-4 py-3.5 whitespace-nowrap hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">{tenantMap[wo.tenant_id] || '—'}</span>
                        </TableCell>

                        {/* Responsável with avatar */}
                        <TableCell className="px-4 py-3.5 whitespace-nowrap hidden lg:table-cell">
                          {assignedProfile ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={assignedProfile.avatar_url || undefined} alt={assignedProfile.name} />
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                                  {getInitials(assignedProfile.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium max-w-[100px] truncate">{assignedProfile.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </TableCell>

                        {/* Solicitante */}
                        <TableCell className="px-4 py-3.5 whitespace-nowrap hidden xl:table-cell">
                          <span className="text-xs text-muted-foreground max-w-[120px] truncate block">{getRequesterName(wo)}</span>
                        </TableCell>

                        {/* SLA */}
                        <TableCell className="px-4 py-3.5 whitespace-nowrap hidden md:table-cell">
                          <SlaIndicator workOrder={wo} compact />
                        </TableCell>

                        {/* Date */}
                        <TableCell className="px-4 py-3.5 whitespace-nowrap text-right hidden sm:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {new Date(wo.updated_at).toLocaleDateString('pt-BR')}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </TooltipProvider>
      )}

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(1)}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) pageNum = i + 1;
            else if (page <= 3) pageNum = i + 1;
            else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
            else pageNum = page - 2 + i;
            return (
              <Button
                key={pageNum}
                variant={page === pageNum ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8 text-xs"
                onClick={() => setPage(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Export Dialog */}
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

      {/* Print Guide */}
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
