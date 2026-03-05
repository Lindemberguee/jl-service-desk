import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Mail, Server, Shield, Send, CheckCircle2, XCircle, Loader2,
  Bell, ClipboardList, Package, AlertTriangle, Eye, EyeOff, ArrowLeft,
  History, RefreshCw, Clock, MailCheck, MailX, MailWarning,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SmtpSettings {
  id?: string;
  tenant_id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from_email: string;
  smtp_from_name: string;
  use_tls: boolean;
  is_active: boolean;
  notify_os_created: boolean;
  notify_os_status_changed: boolean;
  notify_stock_critical: boolean;
  notify_new_user: boolean;
  notify_maintenance: boolean;
  notify_sla_warning: boolean;
}

interface EmailLog {
  id: string;
  email_type: string;
  to_email: string;
  subject: string;
  status: string;
  error_message: string | null;
  smtp_host: string | null;
  created_at: string;
}

interface QueueItem {
  id: string;
  email_type: string;
  to_email: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  next_retry_at: string | null;
  created_at: string;
}

const SMTP_PRESETS: Record<string, { host: string; port: number; tls: boolean }> = {
  gmail: { host: 'smtp.gmail.com', port: 587, tls: true },
  outlook: { host: 'smtp.office365.com', port: 587, tls: true },
  yahoo: { host: 'smtp.mail.yahoo.com', port: 465, tls: true },
  custom: { host: '', port: 587, tls: true },
};

const emailTypeLabels: Record<string, string> = {
  test: 'Teste',
  os_created: 'OS Criada',
  os_status_changed: 'Status OS',
  stock_critical: 'Estoque Crítico',
  new_user: 'Novo Usuário',
  maintenance: 'Manutenção',
  sla_warning: 'SLA',
  custom: 'Personalizado',
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  sent: { label: 'Enviado', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: MailCheck },
  failed: { label: 'Falhou', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: MailX },
  pending: { label: 'Pendente', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Clock },
  retrying: { label: 'Retentando', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: RefreshCw },
  processing: { label: 'Processando', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: Loader2 },
};

