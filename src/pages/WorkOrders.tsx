import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { statusLabels, statusColors, priorityLabels, priorityColors, hasPermission } from '@/lib/permissions';
import { Search, Plus, X, Filter, ChevronRight, ChevronDown, ChevronUp, MoreHorizontal, ArrowUpDown, CalendarDays, AlertTriangle, Eye, UserCheck, Download, Play, Clock, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { SlaIndicator } from '@/components/SlaIndicator';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTenantQuery } from '@/hooks/useTenantQuery';
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
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
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

  // Data
  const { data: workOrders = [], isLoading } = useTenantQuery<any>('work_orders', 'work_orders');
  const { data: categories = [] } = useTenantQuery<any>('categories', 'categories');
  const { data: units = [] } = useTenantQuery<any>('units', 'units');
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles_list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, name, email');
      return data || [];
    },
  });
  const { data: customers = [] } = useTenantQuery<any>('customers', 'customers');

  const canUpdate = currentRole && hasPermission(currentRole, 'os:update');
  const canAssign = currentRole && hasPermission(currentRole, 'os:assign');

  // Filter + Sort + Paginate
  const filtered = useMemo(() => {
    let result = workOrders.filter((wo: any) => wo.deleted_at === null || wo.deleted_at === undefined).filter((wo: any) => {
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
        return wo.title?.toLowerCase().includes(s) || wo.code?.toLowerCase().includes(s);
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
  }, [workOrders, statusFilter, priorityFilter, categoryFilter, unitFilter, visibilityFilter, assignedFilter, slaFilter, dateFrom, dateTo, debouncedSearch, sortField, sortDir, user?.id]);

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
      setSelectedIds(new Set());
      toast({ title: 'Status atualizado em lote' });
    },
  });

  // Export CSV
  const exportCSV = () => {
    const headers = ['Código', 'Título', 'Prioridade', 'Status', 'Visibilidade', 'Criada em', 'Atualizada em'];
    const rows = filtered.map((wo: any) => [
      wo.code, `"${wo.title}"`, priorityLabels[wo.priority], statusLabels[wo.status],
      wo.visibility === 'internal' ? 'Interna' : 'Cliente',
      new Date(wo.created_at).toLocaleDateString('pt-BR'),
      new Date(wo.updated_at).toLocaleDateString('pt-BR'),
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ordens-servico-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Active filters
  const activeFilters = [
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

  const getAssignedName = (id: string | null) => {
    if (!id) return '—';
    const p = profiles.find((p: any) => p.id === id);
    return p?.name || id.slice(0, 8);
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

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Ordens de Serviço</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalCount} de {workOrders.length} registro(s)
            {selectedIds.size > 0 && ` • ${selectedIds.size} selecionada(s)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs hidden sm:flex" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button size="sm" onClick={() => navigate('/os/nova')} className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Nova OS</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      {/* Saved Views */}
      <div className="flex gap-1.5 flex-wrap">
        {SAVED_VIEWS.map(view => (
          <Button
            key={view.id}
            variant={activeView === view.id ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => applyView(view)}
          >
            <view.icon className="h-3 w-3" />
            {view.label}
          </Button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-card border border-border rounded-md p-3 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou título..."
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage(); }}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Button
            variant={showAdvancedFilters ? "secondary" : "outline"}
            size="sm"
            className="h-8 gap-1 text-xs shrink-0"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {activeFilters.length > 0 && (
              <Badge variant="default" className="h-4 w-4 p-0 text-[9px] rounded-full flex items-center justify-center ml-0.5">
                {activeFilters.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Basic filters - always visible */}
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); resetPage(); }}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v); resetPage(); }}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Prioridades</SelectItem>
              {Object.entries(priorityLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assignedFilter} onValueChange={v => { setAssignedFilter(v); resetPage(); }}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="me">Minhas OS</SelectItem>
              <SelectItem value="unassigned">Sem responsável</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Advanced filters */}
        {showAdvancedFilters && (
          <div className="flex gap-2 flex-wrap pt-1 border-t border-border mt-2">
            <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); resetPage(); }}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={unitFilter} onValueChange={v => { setUnitFilter(v); resetPage(); }}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Unidades</SelectItem>
                {units.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={visibilityFilter} onValueChange={v => { setVisibilityFilter(v); resetPage(); }}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Visibilidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="internal">Interna</SelectItem>
                <SelectItem value="customer">Cliente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={slaFilter} onValueChange={v => { setSlaFilter(v); resetPage(); }}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="SLA" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos SLA</SelectItem>
                <SelectItem value="overdue">Somente Atrasadas</SelectItem>
              </SelectContent>
            </Select>

            {/* Date range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {dateFrom ? format(dateFrom, 'dd/MM') : 'De'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={d => { setDateFrom(d); resetPage(); }} locale={ptBR} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {dateTo ? format(dateTo, 'dd/MM') : 'Até'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={d => { setDateTo(d); resetPage(); }} locale={ptBR} />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {activeFilters.map(f => (
            <Badge key={f.key} variant="secondary" className="gap-1 cursor-pointer text-xs h-6" onClick={f.clear}>
              {f.label}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => {
            setStatusFilter('all'); setPriorityFilter('all'); setCategoryFilter('all');
            setUnitFilter('all'); setAssignedFilter('all'); setSlaFilter('all');
            setVisibilityFilter('all'); setDateFrom(undefined); setDateTo(undefined);
            setSearch(''); resetPage();
          }}>
            Limpar todos
          </Button>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && canUpdate && (
        <div className="bg-primary/5 border border-primary/20 rounded-md p-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium">{selectedIds.size} selecionada(s)</span>
          <div className="flex gap-1.5 ml-auto">
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
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-md py-16 text-center text-muted-foreground">
          <Filter className="mx-auto h-8 w-8 mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhuma OS encontrada</p>
          <p className="text-xs mt-1">Ajuste os filtros ou crie uma nova OS.</p>
        </div>
      ) : isMobile ? (
        /* Mobile: Card list */
        <div className="space-y-2">
          {paginatedData.map((wo: any) => (
            <div
              key={wo.id}
              className="bg-card border border-border rounded-md p-3 cursor-pointer active:bg-muted/50 transition-colors"
              onClick={() => navigate(`/os/${wo.id}`)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-muted-foreground">{wo.code}</span>
                    {wo.visibility === 'customer' && (
                      <Badge variant="outline" className="text-[9px] h-4 bg-info/10 text-info border-info/20">Cliente</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate mt-0.5">{wo.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Solicitante: {getRequesterName(wo)}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className={`text-[10px] h-5 ${priorityColors[wo.priority]}`}>
                  {priorityLabels[wo.priority]}
                </Badge>
                <Badge variant="outline" className={`text-[10px] h-5 ${statusColors[wo.status]}`}>
                  {statusLabels[wo.status]}
                </Badge>
                <SlaIndicator workOrder={wo} compact />
                {wo.visibility === 'customer' && (
                  <Badge variant="outline" className="text-[10px] h-5 bg-info/10 text-info border-info/20">Cliente</Badge>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(wo.updated_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop: Table */
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {canUpdate && (
                  <TableHead className="w-10 px-3">
                    <Checkbox checked={selectedIds.size === paginatedData.length && paginatedData.length > 0} onCheckedChange={toggleAll} />
                  </TableHead>
                )}
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[100px] cursor-pointer select-none" onClick={() => handleSort('code')}>
                  <span className="flex items-center">Código <SortIcon field="code" /></span>
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground cursor-pointer select-none" onClick={() => handleSort('title')}>
                  <span className="flex items-center">Título <SortIcon field="title" /></span>
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[90px] cursor-pointer select-none" onClick={() => handleSort('priority')}>
                  <span className="flex items-center">Prioridade <SortIcon field="priority" /></span>
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[110px] cursor-pointer select-none" onClick={() => handleSort('status')}>
                  <span className="flex items-center">Status <SortIcon field="status" /></span>
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[100px]">Responsável</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[100px]">Solicitante</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[120px]">SLA</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[95px] cursor-pointer select-none" onClick={() => handleSort('updated_at')}>
                  <span className="flex items-center">Atualizada <SortIcon field="updated_at" /></span>
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((wo: any) => (
                <TableRow key={wo.id} className="cursor-pointer group">
                  {canUpdate && (
                    <TableCell className="px-3" onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.has(wo.id)} onCheckedChange={() => toggleSelect(wo.id)} />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-xs text-muted-foreground" onClick={() => navigate(`/os/${wo.id}`)}>{wo.code}</TableCell>
                  <TableCell className="text-sm font-medium max-w-[300px] truncate" onClick={() => navigate(`/os/${wo.id}`)}>{wo.title}</TableCell>
                  <TableCell onClick={() => navigate(`/os/${wo.id}`)}>
                    <Badge variant="outline" className={`text-[11px] ${priorityColors[wo.priority]}`}>
                      {priorityLabels[wo.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => navigate(`/os/${wo.id}`)}>
                    <Badge variant="outline" className={`text-[11px] ${statusColors[wo.status]}`}>
                      {statusLabels[wo.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs" onClick={e => e.stopPropagation()}>
                    {canAssign ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors hover:bg-accent max-w-[120px] truncate ${wo.assigned_to_id ? 'text-foreground font-medium' : 'text-muted-foreground italic'}`}>
                            <UserCheck className="h-3 w-3 shrink-0" />
                            <span className="truncate">{getAssignedName(wo.assigned_to_id)}</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-52 max-h-64 overflow-y-auto">
                          <DropdownMenuItem onClick={() => assignMutation.mutate({ ids: [wo.id], assignedToId: user?.id || null })}>
                            <UserCheck className="h-3.5 w-3.5 mr-2 text-primary" /> Para mim
                          </DropdownMenuItem>
                          {wo.assigned_to_id && (
                            <DropdownMenuItem onClick={() => assignMutation.mutate({ ids: [wo.id], assignedToId: null })}>
                              <X className="h-3.5 w-3.5 mr-2 text-destructive" /> Remover atribuição
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {profiles.filter((p: any) => p.id !== user?.id && p.id !== wo.assigned_to_id).map((p: any) => (
                            <DropdownMenuItem key={p.id} onClick={() => assignMutation.mutate({ ids: [wo.id], assignedToId: p.id })}>
                              {p.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-muted-foreground truncate max-w-[100px] block" onClick={() => navigate(`/os/${wo.id}`)}>
                        {getAssignedName(wo.assigned_to_id)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[100px]" onClick={() => navigate(`/os/${wo.id}`)}>
                    {getRequesterName(wo)}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/os/${wo.id}`)}>
                    <SlaIndicator workOrder={wo} compact />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground" onClick={() => navigate(`/os/${wo.id}`)}>
                    {new Date(wo.updated_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    {canUpdate && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => navigate(`/os/${wo.id}`)}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {canAssign && (
                            <>
                              <DropdownMenuItem onClick={() => assignMutation.mutate({ ids: [wo.id], assignedToId: user?.id || null })}>
                                <UserCheck className="h-3.5 w-3.5 mr-2" /> Atribuir para mim
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {Object.entries(statusLabels).filter(([k]) => k !== wo.status).slice(0, 4).map(([k, v]) => (
                            <DropdownMenuItem key={k} onClick={() => statusMutation.mutate({ id: wo.id, status: k })}>
                              → {v}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Exibindo {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} de {totalCount}</span>
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-7 w-[70px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(s => (
                  <SelectItem key={s} value={String(s)}>{s} / pág</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              ‹
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;
              return (
                <Button key={pageNum} variant={page === pageNum ? "default" : "outline"} size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setPage(pageNum)}>
                  {pageNum}
                </Button>
              );
            })}
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              ›
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
