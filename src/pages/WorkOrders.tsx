import { useState, useMemo } from 'react';
import { useTenantQuery } from '@/hooks/useTenantQuery';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/permissions';
import { Search, Plus, X, Filter, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Ordens de Serviço</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} registro(s)</p>
        </div>
        <Button size="sm" onClick={() => navigate('/os/nova')} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Nova OS
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-2 bg-card border border-border rounded-md p-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou título..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
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
          <SelectTrigger className="w-[160px] h-8 text-xs">
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
        <div className="flex gap-1.5 flex-wrap">
          {activeFilters.map(f => (
            <Badge key={f.key} variant="secondary" className="gap-1 cursor-pointer text-xs h-6" onClick={f.clear}>
              {f.label}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-md py-16 text-center text-muted-foreground">
          <Filter className="mx-auto h-8 w-8 mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhuma OS encontrada</p>
          <p className="text-xs mt-1">Ajuste os filtros ou crie uma nova OS.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[120px]">Código</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Título</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[100px]">Prioridade</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[120px]">Status</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[120px]">SLA</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[100px]">Criada em</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((wo: any) => (
                <TableRow
                  key={wo.id}
                  className="cursor-pointer group"
                  onClick={() => navigate(`/os/${wo.id}`)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">{wo.code}</TableCell>
                  <TableCell className="text-sm font-medium max-w-[300px] truncate">{wo.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[11px] ${priorityColors[wo.priority]}`}>
                      {priorityLabels[wo.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[11px] ${statusColors[wo.status]}`}>
                      {statusLabels[wo.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <SlaIndicator workOrder={wo} compact />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(wo.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
