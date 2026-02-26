import { useState, useRef, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import {
  User, KeyRound, Loader2, Eye, EyeOff, Save, Camera,
  Linkedin, Phone, Shield, Building2, Globe, CheckCircle2, Clock, XCircle, Coffee
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'disponivel', label: 'Disponível', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'ocupado', label: 'Ocupado', icon: XCircle, color: 'text-red-500' },
  { value: 'ausente', label: 'Ausente', icon: Clock, color: 'text-yellow-500' },
  { value: 'em_pausa', label: 'Em pausa', icon: Coffee, color: 'text-muted-foreground' },
];

export default function ProfilePage() {
  const { profile, user, memberships, currentTenantId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch full profile with new fields
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

  // Password
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
      toast({ title: 'Perfil atualizado!' });
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

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase.from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);
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
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <h1 className="text-xl font-bold tracking-tight">Meu Perfil</h1>

      {/* Hero Card - Avatar + Status */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20" />
        <CardContent className="relative -mt-10 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            {/* Avatar */}
            <div className="relative group">
              <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                <AvatarImage src={avatarPreview || undefined} alt={name} />
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
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
            </div>

            {/* Name + Email + Status */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate">{name || profile?.name}</h2>
              <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                {currentStatus && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <currentStatus.icon className={`h-3 w-3 ${currentStatus.color}`} />
                    {currentStatus.label}
                  </Badge>
                )}
                {currentMembership && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {currentMembership.role?.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="h-4 w-4" /> Informações Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome completo</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" placeholder="Seu nome" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail</Label>
              <Input value={profile?.email || ''} disabled className="h-9 text-sm bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-9 text-sm" placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Globe className="h-3 w-3" /> Status</Label>
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
            <Label className="text-xs flex items-center gap-1"><Linkedin className="h-3 w-3" /> LinkedIn</Label>
            <Input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} className="h-9 text-sm" placeholder="https://linkedin.com/in/seu-perfil" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Bio</Label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} className="text-sm min-h-[80px] resize-none" placeholder="Conte um pouco sobre você..." maxLength={300} />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
          </div>

          <Button size="sm" className="gap-1.5" onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar Perfil
          </Button>
        </CardContent>
      </Card>

      {/* Organization Info */}
      {currentMembership && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Organização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block mb-0.5">Empresa</span>
                <p className="font-medium">{currentMembership.tenant_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Perfil de Acesso</span>
                <p className="font-medium capitalize">{currentMembership.role?.replace('_', ' ')}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Slug</span>
                <p className="font-medium">{currentMembership.tenant_slug}</p>
              </div>
            </div>
            {memberships.length > 1 && (
              <>
                <Separator className="my-3" />
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Todos os acessos</span>
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

      {/* Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Alterar Senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={e => { e.preventDefault(); updatePassword.mutate(); }} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nova senha</Label>
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
                <Label className="text-xs">Confirmar nova senha</Label>
                <Input
                  type="password" placeholder="Repita a nova senha"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  required minLength={6} className="h-9 text-sm"
                />
              </div>
            </div>
            <Button type="submit" size="sm" className="gap-1.5" disabled={updatePassword.isPending || !newPassword || !confirmPassword}>
              {updatePassword.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
              Alterar Senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
