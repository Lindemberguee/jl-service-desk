import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollText, Download, Search, Filter, Calendar, Globe, Monitor, ChevronRight, Activity, LogIn, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  actionLabels, actionColors, entityLabels, entityIcons, actionIcons,
  parseUserAgent, type AuditLog,
} from '@/components/admin/audit/AuditConstants';
import AuditDetailDialog from '@/components/admin/audit/AuditDetailDialog';
import AuditActivityChart from '@/components/admin/audit/AuditActivityChart';

const PAGE_SIZE = 50;

export default function AdminAuditLogs() {
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterTenant, setFilterTenant] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(0);

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

  // Paginated query
  const { data: paginatedResult, isLoading } = useQuery({
    queryKey: ['admin_audit_logs_paginated', page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await (supabase.from('audit_logs') as any)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { data: data as AuditLog[], total: count as number };
    },
  });

  // All logs for chart (lighter query, just last 14 days)
  const { data: chartLogs = [] } = useQuery({
    queryKey: ['admin_audit_logs_chart'],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 14);
      const { data, error } = await (supabase.from('audit_logs') as any)
        .select('id, created_at, entity, action')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const rawLogs = paginatedResult?.data || [];
  const totalCount = paginatedResult?.total || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getActorName = useCallback((actorId: string | null) => {
    if (!actorId) return 'Sistema';
    const p = profiles.find(p => p.id === actorId);
    return p?.name || p?.email || 'Desconhecido';
  }, [profiles]);

  const getActorEmail = useCallback((actorId: string | null) => {
    if (!actorId) return null;
    return profiles.find(p => p.id === actorId)?.email || null;
  }, [profiles]);

  const getTenantName = useCallback((tenantId: string | null) => {
    if (!tenantId) return 'Global';
    return tenants.find(t => t.id === tenantId)?.name || '—';
  }, [tenants]);

  const filteredLogs = useMemo(() => {
    return rawLogs.filter(log => {
      if (activeTab === 'auth' && log.entity !== 'auth') return false;
      if (activeTab === 'operations' && log.entity === 'auth') return false;
      if (activeTab === 'security' && !['auth.login', 'auth.logout', 'auth.password_recovery', 'auth.password_reset', 'user.password_changed', 'user.deactivated', 'user.reactivated'].includes(log.action)) return false;
      if (activeTab === 'global' && log.tenant_id !== null) return false;
      if (filterEntity !== 'all' && log.entity !== filterEntity) return false;
      if (filterTenant !== 'all' && log.tenant_id !== filterTenant) return false;
      if (search) {
        const actorName = getActorName(log.actor_user_id).toLowerCase();
        const actorEmail = (getActorEmail(log.actor_user_id) || '').toLowerCase();
        const actionLabel = (actionLabels[log.action] || log.action).toLowerCase();
        const ipAddr = (log.ip || '').toLowerCase();
        const q = search.toLowerCase();
        if (!actorName.includes(q) && !actionLabel.includes(q) && !actorEmail.includes(q) && !ipAddr.includes(q)) return false;
      }
      if (filterDateFrom && log.created_at < filterDateFrom) return false;
      if (filterDateTo && log.created_at > filterDateTo + 'T23:59:59') return false;
      return true;
    });
  }, [rawLogs, filterEntity, filterTenant, search, filterDateFrom, filterDateTo, profiles, activeTab, getActorName, getActorEmail]);

  // Stats from chart logs (14 days)
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayLogs = chartLogs.filter(l => l.created_at.startsWith(today));
    const todayLogins = chartLogs.filter(l => l.action === 'auth.login' && l.created_at.startsWith(today));
    const uniqueIPs = new Set(rawLogs.filter(l => l.ip).map(l => l.ip)).size;
    return { total: totalCount, today: todayLogs.length, logins: todayLogins.length, uniqueIPs };
  }, [chartLogs, rawLogs, totalCount]);

  const exportCSV = () => {
    const headers = ['Data/Hora', 'Ação', 'Entidade', 'Usuário', 'Email', 'Departamento', 'IP', 'Navegador', 'SO', 'Dispositivo', 'Detalhes'];
    const rows = filteredLogs.map(log => {
      const ua = parseUserAgent(log.user_agent);
      return [
        format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss"),
        actionLabels[log.action] || log.action,
        entityLabels[log.entity] || log.entity,
        getActorName(log.actor_user_id),
        getActorEmail(log.actor_user_id) || '',
        getTenantName(log.tenant_id),
        log.ip || '',
        ua.browser, ua.os, ua.device,
        log.diff ? JSON.stringify(log.diff) : '',
      ];
    });
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
          <p className="text-xs text-muted-foreground mt-0.5">Monitoramento de segurança e atividades do sistema</p>
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-lg" onClick={exportCSV} disabled={filteredLogs.length === 0}>
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total de registros', value: stats.total, icon: ScrollText, color: 'text-primary' },
          { label: 'Eventos hoje', value: stats.today, icon: Activity, color: 'text-blue-500' },
          { label: 'Logins hoje', value: stats.logins, icon: LogIn, color: 'text-emerald-500' },
          { label: 'IPs únicos (página)', value: stats.uniqueIPs, icon: Globe, color: 'text-amber-500' },
        ].map((s, i) => (
          <Card key={i} className="border-border shadow-none rounded-xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Chart */}
      <AuditActivityChart logs={chartLogs} days={14} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(0); }}>
        <TabsList className="rounded-lg">
          <TabsTrigger value="all" className="text-xs rounded-md">Todos</TabsTrigger>
          <TabsTrigger value="auth" className="text-xs rounded-md">Autenticação</TabsTrigger>
          <TabsTrigger value="operations" className="text-xs rounded-md">Operações</TabsTrigger>
          <TabsTrigger value="security" className="text-xs rounded-md">Segurança</TabsTrigger>
          <TabsTrigger value="global" className="text-xs rounded-md">Global</TabsTrigger>
        </TabsList>

        <div className="mt-3">
          <Card className="border-border shadow-none rounded-xl">
            <CardContent className="p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Buscar por nome, email, IP..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm rounded-lg" />
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
                  <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="pl-8 h-9 text-xs rounded-lg" placeholder="Data início" />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="pl-8 h-9 text-xs rounded-lg" placeholder="Data fim" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {['all', 'auth', 'operations', 'security', 'global'].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-3">
            <Card className="border-border shadow-none rounded-xl overflow-hidden">
              <CardContent className="p-0">
                <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">
                    {filteredLogs.length} registro{filteredLogs.length !== 1 ? 's' : ''} nesta página · {totalCount} total
                  </p>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-xs text-muted-foreground px-2">{page + 1} / {totalPages}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
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
                      const ActionIcon = actionIcons[log.action] || entityIcons[log.entity] || ScrollText;
                      const ua = parseUserAgent(log.user_agent);
                      const colorClass = actionColors[log.action] || '';
                      const isGlobal = !log.tenant_id;
                      return (
                        <div
                          key={log.id}
                          className="px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors cursor-pointer group"
                          onClick={() => setSelectedLog(log)}
                        >
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colorClass || 'bg-muted'}`}>
                            <ActionIcon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className={`text-[10px] h-5 font-medium ${colorClass}`}>
                                {actionLabels[log.action] || log.action}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] h-5">{entityLabels[log.entity] || log.entity}</Badge>
                              {isGlobal ? (
                                <Badge variant="outline" className="text-[10px] h-5 bg-primary/5 text-primary border-primary/20">Global</Badge>
                              ) : log.tenant_id && (
                                <span className="text-[11px] text-muted-foreground">{getTenantName(log.tenant_id)}</span>
                              )}
                            </div>
                            <p className="text-xs mt-1">
                              <span className="text-muted-foreground">por </span>
                              <span className="font-medium">{getActorName(log.actor_user_id)}</span>
                              {getActorEmail(log.actor_user_id) && (
                                <span className="text-muted-foreground ml-1">({getActorEmail(log.actor_user_id)})</span>
                              )}
                            </p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {log.ip && (
                                <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                                  <Globe className="h-2.5 w-2.5" /> {log.ip}
                                </span>
                              )}
                              {log.user_agent && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Monitor className="h-2.5 w-2.5" /> {ua.browser} · {ua.os}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-2">
                            <p className="text-[11px] text-muted-foreground">{format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}</p>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Bottom pagination */}
                {totalPages > 1 && (
                  <div className="px-4 py-2 border-t border-border bg-muted/30 flex justify-center">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="h-3 w-3 mr-1" /> Anterior
                      </Button>
                      <span className="text-xs text-muted-foreground px-3">{page + 1} de {totalPages}</span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                        Próximo <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <AuditDetailDialog
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        getActorName={getActorName}
        getActorEmail={getActorEmail}
        getTenantName={getTenantName}
      />
    </div>
  );
}
