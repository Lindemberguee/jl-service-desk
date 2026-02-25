import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollText, Download, Search, Filter, Calendar, Shield, Clock, User, LogIn, LogOut, Globe, Monitor, ChevronRight, Activity, KeyRound, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const actionLabels: Record<string, string> = {
  'user.created': 'Usuário criado', 'user.password_changed': 'Senha alterada',
  'user.deactivated': 'Conta desativada', 'user.reactivated': 'Conta reativada',
  'work_order.created': 'OS criada', 'work_order.status_changed': 'Status OS alterado',
  'work_order.assigned': 'OS atribuída', 'work_order.comment': 'Comentário na OS',
  'work_order.deleted': 'OS excluída',
  'membership.created': 'Acesso adicionado', 'membership.updated': 'Acesso atualizado', 'membership.deleted': 'Acesso removido',
  'auth.login': 'Login realizado', 'auth.logout': 'Logout realizado', 'auth.signup': 'Cadastro realizado',
  'auth.token_refreshed': 'Sessão renovada', 'auth.password_recovery': 'Recuperação de senha',
  'auth.password_reset': 'Senha redefinida',
  'stock.created': 'Item criado', 'stock.updated': 'Item atualizado', 'stock.deleted': 'Item excluído',
  'stock.movement': 'Movimentação de estoque',
};

const actionColors: Record<string, string> = {
  'auth.login': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'auth.logout': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'auth.signup': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'auth.password_recovery': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'user.deactivated': 'bg-red-500/10 text-red-600 border-red-500/20',
  'user.reactivated': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'user.password_changed': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'work_order.deleted': 'bg-red-500/10 text-red-600 border-red-500/20',
};

const entityLabels: Record<string, string> = {
  user: 'Usuário', work_order: 'Ordem de Serviço', membership: 'Acesso',
  asset: 'Ativo', stock: 'Estoque', auth: 'Autenticação',
};

const entityIcons: Record<string, any> = {
  user: User, work_order: Clock, membership: Shield,
  asset: ScrollText, stock: ScrollText, auth: KeyRound,
};

const actionIcons: Record<string, any> = {
  'auth.login': LogIn, 'auth.logout': LogOut, 'auth.signup': User,
  'auth.password_recovery': AlertTriangle, 'auth.password_reset': KeyRound,
};

type AuditLog = {
  id: string; entity: string; entity_id: string | null; action: string;
  actor_user_id: string | null; tenant_id: string | null; ip: string | null;
  user_agent: string | null; diff: Record<string, unknown> | null; created_at: string;
};

function parseUserAgent(ua: string | null): { browser: string; os: string; device: string } {
  if (!ua) return { browser: '—', os: '—', device: '—' };
  let browser = 'Desconhecido', os = 'Desconhecido', device = 'Desktop';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  if (ua.includes('Mobile') || ua.includes('Android')) device = 'Mobile';
  else if (ua.includes('iPad') || ua.includes('Tablet')) device = 'Tablet';
  return { browser, os, device };
}

