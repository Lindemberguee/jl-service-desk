import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollText, Download, Search, Filter, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const actionLabels: Record<string, string> = {
  'user.created': 'Usuário criado',
  'user.password_changed': 'Senha alterada',
  'user.deactivated': 'Conta desativada',
  'user.reactivated': 'Conta reativada',
  'work_order.created': 'OS criada',
  'work_order.status_changed': 'Status OS alterado',
  'work_order.assigned': 'OS atribuída',
  'work_order.comment': 'Comentário na OS',
  'membership.created': 'Acesso adicionado',
  'membership.updated': 'Acesso atualizado',
  'membership.deleted': 'Acesso removido',
};

const entityLabels: Record<string, string> = {
  user: 'Usuário',
  work_order: 'Ordem de Serviço',
  membership: 'Acesso',
  asset: 'Ativo',
  stock: 'Estoque',
};

export default function AdminAuditLogs() {
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterTenant, setFilterTenant] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const { data: tenants = [] } = useQuery({
    queryKey: ['admin_tenants_audit'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenants').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin_profiles_audit'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, name, email');
      if (error) throw error;
      return data;
    },
  });

  const { data: rawLogs = [], isLoading } = useQuery({
    queryKey: ['admin_audit_logs_global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const getActorName = (actorId: string | null) => {
    if (!actorId) return 'Sistema';
    const p = profiles.find(p => p.id === actorId);
    return p?.name || p?.email || 'Desconhecido';
  };

  const getTenantName = (tenantId: string | null) => {
    if (!tenantId) return '—';
    return tenants.find(t => t.id === tenantId)?.name || '—';
  };

  const filteredLogs = useMemo(() => {
    return rawLogs.filter(log => {
      if (filterEntity !== 'all' && log.entity !== filterEntity) return false;
      if (filterTenant !== 'all' && log.tenant_id !== filterTenant) return false;
      if (search) {
        const actorName = getActorName(log.actor_user_id).toLowerCase();
        const actionLabel = (actionLabels[log.action] || log.action).toLowerCase();
        if (!actorName.includes(search.toLowerCase()) && !actionLabel.includes(search.toLowerCase())) return false;
      }
      if (filterDateFrom && log.created_at < filterDateFrom) return false;
      if (filterDateTo && log.created_at > filterDateTo + 'T23:59:59') return false;
      return true;
    });
  }, [rawLogs, filterEntity, filterTenant, search, filterDateFrom, filterDateTo, profiles]);

  const exportCSV = () => {
    const headers = ['Data/Hora', 'Ação', 'Entidade', 'Usuário', 'Departamento', 'IP', 'Detalhes'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss"),
      actionLabels[log.action] || log.action,
      entityLabels[log.entity] || log.entity,
      getActorName(log.actor_user_id),
      getTenantName(log.tenant_id),
      log.ip || '',
      log.diff ? JSON.stringify(log.diff) : '',
    ]);
    
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auditoria Global</h1>
          <p className="text-sm text-muted-foreground">
            Logs estruturados de todas as operações do sistema
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={filteredLogs.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger>
            <Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas entidades</SelectItem>
            {Object.entries(entityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTenant} onValueChange={setFilterTenant}>
          <SelectTrigger>
            <Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos departamentos</SelectItem>
            {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="pl-9" placeholder="De" />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="pl-9" placeholder="Até" />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ScrollText className="h-4 w-4" />
        <span>{filteredLogs.length} registros encontrados</span>
      </div>

      {/* Log List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <ScrollText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum log encontrado para os filtros selecionados</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredLogs.map(log => (
                <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <ScrollText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs font-medium">
                        {actionLabels[log.action] || log.action}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {entityLabels[log.entity] || log.entity}
                      </Badge>
                      {log.tenant_id && (
                        <span className="text-xs text-muted-foreground">
                          {getTenantName(log.tenant_id)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-1">
                      <span className="text-muted-foreground">por </span>
                      <span className="font-medium">{getActorName(log.actor_user_id)}</span>
                    </p>
                    {log.diff && Object.keys(log.diff).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-xl">
                        {Object.entries(log.diff as Record<string, unknown>)
                          .filter(([k]) => k !== 'changed_by')
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM/yy", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "HH:mm:ss")}
                    </p>
                    {log.ip && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">{log.ip}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
