import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Palette, Type, Image as ImageIcon, RotateCcw, Check } from 'lucide-react';

const DEFAULT_PRIMARY = '#3B82F6';
const DEFAULT_ACCENT = '#8B5CF6';

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

  // Sync form when tenant changes
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

      const { error: uploadError } = await supabase.storage
        .from('tenant-logos')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('tenant-logos')
        .getPublicUrl(path);

      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('tenants')
        .update({ logo_url: logoUrl } as any)
        .eq('id', selectedTenant);
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
      const { error } = await supabase
        .from('tenants')
        .update({ logo_url: null } as any)
        .eq('id', selectedTenant);
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
      const { error } = await supabase
        .from('tenants')
        .update({
          name: form.name,
          primary_color: form.primary_color,
          accent_color: form.accent_color,
        } as any)
        .eq('id', selectedTenant);
      if (error) throw error;
    },
    onSuccess: async () => {
      await logAudit({
        entity: 'tenant',
        entityId: selectedTenant,
        action: 'tenant.branding_updated',
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
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Identidade Visual
        </CardTitle>
        <CardDescription className="text-xs">
          Personalize nome, logo e cores do sistema por departamento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tenant selector */}
        {tenants.length > 1 && (
          <div className="space-y-2">
            <Label className="text-xs">Departamento</Label>
            <Select value={selectedTenant} onValueChange={handleTenantChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {tenants.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left: Name & Colors */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5" />
                Nome do Sistema
              </Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: ServiceOS, Manutenção TI"
              />
              <p className="text-[10px] text-muted-foreground">Exibido no menu lateral e cabeçalhos</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" />
                Cor Primária
              </Label>
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
                  className="w-28 font-mono text-xs"
                  maxLength={7}
                />
                <div className="flex-1 h-8 rounded-md" style={{ backgroundColor: form.primary_color }} />
              </div>
              <p className="text-[10px] text-muted-foreground">Aplicada ao menu lateral, botões e destaques</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" />
                Cor de Destaque (Accent)
              </Label>
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
                  className="w-28 font-mono text-xs"
                  maxLength={7}
                />
                <div className="flex-1 h-8 rounded-md" style={{ backgroundColor: form.accent_color }} />
              </div>
              <p className="text-[10px] text-muted-foreground">Usada em badges, hovers e acentos visuais</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={resetColors}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Restaurar Cores Padrão
              </Button>
            </div>
          </div>

          {/* Right: Logo */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                Logo do Sistema
              </Label>
              <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-3 min-h-[160px] bg-muted/30">
                {tenant?.logo_url ? (
                  <>
                    <img
                      src={tenant.logo_url}
                      alt="Logo"
                      className="max-h-20 max-w-[200px] object-contain rounded"
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        Trocar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeLogo.mutate()} disabled={removeLogo.isPending}>
                        Remover
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      {uploading ? 'Enviando...' : 'Enviar Logo'}
                    </Button>
                    <p className="text-[10px] text-muted-foreground">PNG, JPG ou SVG • Máx. 2MB</p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-xs">Preview do Menu</Label>
              <div className="rounded-xl overflow-hidden border border-border">
                <div
                  className="p-3 flex items-center gap-3"
                  style={{ backgroundColor: form.primary_color + '15', borderBottom: `1px solid ${form.primary_color}20` }}
                >
                  {tenant?.logo_url ? (
                    <img src={tenant.logo_url} alt="" className="h-8 w-8 rounded-lg object-contain" />
                  ) : (
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.accent_color})` }}
                    >
                      {form.name?.charAt(0)?.toUpperCase() || 'S'}
                    </div>
                  )}
                  <span className="text-sm font-bold" style={{ color: form.primary_color }}>{form.name || 'ServiceOS'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button
            onClick={() => saveBranding.mutate()}
            disabled={saveBranding.isPending || !form.name}
          >
            <Check className="h-4 w-4 mr-1.5" />
            {saveBranding.isPending ? 'Salvando...' : 'Salvar Identidade Visual'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
