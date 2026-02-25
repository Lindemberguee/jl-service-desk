import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollText, Download, Search, Filter, Calendar, Shield, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const actionLabels: Record<string, string> = {
  'user.created': 'Usuário criado', 'user.password_changed': 'Senha alterada',
  'user.deactivated': 'Conta desativada', 'user.reactivated': 'Conta reativada',
  'work_order.created': 'OS criada', 'work_order.status_changed': 'Status OS alterado',
  'work_order.assigned': 'OS atribuída', 'work_order.comment': 'Comentário na OS',
  'work_order.deleted': 'OS excluída',
  'membership.created': 'Acesso adicionado', 'membership.updated': 'Acesso atualizado', 'membership.deleted': 'Acesso removido',
};

const entityLabels: Record<string, string> = {
  user: 'Usuário', work_order: 'Ordem de Serviço', membership: 'Acesso', asset: 'Ativo', stock: 'Estoque',
};

const entityIcons: Record<string, any> = {
  user: User, work_order: Clock, membership: Shield, asset: ScrollText, stock: ScrollText,
};

export default function AdminAuditLogs() {
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterTenant, setFilterTenant] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const { data: tenants = [] } = useQuery({
    queryKey: ['admin_tenants_audit'],
    queryFn: async () => { const { data, error } = await supabase.from('tenants').select('id, name').order('name'); if (error) throw error; return data; },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin_profiles_audit'],
    queryFn: async () => { const { data, error } = await supabase.from('profiles').select('id, name, email'); if (error) throw error; return data; },
  });

  const { data: rawLogs = [], isLoading } = useQuery({
    queryKey: ['admin_audit_logs_global'],
    queryFn: async () => {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500);
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
    const a = document.createElement('a'); a.href = url;
    a.download = `auditoria_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Auditoria Global</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{filteredLogs.length} registros encontrados</p>
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-lg" onClick={exportCSV} disabled={filteredLogs.length === 0}>
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border shadow-none rounded-xl">
        <CardContent className="p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm rounded-lg" />
            </div>
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger className="h-9 text-xs rounded-lg"><Filter className="h-3 w-3 mr-1.5" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas entidades</SelectItem>
                {Object.entries(entityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTenant} onValueChange={setFilterTenant}>
              <SelectTrigger className="h-9 text-xs rounded-lg"><Filter className="h-3 w-3 mr-1.5" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos departamentos</SelectItem>
                {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="pl-8 h-9 text-xs rounded-lg" />
            </div>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="pl-8 h-9 text-xs rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log List */}
      <Card className="border-border shadow-none rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-16 text-center">
              <ScrollText className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
              <p className="text-sm text-muted-foreground font-medium">Nenhum log encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredLogs.map(log => {
                const EntityIcon = entityIcons[log.entity] || ScrollText;
                return (
                  <div key={log.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <EntityIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-5 font-medium">{actionLabels[log.action] || log.action}</Badge>
                        <Badge variant="secondary" className="text-[10px] h-5">{entityLabels[log.entity] || log.entity}</Badge>
                        {log.tenant_id && <span className="text-[11px] text-muted-foreground">{getTenantName(log.tenant_id)}</span>}
                      </div>
                      <p className="text-xs mt-1">
                        <span className="text-muted-foreground">por </span>
                        <span className="font-medium">{getActorName(log.actor_user_id)}</span>
                      </p>
                      {log.diff && Object.keys(log.diff).length > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-xl">
                          {Object.entries(log.diff as Record<string, unknown>).filter(([k]) => k !== 'changed_by').map(([k, v]) => `${k}: ${v}`).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-muted-foreground">{format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                      {log.ip && <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{log.ip}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