export default function AdminAuditLogs() {
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterTenant, setFilterTenant] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

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
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(1000);
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const getActorName = (actorId: string | null) => {
    if (!actorId) return 'Sistema';
    const p = profiles.find(p => p.id === actorId);
    return p?.name || p?.email || 'Desconhecido';
  };

  const getActorEmail = (actorId: string | null) => {
    if (!actorId) return null;
    return profiles.find(p => p.id === actorId)?.email || null;
  };

  const getTenantName = (tenantId: string | null) => {
    if (!tenantId) return '—';
    return tenants.find(t => t.id === tenantId)?.name || '—';
  };

  const filteredLogs = useMemo(() => {
    return rawLogs.filter(log => {
      // Tab filter
      if (activeTab === 'auth' && log.entity !== 'auth') return false;
      if (activeTab === 'operations' && log.entity === 'auth') return false;
      if (activeTab === 'security' && !['auth.login', 'auth.logout', 'auth.password_recovery', 'auth.password_reset', 'user.password_changed', 'user.deactivated', 'user.reactivated'].includes(log.action)) return false;

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
  }, [rawLogs, filterEntity, filterTenant, search, filterDateFrom, filterDateTo, profiles, activeTab]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayLogs = rawLogs.filter(l => l.created_at.startsWith(today));
    const logins = rawLogs.filter(l => l.action === 'auth.login');
    const todayLogins = logins.filter(l => l.created_at.startsWith(today));
    const uniqueIPs = new Set(rawLogs.filter(l => l.ip).map(l => l.ip)).size;
    return { total: rawLogs.length, today: todayLogs.length, logins: todayLogins.length, uniqueIPs };
  }, [rawLogs]);

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
          { label: 'IPs únicos', value: stats.uniqueIPs, icon: Globe, color: 'text-amber-500' },
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-lg">
          <TabsTrigger value="all" className="text-xs rounded-md">Todos</TabsTrigger>
          <TabsTrigger value="auth" className="text-xs rounded-md">Autenticação</TabsTrigger>
          <TabsTrigger value="operations" className="text-xs rounded-md">Operações</TabsTrigger>
          <TabsTrigger value="security" className="text-xs rounded-md">Segurança</TabsTrigger>
        </TabsList>

        <div className="mt-3">
          {/* Filters */}
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

        {/* Content for all tabs shares the same list */}
        {['all', 'auth', 'operations', 'security'].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-3">
            <Card className="border-border shadow-none rounded-xl overflow-hidden">
              <CardContent className="p-0">
                <div className="px-4 py-2 border-b border-border bg-muted/30">
                  <p className="text-xs text-muted-foreground font-medium">{filteredLogs.length} registro{filteredLogs.length !== 1 ? 's' : ''}</p>
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
                              {log.tenant_id && <span className="text-[11px] text-muted-foreground">{getTenantName(log.tenant_id)}</span>}
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
                            <div>
                              <p className="text-[11px] text-muted-foreground">{format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}</p>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Detalhes do Evento
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <DetailField label="Ação" value={actionLabels[selectedLog.action] || selectedLog.action} />
                <DetailField label="Entidade" value={entityLabels[selectedLog.entity] || selectedLog.entity} />
                <DetailField label="Data/Hora" value={format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })} />
                <DetailField label="Departamento" value={getTenantName(selectedLog.tenant_id)} />
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-[11px] text-muted-foreground font-medium mb-2 uppercase tracking-wider">Usuário</p>
                <div className="grid grid-cols-2 gap-3">
                  <DetailField label="Nome" value={getActorName(selectedLog.actor_user_id)} />
                  <DetailField label="Email" value={getActorEmail(selectedLog.actor_user_id) || '—'} />
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-[11px] text-muted-foreground font-medium mb-2 uppercase tracking-wider">Conexão</p>
                <div className="grid grid-cols-2 gap-3">
                  <DetailField label="Endereço IP" value={selectedLog.ip || '—'} mono />
                  {(() => {
                    const ua = parseUserAgent(selectedLog.user_agent);
                    return (
                      <>
                        <DetailField label="Navegador" value={ua.browser} />
                        <DetailField label="Sistema Operacional" value={ua.os} />
                        <DetailField label="Dispositivo" value={ua.device} />
                      </>
                    );
                  })()}
                </div>
                {selectedLog.user_agent && (
                  <div className="mt-2">
                    <p className="text-[10px] text-muted-foreground mb-0.5">User Agent completo</p>
                    <p className="text-[10px] font-mono bg-muted p-2 rounded-md break-all text-muted-foreground">{selectedLog.user_agent}</p>
                  </div>
                )}
              </div>

              {selectedLog.diff && Object.keys(selectedLog.diff).length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="text-[11px] text-muted-foreground font-medium mb-2 uppercase tracking-wider">Detalhes / Alterações</p>
                  <div className="bg-muted rounded-lg p-3 space-y-1">
                    {Object.entries(selectedLog.diff).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">{key}</span>
                        <span className="font-mono text-foreground">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.entity_id && (
                <div className="border-t border-border pt-3">
                  <DetailField label="ID da Entidade" value={selectedLog.entity_id} mono />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-xs font-medium ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
