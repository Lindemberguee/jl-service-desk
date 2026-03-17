import { useState, useRef, useEffect } from 'react';
import NotificationPreferencesCard from '@/components/notifications/NotificationPreferencesCard';
import { logAudit } from '@/lib/audit';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import {
  User, KeyRound, Loader2, Eye, EyeOff, Save, Camera,
  Linkedin, Phone, Shield, Building2, Globe, CheckCircle2, Clock, XCircle, Coffee, Palette, Check, RotateCcw,
  Mail, BadgeCheck, Sparkles, Lock,
} from 'lucide-react';
import { usePersonalTheme, THEME_PRESETS, type ThemePreset } from '@/hooks/usePersonalTheme';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_OPTIONS = [
  { value: 'disponivel', label: 'Disponível', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
  { value: 'ocupado', label: 'Ocupado', icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  { value: 'ausente', label: 'Ausente', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { value: 'em_pausa', label: 'Em pausa', icon: Coffee, color: 'text-muted-foreground', bg: 'bg-muted' },
];

export default function ProfilePage() {
  const { profile, user, memberships, currentTenantId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: fullProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ['my-full-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('disponivel');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (fullProfile) {
      setName(fullProfile.name || '');
      setPhone((fullProfile as any).phone || '');
      setLinkedinUrl((fullProfile as any).linkedin_url || '');
      setBio((fullProfile as any).bio || '');
      setStatus((fullProfile as any).status || 'disponivel');
      setAvatarPreview(fullProfile.avatar_url || null);
    }
  }, [fullProfile]);

  const currentMembership = memberships.find(m => m.tenant_id === currentTenantId);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles').update({
        name, phone, linkedin_url: linkedinUrl, bio, status,
      } as any).eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await logAudit({ entity: 'user', entityId: user?.id, action: 'user.profile_updated', diff: { name, phone, linkedin_url: linkedinUrl, bio, status } });
      qc.invalidateQueries({ queryKey: ['my-full-profile'] });
      qc.invalidateQueries({ queryKey: ['profiles_list'] });
      toast({ title: 'Perfil atualizado com sucesso!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Erro', description: 'A imagem deve ter no máximo 2MB.', variant: 'destructive' });
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
      if (updateError) throw updateError;
      setAvatarPreview(avatarUrl);
      qc.invalidateQueries({ queryKey: ['my-full-profile'] });
      toast({ title: 'Foto atualizada!' });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar foto', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const updatePassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error('As senhas não coincidem.');
      if (newPassword.length < 6) throw new Error('Mínimo 6 caracteres.');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: async () => {
      await logAudit({ entity: 'user', entityId: user?.id, action: 'user.self_password_changed', diff: { changed_by: 'self' } });
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Senha alterada com sucesso!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const currentStatus = STATUS_OPTIONS.find(s => s.value === status);

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Hero Card */}
      <Card className="overflow-hidden border-border/50 shadow-[0_2px_12px_0_hsl(var(--foreground)/0.06)]">
        <div className="h-28 bg-gradient-to-br from-primary/25 via-primary/10 to-accent/20 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--primary)/0.15),transparent_60%)]" />
        </div>
        <CardContent className="relative -mt-14 pb-6 px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
            {/* Avatar */}
            <div className="relative group">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg ring-2 ring-border/50">
                <AvatarImage src={avatarPreview || undefined} alt={name} />
                <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
                  {name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploadingAvatar
                  ? <Loader2 className="h-5 w-5 animate-spin text-white" />
                  : <Camera className="h-5 w-5 text-white" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              {/* Online indicator */}
              {currentStatus && (
                <div className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full border-2 border-background flex items-center justify-center',
                  status === 'disponivel' ? 'bg-green-500' :
                  status === 'ocupado' ? 'bg-red-500' :
                  status === 'ausente' ? 'bg-yellow-500' : 'bg-muted-foreground/50'
                )} />
              )}
            </div>

            {/* Name + Meta */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold truncate">{name || profile?.name}</h2>
                <BadgeCheck className="h-4.5 w-4.5 text-primary shrink-0" />
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{profile?.email}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {currentStatus && (
                  <Badge variant="outline" className={cn('gap-1 text-xs', currentStatus.bg)}>
                    <currentStatus.icon className={`h-3 w-3 ${currentStatus.color}`} />
                    {currentStatus.label}
                  </Badge>
                )}
                {currentMembership && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    <Shield className="h-3 w-3 mr-1" />
                    {currentMembership.role?.replace('_', ' ')}
                  </Badge>
                )}
                {currentMembership && (
                  <Badge variant="outline" className="text-xs">
                    <Building2 className="h-3 w-3 mr-1" />
                    {currentMembership.tenant_name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 rounded-lg h-auto">
          <TabsTrigger value="info" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs gap-1.5 px-3 py-1.5">
            <User className="h-3 w-3" />Informações
          </TabsTrigger>
          <TabsTrigger value="theme" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs gap-1.5 px-3 py-1.5">
            <Palette className="h-3 w-3" />Tema
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs gap-1.5 px-3 py-1.5">
            <Lock className="h-3 w-3" />Segurança
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs gap-1.5 px-3 py-1.5">
            <Sparkles className="h-3 w-3" />Notificações
          </TabsTrigger>
        </TabsList>

        {/* ─── Info Tab ─── */}
        <TabsContent value="info" className="space-y-4">
          <Card className="border-border/50 shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Nome completo</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" placeholder="Seu nome" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">E-mail</Label>
                  <Input value={profile?.email || ''} disabled className="h-9 text-sm bg-muted/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-9 text-sm" placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1"><Globe className="h-3 w-3" /> Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.icon className={`h-3.5 w-3.5 ${opt.color}`} />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1"><Linkedin className="h-3 w-3" /> LinkedIn</Label>
                <Input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} className="h-9 text-sm" placeholder="https://linkedin.com/in/seu-perfil" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Bio</Label>
                <Textarea value={bio} onChange={e => setBio(e.target.value)} className="text-sm min-h-[80px] resize-none" placeholder="Conte um pouco sobre você..." maxLength={300} />
                <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" className="gap-1.5" onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Salvar Perfil
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Organization */}
          {currentMembership && (
            <Card className="border-border/50 shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Organização
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Empresa</span>
                    <p className="font-semibold">{currentMembership.tenant_name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Perfil de Acesso</span>
                    <p className="font-semibold capitalize">{currentMembership.role?.replace('_', ' ')}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Slug</span>
                    <p className="font-semibold font-mono text-[11px]">{currentMembership.tenant_slug}</p>
                  </div>
                </div>
                {memberships.length > 1 && (
                  <>
                    <Separator className="my-3" />
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground font-medium">Todos os acessos</span>
                      <div className="flex flex-wrap gap-1.5">
                        {memberships.map(m => (
                          <Badge key={m.id} variant={m.tenant_id === currentTenantId ? 'default' : 'outline'} className="text-xs capitalize">
                            {m.tenant_name} · {m.role?.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Theme Tab ─── */}
        <TabsContent value="theme">
          <ThemeCard />
        </TabsContent>

        {/* ─── Security Tab ─── */}
        <TabsContent value="security">
          <Card className="border-border/50 shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" /> Alterar Senha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={e => { e.preventDefault(); updatePassword.mutate(); }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Nova senha</Label>
                    <div className="relative">
                      <Input
                        type={showNew ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required minLength={6}
                        className="h-9 text-sm pr-9"
                      />
                      <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowNew(!showNew)}>
                        {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Confirmar nova senha</Label>
                    <Input
                      type="password" placeholder="Repita a nova senha"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      required minLength={6} className="h-9 text-sm"
                    />
                  </div>
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">As senhas não coincidem.</p>
                )}
                <div className="flex justify-end">
                  <Button type="submit" size="sm" className="gap-1.5" disabled={updatePassword.isPending || !newPassword || !confirmPassword || newPassword !== confirmPassword}>
                    {updatePassword.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                    Alterar Senha
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Notifications Tab ─── */}
        <TabsContent value="notifications">
          <NotificationPreferencesCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Theme Card                                                 */
/* ──────────────────────────────────────────────────────────── */
function ThemeCard() {
  const { currentPresetId, setTheme, setCustomColors, currentTheme, savedThemes, saveTheme, removeSavedTheme, applySavedTheme } = usePersonalTheme();
  const [customMode, setCustomMode] = useState(false);
  const [customPrimary, setCustomPrimary] = useState(currentTheme?.primary || '#3B82F6');
  const [customAccent, setCustomAccent] = useState(currentTheme?.accent || '#8B5CF6');
  const [customSidebar, setCustomSidebar] = useState(currentTheme?.sidebar || '#1E293B');
  const [saveName, setSaveName] = useState('');
  const [showSave, setShowSave] = useState(false);

  const handleSave = () => {
    if (!saveName.trim()) return;
    saveTheme(saveName.trim());
    setSaveName('');
    setShowSave(false);
  };

  return (
    <div className="space-y-4">
      {/* Presets */}
      <Card className="border-border/50 shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" /> Presets de Tema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Clique em um tema para aplicar instantaneamente. Suas preferências são salvas localmente.</p>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {THEME_PRESETS.map((preset) => {
              const isActive = currentPresetId === preset.id;
              return (
                <motion.button
                  key={preset.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTheme(preset)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-2.5 rounded-xl border transition-all duration-200",
                    isActive
                      ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                  )}
                >
                  <div className="relative">
                    <div
                      className="h-10 w-10 rounded-xl shadow-inner"
                      style={{
                        background: `linear-gradient(135deg, ${preset.sidebar} 50%, ${preset.primary} 50%)`,
                      }}
                    />
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <Check className="h-4 w-4 text-white drop-shadow-md" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <span className="text-[10px] font-medium leading-tight text-center">{preset.label}</span>
                </motion.button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7" onClick={() => setCustomMode(!customMode)}>
              <Palette className="h-3 w-3" />
              {customMode ? 'Ocultar cores' : 'Personalizar cores'}
            </Button>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7" onClick={() => setTheme(null)}>
              <RotateCcw className="h-3 w-3" />
              Restaurar padrão
            </Button>
          </div>

          <AnimatePresence>
            {customMode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Cor Primária</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={customPrimary} onChange={e => setCustomPrimary(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-border cursor-pointer" />
                      <Input value={customPrimary} onChange={e => setCustomPrimary(e.target.value)} className="h-9 font-mono text-xs flex-1" maxLength={7} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Cor de Destaque</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={customAccent} onChange={e => setCustomAccent(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-border cursor-pointer" />
                      <Input value={customAccent} onChange={e => setCustomAccent(e.target.value)} className="h-9 font-mono text-xs flex-1" maxLength={7} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Fundo do Menu</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={customSidebar} onChange={e => setCustomSidebar(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-border cursor-pointer" />
                      <Input value={customSidebar} onChange={e => setCustomSidebar(e.target.value)} className="h-9 font-mono text-xs flex-1" maxLength={7} />
                    </div>
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-2">
                    <Button size="sm" className="gap-1.5" onClick={() => setCustomColors(customPrimary, customAccent, customSidebar)}>
                      <Check className="h-3.5 w-3.5" />
                      Aplicar
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowSave(!showSave)}>
                      <Save className="h-3.5 w-3.5" />
                      Salvar tema
                    </Button>
                  </div>
                  {showSave && (
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <Input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Nome do tema..." className="h-8 text-xs flex-1" />
                      <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={!saveName.trim()}>Salvar</Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Saved Themes */}
      {savedThemes.length > 0 && (
        <Card className="border-border/50 shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Meus Temas Salvos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {savedThemes.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm",
                    currentPresetId === t.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  )}
                  onClick={() => applySavedTheme(t)}
                >
                  <div className="flex gap-1">
                    <div className="h-6 w-6 rounded-md" style={{ backgroundColor: t.primary }} />
                    <div className="h-6 w-6 rounded-md" style={{ backgroundColor: t.accent }} />
                    <div className="h-6 w-6 rounded-md" style={{ backgroundColor: t.sidebar }} />
                  </div>
                  <span className="text-[10px] font-medium truncate w-full text-center">{t.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] text-destructive hover:text-destructive px-1.5"
                    onClick={(e) => { e.stopPropagation(); removeSavedTheme(t.id); }}
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
