import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell, Mail, MessageSquare, Monitor, ClipboardList, Package, Users,
  Wrench, Clock, Loader2, Save,
} from 'lucide-react';

interface Pref {
  event_type: string;
  channel_email: boolean;
  channel_teams: boolean;
  channel_in_app: boolean;
}

const EVENT_TYPES = [
  { key: 'os_created', label: 'OS Criada / Atribuída', icon: ClipboardList, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { key: 'os_status_changed', label: 'Mudança de Status', icon: ClipboardList, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { key: 'stock_critical', label: 'Estoque Crítico', icon: Package, color: 'text-red-500', bg: 'bg-red-500/10' },
  { key: 'new_user', label: 'Novo Usuário', icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { key: 'maintenance', label: 'Manutenção Preventiva', icon: Wrench, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { key: 'sla_warning', label: 'Alerta de SLA', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
];

const CHANNELS = [
  { key: 'channel_in_app', label: 'No App', icon: Monitor },
  { key: 'channel_email', label: 'E-mail', icon: Mail },
  { key: 'channel_teams', label: 'Teams', icon: MessageSquare },
] as const;

export default function NotificationPreferencesCard() {
  const { user, currentTenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Pref[]>(
    EVENT_TYPES.map(e => ({ event_type: e.key, channel_email: true, channel_teams: true, channel_in_app: true }))
  );

  useEffect(() => {
    if (!user?.id || !currentTenantId) return;
    loadPrefs();
  }, [user?.id, currentTenantId]);

  const loadPrefs = async () => {
    setLoading(true);
    const { data } = await (supabase.from('notification_preferences') as any)
      .select('*')
      .eq('user_id', user!.id)
      .eq('tenant_id', currentTenantId);

    if (data && data.length > 0) {
      setPrefs(EVENT_TYPES.map(e => {
        const existing = data.find((d: any) => d.event_type === e.key);
        return existing
          ? { event_type: e.key, channel_email: existing.channel_email, channel_teams: existing.channel_teams, channel_in_app: existing.channel_in_app }
          : { event_type: e.key, channel_email: true, channel_teams: true, channel_in_app: true };
      }));
    }
    setLoading(false);
  };

  const togglePref = (eventType: string, channel: string) => {
    setPrefs(prev => prev.map(p =>
      p.event_type === eventType ? { ...p, [channel]: !(p as any)[channel] } : p
    ));
  };

  const handleSave = async () => {
    if (!user?.id || !currentTenantId) return;
    setSaving(true);
    try {
      for (const pref of prefs) {
        await (supabase.from('notification_preferences') as any).upsert({
          user_id: user.id,
          tenant_id: currentTenantId,
          event_type: pref.event_type,
          channel_email: pref.channel_email,
          channel_teams: pref.channel_teams,
          channel_in_app: pref.channel_in_app,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,tenant_id,event_type' });
      }
      toast.success('Preferências de notificação salvas');
    } catch {
      toast.error('Erro ao salvar preferências');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton className="h-[400px] w-full" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Preferências de Notificação</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Escolha como deseja receber cada tipo de notificação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Header */}
        <div className="grid grid-cols-[1fr_repeat(3,60px)] gap-2 pb-2 border-b mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Evento</span>
          {CHANNELS.map(ch => (
            <span key={ch.key} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
              {ch.label}
            </span>
          ))}
        </div>

        {/* Rows */}
        {EVENT_TYPES.map(evt => {
          const pref = prefs.find(p => p.event_type === evt.key)!;
          const Icon = evt.icon;
          return (
            <div key={evt.key} className="grid grid-cols-[1fr_repeat(3,60px)] gap-2 items-center py-2 hover:bg-accent/30 rounded-lg px-2 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className={`h-7 w-7 rounded-md ${evt.bg} flex items-center justify-center`}>
                  <Icon className={`h-3.5 w-3.5 ${evt.color}`} />
                </div>
                <span className="text-xs font-medium">{evt.label}</span>
              </div>
              {CHANNELS.map(ch => (
                <div key={ch.key} className="flex justify-center">
                  <Switch
                    checked={(pref as any)[ch.key]}
                    onCheckedChange={() => togglePref(evt.key, ch.key)}
                    className="scale-75"
                  />
                </div>
              ))}
            </div>
          );
        })}

        <div className="pt-4">
          <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Salvar Preferências
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