export default function SmtpSettingsPage() {
  const { currentTenantId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [settings, setSettings] = useState<SmtpSettings>({
    tenant_id: currentTenantId || '',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_from_email: '',
    smtp_from_name: '',
    use_tls: true,
    is_active: false,
    notify_os_created: true,
    notify_os_status_changed: true,
    notify_stock_critical: true,
  });

  useEffect(() => {
    if (!currentTenantId) return;
    loadSettings();
  }, [currentTenantId]);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tenant_smtp_settings')
      .select('*')
      .eq('tenant_id', currentTenantId!)
      .maybeSingle();

    if (data) {
      setSettings(data as unknown as SmtpSettings);
    } else {
      setSettings(prev => ({ ...prev, tenant_id: currentTenantId! }));
    }
    setLoading(false);
  };

  const loadLogs = async () => {
    if (!currentTenantId) return;
    setLogsLoading(true);
    const [logsRes, queueRes] = await Promise.all([
      supabase
        .from('email_logs')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('email_queue')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    if (logsRes.data) setEmailLogs(logsRes.data as unknown as EmailLog[]);
    if (queueRes.data) setQueueItems(queueRes.data as unknown as QueueItem[]);
    setLogsLoading(false);
  };

  const handleSave = async () => {
    if (!currentTenantId) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: currentTenantId,
        smtp_host: settings.smtp_host,
        smtp_port: settings.smtp_port,
        smtp_user: settings.smtp_user,
        smtp_pass: settings.smtp_pass,
        smtp_from_email: settings.smtp_from_email,
        smtp_from_name: settings.smtp_from_name,
        use_tls: settings.use_tls,
        is_active: settings.is_active,
        notify_os_created: settings.notify_os_created,
        notify_os_status_changed: settings.notify_os_status_changed,
        notify_stock_critical: settings.notify_stock_critical,
      };

      if (settings.id) {
        const { error } = await supabase
          .from('tenant_smtp_settings')
          .update(payload as any)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('tenant_smtp_settings')
          .insert(payload as any)
          .select()
          .single();
        if (error) throw error;
        if (data) setSettings(data as unknown as SmtpSettings);
      }
      toast.success('Configurações SMTP salvas com sucesso');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email-notification', {
        body: { type: 'test', tenant_id: currentTenantId },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('E-mail de teste enviado com sucesso!');
      } else {
        toast.error(data?.error || 'Falha ao enviar e-mail de teste');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar e-mail de teste');
    } finally {
      setTesting(false);
    }
  };

  const applyPreset = (preset: string) => {
    const config = SMTP_PRESETS[preset];
    if (config) {
      setSettings(prev => ({
        ...prev,
        smtp_host: config.host,
        smtp_port: config.port,
        use_tls: config.tls,
      }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/integracoes')} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">E-mail SMTP</h1>
            <p className="text-sm text-muted-foreground">Configure o envio de notificações por e-mail via SMTP</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={settings.is_active
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            : 'bg-muted text-muted-foreground'
          }
        >
          {settings.is_active ? (
            <><CheckCircle2 className="h-3 w-3 mr-1" /> Ativo</>
          ) : (
            <><XCircle className="h-3 w-3 mr-1" /> Inativo</>
          )}
        </Badge>
      </div>

      <Tabs defaultValue="config" onValueChange={(v) => v === 'logs' && loadLogs()}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config" className="text-xs">
            <Server className="h-3.5 w-3.5 mr-1.5" /> Configuração
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-xs">
            <History className="h-3.5 w-3.5 mr-1.5" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="queue" className="text-xs" onClick={loadLogs}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Fila
          </TabsTrigger>
        </TabsList>

        {/* ── Config Tab ────────────────────────────────────── */}
        <TabsContent value="config" className="space-y-6 mt-6">
          {/* SMTP Config Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Servidor SMTP</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Configure as credenciais do servidor de e-mail para envio de notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Provedor</Label>
                <Select onValueChange={applyPreset}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um provedor ou configure manualmente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail (smtp.gmail.com)</SelectItem>
                    <SelectItem value="outlook">Outlook / Office 365</SelectItem>
                    <SelectItem value="yahoo">Yahoo Mail</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host" className="text-xs font-medium">Host SMTP</Label>
                  <Input id="smtp_host" value={settings.smtp_host} onChange={e => setSettings(p => ({ ...p, smtp_host: e.target.value }))} placeholder="smtp.gmail.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port" className="text-xs font-medium">Porta</Label>
                  <Input id="smtp_port" type="number" value={settings.smtp_port} onChange={e => setSettings(p => ({ ...p, smtp_port: parseInt(e.target.value) || 587 }))} placeholder="587" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_user" className="text-xs font-medium">Usuário / E-mail</Label>
                  <Input id="smtp_user" value={settings.smtp_user} onChange={e => setSettings(p => ({ ...p, smtp_user: e.target.value }))} placeholder="seu-email@gmail.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_pass" className="text-xs font-medium">Senha / App Password</Label>
                  <div className="relative">
                    <Input id="smtp_pass" type={showPassword ? 'text' : 'password'} value={settings.smtp_pass} onChange={e => setSettings(p => ({ ...p, smtp_pass: e.target.value }))} placeholder="••••••••" className="pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_email" className="text-xs font-medium">E-mail remetente</Label>
                  <Input id="smtp_from_email" value={settings.smtp_from_email} onChange={e => setSettings(p => ({ ...p, smtp_from_email: e.target.value }))} placeholder="noreply@suaempresa.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_name" className="text-xs font-medium">Nome remetente</Label>
                  <Input id="smtp_from_name" value={settings.smtp_from_name} onChange={e => setSettings(p => ({ ...p, smtp_from_name: e.target.value }))} placeholder="Sistema de Manutenção" />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Usar TLS/STARTTLS</p>
                    <p className="text-xs text-muted-foreground">Conexão segura (recomendado)</p>
                  </div>
                </div>
                <Switch checked={settings.use_tls} onCheckedChange={v => setSettings(p => ({ ...p, use_tls: v }))} />
              </div>
            </CardContent>
          </Card>

          {/* Notification Events Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Eventos de Notificação</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Selecione quais eventos devem disparar notificações por e-mail
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <ClipboardList className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">OS Criada / Atribuída</p>
                    <p className="text-xs text-muted-foreground">Notificar técnico quando uma OS é criada ou atribuída</p>
                  </div>
                </div>
                <Switch checked={settings.notify_os_created} onCheckedChange={v => setSettings(p => ({ ...p, notify_os_created: v }))} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <ClipboardList className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Mudança de Status</p>
                    <p className="text-xs text-muted-foreground">Notificar solicitante e técnico sobre alterações de status</p>
                  </div>
                </div>
                <Switch checked={settings.notify_os_status_changed} onCheckedChange={v => setSettings(p => ({ ...p, notify_os_status_changed: v }))} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Package className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Estoque Crítico</p>
                    <p className="text-xs text-muted-foreground">Notificar admins quando um item atinge o nível mínimo</p>
                  </div>
                </div>
                <Switch checked={settings.notify_stock_critical} onCheckedChange={v => setSettings(p => ({ ...p, notify_stock_critical: v }))} />
              </div>
            </CardContent>
          </Card>

          {/* Activation & Actions */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Ativar envio de e-mails</p>
                    <p className="text-xs text-muted-foreground">Habilitar notificações por e-mail para este departamento</p>
                  </div>
                </div>
                <Switch checked={settings.is_active} onCheckedChange={v => setSettings(p => ({ ...p, is_active: v }))} />
              </div>

              {!settings.smtp_host && settings.is_active && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-600">Preencha os dados do servidor SMTP antes de ativar o envio.</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                  Salvar Configurações
                </Button>
                <Button variant="outline" onClick={handleTestEmail} disabled={testing || !settings.smtp_host || !settings.id}>
                  {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Enviar Teste
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <h3 className="text-xs font-semibold text-foreground mb-2">ℹ️ Dicas de Configuração</h3>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• <strong>Gmail:</strong> Use uma "Senha de App" em vez da senha normal. Ative em Conta Google → Segurança → Senhas de App.</li>
              <li>• <strong>Outlook/Office 365:</strong> Verifique se a autenticação SMTP está habilitada no admin do Microsoft 365.</li>
              <li>• <strong>Porta 587:</strong> Recomendada com STARTTLS. Use 465 para SSL direto.</li>
              <li>• As credenciais SMTP são armazenadas de forma segura e acessíveis apenas por administradores.</li>
              <li>• <strong>Retry automático:</strong> E-mails que falharem serão reenviados automaticamente até 3 vezes com backoff exponencial.</li>
            </ul>
          </div>
        </TabsContent>

        {/* ── Logs Tab ──────────────────────────────────────── */}
        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">Histórico de Envios</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={loadLogs} disabled={logsLoading}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${logsLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
              <CardDescription className="text-xs">
                Últimos 50 e-mails enviados ou com falha
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : emailLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MailWarning className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum registro de envio encontrado</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-[140px]">Data</TableHead>
                        <TableHead className="text-xs">Tipo</TableHead>
                        <TableHead className="text-xs">Destinatário</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailLogs.map(log => {
                        const cfg = statusConfig[log.status] || statusConfig.failed;
                        const Icon = cfg.icon;
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-medium">
                                {emailTypeLabels[log.email_type] || log.email_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono max-w-[180px] truncate">{log.to_email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                                <Icon className="h-3 w-3 mr-1" /> {cfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {log.error_message || '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Queue Tab ─────────────────────────────────────── */}
        <TabsContent value="queue" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">Fila de Retry</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={loadLogs} disabled={logsLoading}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${logsLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
              <CardDescription className="text-xs">
                E-mails aguardando reenvio automático (máx. 3 tentativas com backoff exponencial)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : queueItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Fila vazia — todos os e-mails foram processados</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-[140px]">Criado em</TableHead>
                        <TableHead className="text-xs">Tipo</TableHead>
                        <TableHead className="text-xs">Destinatário</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Tentativas</TableHead>
                        <TableHead className="text-xs">Próximo Retry</TableHead>
                        <TableHead className="text-xs">Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queueItems.map(item => {
                        const cfg = statusConfig[item.status] || statusConfig.pending;
                        const Icon = cfg.icon;
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(item.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-medium">
                                {emailTypeLabels[item.email_type] || item.email_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono max-w-[160px] truncate">{item.to_email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                                <Icon className="h-3 w-3 mr-1" /> {cfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-center">{item.attempts}/{item.max_attempts}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {item.next_retry_at
                                ? format(new Date(item.next_retry_at), "HH:mm:ss", { locale: ptBR })
                                : '—'
                              }
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                              {item.last_error || '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
