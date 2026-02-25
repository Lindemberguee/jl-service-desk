import { useState } from 'react';
import { logAudit } from '@/lib/audit';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Lock, Save, Loader2 } from 'lucide-react';

export default function TechProfile() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [name, setName] = useState(profile?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles').update({ name }).eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: async () => { await logAudit({ entity: 'user', entityId: user?.id, action: 'user.profile_updated', diff: { name } }); qc.invalidateQueries({ queryKey: ['profiles_list'] }); toast({ title: 'Perfil atualizado!' }); },
  });

  const updatePassword = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: async () => { await logAudit({ entity: 'user', entityId: user?.id, action: 'user.self_password_changed', diff: { changed_by: 'self' } }); setCurrentPassword(''); setNewPassword(''); toast({ title: 'Senha alterada!' }); },
    onError: (err: any) => { toast({ title: 'Erro', description: err.message, variant: 'destructive' }); },
  });

  return (
    <div className="space-y-5 max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight">Meu Perfil</h1>

      <Card className="border-border shadow-none">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4" /> Dados Pessoais</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label className="text-xs">Nome</Label><Input value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" /></div>
          <div><Label className="text-xs">E-mail</Label><Input value={profile?.email || ''} disabled className="h-9 text-sm bg-muted" /></div>
          <Button size="sm" className="h-9 gap-1.5" onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border shadow-none">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Lock className="h-4 w-4" /> Alterar Senha</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label className="text-xs">Nova senha</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-9 text-sm" /></div>
          <Button size="sm" className="h-9 gap-1.5" onClick={() => updatePassword.mutate()} disabled={!newPassword || newPassword.length < 6 || updatePassword.isPending}>
            {updatePassword.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />} Alterar Senha
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
