import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Loader2, Eye, EyeOff, User, Save, Shield } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

export default function PortalProfile() {
  const { profile, user, memberships, currentTenantId } = useAuth();
  const { toast } = useToast();

  // Profile edit
  const [name, setName] = useState(profile?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const currentMembership = memberships.find(m => m.tenant_id === currentTenantId);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { error } = await supabase.from('profiles').update({ name }).eq('id', user!.id);
      if (error) throw error;
      toast({ title: 'Perfil atualizado!' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Erro', description: 'Mínimo 6 caracteres.', variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Senha alterada com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold">Meu Perfil</h1>

      {/* Profile info */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="h-4 w-4" /> Dados Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary">
              {profile?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="font-medium text-sm">{profile?.name}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">E-mail</Label>
            <Input value={profile?.email || ''} disabled className="h-9 text-sm bg-muted" />
          </div>

          <Button size="sm" className="gap-1.5" onClick={handleSaveProfile} disabled={savingProfile || name === profile?.name}>
            {savingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar
          </Button>
        </CardContent>
      </Card>

      {/* Membership info */}
      {currentMembership && (
        <Card className="border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" /> Acesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Organização</span>
                <p className="font-medium">{currentMembership.tenant_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Perfil de acesso</span>
                <p className="font-medium capitalize">{currentMembership.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Password */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Alterar Senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nova senha</Label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-9 text-sm"
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
                type="password"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="h-9 text-sm"
              />
            </div>
            <Button type="submit" size="sm" disabled={savingPassword || !newPassword || !confirmPassword}>
              {savingPassword && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Alterar Senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
