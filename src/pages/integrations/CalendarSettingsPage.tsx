import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, CalendarDays, Loader2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CalendarEntry {
  id: string;
  name: string;
  ical_url: string;
  is_active: boolean;
  color: string;
}

export default function CalendarSettingsPage() {
  const navigate = useNavigate();
  const { currentTenantId: tenantId, user } = useAuth();
  const [calendars, setCalendars] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');

  useEffect(() => {
    if (!tenantId) return;
    loadCalendars();
  }, [tenantId]);

  async function loadCalendars() {
    const { data, error } = await supabase
      .from('tenant_calendar_settings')
      .select('*')
      .eq('tenant_id', tenantId!)
      .order('created_at');
    if (error) {
      toast.error('Erro ao carregar calendários');
    } else {
      setCalendars(data || []);
    }
    setLoading(false);
  }

  async function handleAdd() {
    if (!newUrl.trim()) {
      toast.error('Informe a URL iCal');
      return;
    }
    if (!newName.trim()) {
      toast.error('Informe um nome para o calendário');
      return;
    }

    // Basic URL validation
    try {
      const url = new URL(newUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      toast.error('URL inválida. Informe uma URL válida (https://...)');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('tenant_calendar_settings').insert({
      tenant_id: tenantId!,
      name: newName.trim(),
      ical_url: newUrl.trim(),
      color: newColor,
    });
    setSaving(false);

    if (error) {
      if (error.code === '23505') {
        toast.error('Este calendário já foi adicionado');
      } else {
        toast.error('Erro ao adicionar calendário');
      }
      return;
    }

    toast.success('Calendário adicionado com sucesso');
    setNewName('');
    setNewUrl('');
    setNewColor('#3b82f6');
    loadCalendars();
  }

  async function handleToggle(id: string, active: boolean) {
    await supabase
      .from('tenant_calendar_settings')
      .update({ is_active: active, updated_at: new Date().toISOString() })
      .eq('id', id);
    setCalendars((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: active } : c)));
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('tenant_calendar_settings').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover calendário');
    } else {
      toast.success('Calendário removido');
      setCalendars((prev) => prev.filter((c) => c.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/integracoes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Microsoft Calendar (iCal)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Adicione URLs de calendários compartilhados do Outlook para visualizar eventos.
          </p>
        </div>
      </div>

      {/* How to get iCal URL */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Como obter a URL iCal do Outlook?</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1.5">
          <p>1. Acesse o <a href="https://outlook.office365.com/calendar" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">Outlook Web <ExternalLink className="h-3 w-3" /></a></p>
          <p>2. Clique com botão direito no calendário desejado → <strong>Compartilhamento e permissões</strong></p>
          <p>3. Selecione <strong>"Pode visualizar todos os detalhes"</strong> e publique</p>
          <p>4. Copie o link <strong>ICS</strong> gerado</p>
        </CardContent>
      </Card>

      {/* Add new */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" /> Adicionar Calendário
          </CardTitle>
          <CardDescription className="text-xs">Cole a URL iCal do calendário do Outlook.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input
                placeholder="Ex: Manutenção Predial"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cor</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">{newColor}</span>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">URL iCal (.ics)</Label>
            <Input
              placeholder="https://outlook.office365.com/owa/calendar/..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="text-sm"
            />
          </div>
          <Button onClick={handleAdd} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
            Adicionar
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Calendários Configurados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : calendars.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum calendário configurado ainda.</p>
          ) : (
            <div className="space-y-2">
              {calendars.map((cal) => (
                <div key={cal.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cal.color }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{cal.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[300px]">{cal.ical_url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={cal.is_active ? 'default' : 'secondary'} className="text-[10px]">
                      {cal.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Switch checked={cal.is_active} onCheckedChange={(v) => handleToggle(cal.id, v)} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(cal.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
