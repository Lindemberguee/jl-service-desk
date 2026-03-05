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
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare, Shield, Send, CheckCircle2, XCircle, Loader2,
  Bell, ClipboardList, Package, AlertTriangle, ArrowLeft, Webhook, ExternalLink,
} from 'lucide-react';

interface TeamsSettings {
  id?: string;
  tenant_id: string;
  webhook_url: string;
  is_active: boolean;
  notify_os_created: boolean;
  notify_os_status_changed: boolean;
  notify_stock_critical: boolean;
  notify_new_user: boolean;
  notify_maintenance: boolean;
  notify_sla_warning: boolean;
  webhook_url_os: string;
  webhook_url_stock: string;
  webhook_url_maintenance: string;
}

export default function TeamsSettingsPage() {
  const { currentTenantId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<TeamsSettings>({
    tenant_id: currentTenantId || '',
    webhook_url: '',
    is_active: false,
    notify_os_created: true,
    notify_os_status_changed: true,
    notify_stock_critical: true,
    notify_new_user: false,
    notify_maintenance: false,
    notify_sla_warning: false,
    webhook_url_os: '',
    webhook_url_stock: '',
    webhook_url_maintenance: '',
  });

  useEffect(() => {
    if (!currentTenantId) return;
    loadSettings();
  }, [currentTenantId]);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tenant_teams_settings')
      .select('*')
      .eq('tenant_id', currentTenantId!)
      .maybeSingle();

    if (data) {
      setSettings(data as unknown as TeamsSettings);
    } else {
      setSettings(prev => ({ ...prev, tenant_id: currentTenantId! }));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!currentTenantId) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: currentTenantId,
        webhook_url: settings.webhook_url,
        is_active: settings.is_active,
        notify_os_created: settings.notify_os_created,
        notify_os_status_changed: settings.notify_os_status_changed,
        notify_stock_critical: settings.notify_stock_critical,
        notify_new_user: settings.notify_new_user,
        notify_maintenance: settings.notify_maintenance,
        notify_sla_warning: settings.notify_sla_warning,
        webhook_url_os: settings.webhook_url_os || null,
        webhook_url_stock: settings.webhook_url_stock || null,
        webhook_url_maintenance: settings.webhook_url_maintenance || null,
      };

      if (settings.id) {
        const { error } = await supabase
          .from('tenant_teams_settings')
          .update(payload as any)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('tenant_teams_settings')
          .insert(payload as any)
          .select()
          .single();
        if (error) throw error;
        if (data) setSettings(data as unknown as TeamsSettings);
      }
      toast.success('Configurações do Teams salvas com sucesso');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-teams-notification', {
        body: { type: 'test', tenant_id: currentTenantId },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('Notificação de teste enviada ao Teams!');
      } else {
        toast.error(data?.error || 'Falha ao enviar notificação de teste');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar notificação de teste');
    } finally {
      setTesting(false);
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
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Microsoft Teams</h1>
            <p className="text-sm text-muted-foreground">Envie alertas automáticos para canais do Teams via Webhook</p>
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

      {/* Webhook Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Incoming Webhook</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Cole a URL do Incoming Webhook criado no canal do Microsoft Teams
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook_url" className="text-xs font-medium">URL do Webhook</Label>
            <Input
              id="webhook_url"
              value={settings.webhook_url}
              onChange={e => setSettings(p => ({ ...p, webhook_url: e.target.value }))}
              placeholder="https://outlook.office.com/webhook/..."
              className="font-mono text-xs"
            />
          </div>

          <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <ExternalLink className="h-3 w-3" />
              Como criar um Incoming Webhook no Teams
            </h4>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Abra o <strong>Microsoft Teams</strong> e vá até o canal desejado</li>
              <li>Clique em <strong>⋯ (Mais opções)</strong> → <strong>Conectores</strong> (ou <strong>Workflows</strong>)</li>
              <li>Pesquise por <strong>"Incoming Webhook"</strong> e clique em <strong>Configurar</strong></li>
              <li>Dê um nome (ex: "OrdFy Alertas") e opcionalmente um ícone</li>
              <li>Copie a <strong>URL gerada</strong> e cole no campo acima</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Event Toggles */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Eventos de Notificação</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Selecione quais eventos devem enviar alertas no canal do Teams
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
                <p className="text-xs text-muted-foreground">Alertar o canal quando uma nova OS é criada</p>
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
                <p className="text-xs text-muted-foreground">Alertar sobre alterações de status de ordens de serviço</p>
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
                <p className="text-xs text-muted-foreground">Alertar quando um item atinge o nível mínimo</p>
              </div>
            </div>
            <Switch checked={settings.notify_stock_critical} onCheckedChange={v => setSettings(p => ({ ...p, notify_stock_critical: v }))} />
          </div>
        </CardContent>
      </Card>

      {/* Activation & Actions */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-500" />
              <div>
                <p className="text-sm font-medium">Ativar integração com Teams</p>
                <p className="text-xs text-muted-foreground">Habilitar envio de alertas para o canal configurado</p>
              </div>
            </div>
            <Switch checked={settings.is_active} onCheckedChange={v => setSettings(p => ({ ...p, is_active: v }))} />
          </div>

          {!settings.webhook_url && settings.is_active && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-600">Configure a URL do Webhook antes de ativar a integração.</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
              Salvar Configurações
            </Button>
            <Button variant="outline" onClick={handleTestNotification} disabled={testing || !settings.webhook_url || !settings.id}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar Teste
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
