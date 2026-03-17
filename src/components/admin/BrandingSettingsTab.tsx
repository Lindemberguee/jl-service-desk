import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/lib/audit';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Upload, Palette, Type, Image as ImageIcon, RotateCcw, Check, Loader2,
  Monitor, Smartphone, Eye, Trash2, Building2, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const DEFAULT_PRIMARY = '#3B82F6';
const DEFAULT_ACCENT = '#8B5CF6';

const BRAND_PRESETS = [
  { label: 'Azul Corporativo', primary: '#3B82F6', accent: '#8B5CF6' },
  { label: 'Esmeralda', primary: '#10B981', accent: '#06B6D4' },
  { label: 'Carmesim', primary: '#DC2626', accent: '#F97316' },
  { label: 'Oceano', primary: '#0284C7', accent: '#22D3EE' },
  { label: 'Violeta', primary: '#8B5CF6', accent: '#6366F1' },
  { label: 'Grafite', primary: '#64748B', accent: '#94A3B8' },
];

export default function BrandingSettingsTab({ tenants }: { tenants: any[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedTenant, setSelectedTenant] = useState<string>(tenants[0]?.id || '');
  const [uploading, setUploading] = useState(false);

  const tenant = tenants.find((t: any) => t.id === selectedTenant);

  const [form, setForm] = useState({
    name: tenant?.name || '',
    primary_color: tenant?.primary_color || DEFAULT_PRIMARY,
    accent_color: tenant?.accent_color || DEFAULT_ACCENT,
  });

  const handleTenantChange = (id: string) => {
    setSelectedTenant(id);
    const t = tenants.find((x: any) => x.id === id);
    if (t) {
      setForm({
        name: t.name || '',
        primary_color: t.primary_color || DEFAULT_PRIMARY,
        accent_color: t.accent_color || DEFAULT_ACCENT,
      });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTenant) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo de 2MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${selectedTenant}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage.from('tenant-logos').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('tenant-logos').getPublicUrl(path);
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from('tenants').update({ logo_url: logoUrl } as any).eq('id', selectedTenant);
      if (updateError) throw updateError;
      await logAudit({ entity: 'tenant', entityId: selectedTenant, action: 'tenant.logo_updated' });
      qc.invalidateQueries({ queryKey: ['admin_tenants'] });
      qc.invalidateQueries({ queryKey: ['tenant_branding'] });
      toast({ title: 'Logo atualizado!' });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar logo', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeLogo = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tenants').update({ logo_url: null } as any).eq('id', selectedTenant);
      if (error) throw error;
    },
    onSuccess: async () => {
      await logAudit({ entity: 'tenant', entityId: selectedTenant, action: 'tenant.logo_removed' });
      qc.invalidateQueries({ queryKey: ['admin_tenants'] });
      qc.invalidateQueries({ queryKey: ['tenant_branding'] });
      toast({ title: 'Logo removido!' });
    },
  });

  const saveBranding = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tenants').update({
        name: form.name,
        primary_color: form.primary_color,
        accent_color: form.accent_color,
      } as any).eq('id', selectedTenant);
      if (error) throw error;
    },
    onSuccess: async () => {
      await logAudit({
        entity: 'tenant', entityId: selectedTenant, action: 'tenant.branding_updated',
        diff: { name: form.name, primary_color: form.primary_color, accent_color: form.accent_color },
      });
      qc.invalidateQueries({ queryKey: ['admin_tenants'] });
      qc.invalidateQueries({ queryKey: ['tenant_branding'] });
      toast({ title: 'Identidade visual salva!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const resetColors = () => {
    setForm(f => ({ ...f, primary_color: DEFAULT_PRIMARY, accent_color: DEFAULT_ACCENT }));
  };

  if (!tenants.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhum departamento encontrado.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Tenant Selector */}
      {tenants.length > 1 && (
        <Card className="border-border/50 shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <Label className="text-xs font-medium mb-1 block">Departamento</Label>
                <Select value={selectedTenant} onValueChange={handleTenantChange}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tenants.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: Name & Colors */}
        <Card className="border-border/50 shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" /> Cores e Nome
            </CardTitle>
            <CardDescription className="text-xs">Defina a identidade visual do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5" /> Nome do Sistema
              </Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: OrdFy, Manutenção TI"
                className="h-9"
              />
              <p className="text-[10px] text-muted-foreground">Exibido no menu lateral e cabeçalhos</p>
            </div>

            {/* Color Presets */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Paletas rápidas
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {BRAND_PRESETS.map(p => {
                  const isActive = form.primary_color === p.primary && form.accent_color === p.accent;
                  return (
                    <button
                      key={p.label}
                      onClick={() => setForm(f => ({ ...f, primary_color: p.primary, accent_color: p.accent }))}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all",
                        isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <div className="flex gap-0.5 shrink-0">
                        <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: p.primary }} />
                        <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: p.accent }} />
                      </div>
                      <span className="truncate">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Primary Color */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Cor Primária</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                />
                <Input
                  value={form.primary_color}
                  onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                  className="w-28 font-mono text-xs h-9"
                  maxLength={7}
                />
                <div className="flex-1 h-9 rounded-lg border border-border/50" style={{ backgroundColor: form.primary_color }} />
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Cor de Destaque</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.accent_color}
                  onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                />
                <Input
                  value={form.accent_color}
                  onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))}
                  className="w-28 font-mono text-xs h-9"
                  maxLength={7}
                />
                <div className="flex-1 h-9 rounded-lg border border-border/50" style={{ backgroundColor: form.accent_color }} />
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={resetColors} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar Cores Padrão
            </Button>
          </CardContent>
        </Card>

        {/* Right: Logo & Preview */}
        <div className="space-y-4">
          {/* Logo */}
          <Card className="border-border/50 shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" /> Logo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-3 min-h-[140px] bg-muted/20">
                {tenant?.logo_url ? (
                  <>
                    <img src={tenant.logo_url} alt="Logo" className="max-h-16 max-w-[180px] object-contain rounded" />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        Trocar
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs text-destructive" onClick={() => removeLogo.mutate()} disabled={removeLogo.isPending}>
                        <Trash2 className="h-3 w-3" />
                        Remover
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
                      <ImageIcon className="h-7 w-7 text-muted-foreground/30" />
                    </div>
                    <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {uploading ? 'Enviando...' : 'Enviar Logo'}
                    </Button>
                    <p className="text-[10px] text-muted-foreground">PNG, JPG ou SVG • Máx. 2MB</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} />
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card className="border-border/50 shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" /> Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Sidebar Preview */}
              <div className="rounded-xl overflow-hidden border border-border bg-card">
                <div className="flex">
                  {/* Mini sidebar */}
                  <div className="w-44 border-r border-border/50" style={{ backgroundColor: '#1E293B' }}>
                    <div className="p-3 flex items-center gap-2.5 border-b border-white/10">
                      {tenant?.logo_url ? (
                        <img src={tenant.logo_url} alt="" className="h-7 w-7 rounded-lg object-contain" />
                      ) : (
                        <div
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.accent_color})` }}
                        >
                          {form.name?.charAt(0)?.toUpperCase() || 'S'}
                        </div>
                      )}
                      <span className="text-xs font-bold text-white/90 truncate">{form.name || 'OrdFy'}</span>
                    </div>
                    <div className="p-2 space-y-0.5">
                      {['Dashboard', 'Ordens de Serviço', 'Ativos'].map((item, i) => (
                        <div
                          key={item}
                          className={cn(
                            "px-2.5 py-1.5 rounded-md text-[10px] font-medium",
                            i === 0 ? "text-white" : "text-white/50"
                          )}
                          style={i === 0 ? { backgroundColor: `${form.primary_color}30` } : {}}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Content area */}
                  <div className="flex-1 p-3 space-y-2 bg-background">
                    <div className="h-2 w-24 rounded bg-foreground/10" />
                    <div className="flex gap-2">
                      <div className="h-7 px-3 rounded-md text-[10px] font-medium text-white flex items-center" style={{ backgroundColor: form.primary_color }}>
                        Botão
                      </div>
                      <div className="h-7 px-3 rounded-md text-[10px] font-medium flex items-center border border-border text-foreground/60">
                        Secundário
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Badge className="text-[9px] h-4" style={{ backgroundColor: `${form.primary_color}20`, color: form.primary_color }}>Tag 1</Badge>
                      <Badge className="text-[9px] h-4" style={{ backgroundColor: `${form.accent_color}20`, color: form.accent_color }}>Tag 2</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={() => saveBranding.mutate()}
          disabled={saveBranding.isPending || !form.name}
          className="gap-1.5"
        >
          {saveBranding.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saveBranding.isPending ? 'Salvando...' : 'Salvar Identidade Visual'}
        </Button>
      </div>
    </div>
  );
}
