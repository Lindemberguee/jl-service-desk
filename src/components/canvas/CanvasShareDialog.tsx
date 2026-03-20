import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Share2, Trash2, Users, Loader2, Eye, Pencil, Globe, Copy, Link2Off, Check, Search, ShieldCheck, UserPlus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

interface Share {
  id: string;
  shared_with_user_id: string;
  permission: 'view' | 'edit';
  profile?: { name: string; email: string };
}

interface TenantUser {
  user_id: string;
  name: string;
  email: string;
}

interface CanvasShareDialogProps {
  boardId: string;
  boardName: string;
  isOwner: boolean;
}

export default function CanvasShareDialog({ boardId, boardName, isOwner }: CanvasShareDialogProps) {
  const { user, currentTenantId } = useAuth();
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<Share[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedPerm, setSelectedPerm] = useState<'view' | 'edit'>('view');
  const [loading, setLoading] = useState(false);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (!open || !currentTenantId) return;
    loadShares();
    loadTenantUsers();
    loadPublicToken();
  }, [open, boardId, currentTenantId]);

  const loadPublicToken = async () => {
    const { data } = await supabase
      .from('canvas_boards')
      .select('public_share_token')
      .eq('id', boardId)
      .single();
    setPublicToken(data?.public_share_token || null);
  };

  const generatePublicLink = async () => {
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    const { error } = await supabase
      .from('canvas_boards')
      .update({ public_share_token: token } as any)
      .eq('id', boardId);
    if (error) {
      toast.error('Erro ao gerar link público');
    } else {
      setPublicToken(token);
      toast.success('Link público gerado!');
    }
  };

  const removePublicLink = async () => {
    const { error } = await supabase
      .from('canvas_boards')
      .update({ public_share_token: null } as any)
      .eq('id', boardId);
    if (error) {
      toast.error('Erro ao remover link');
    } else {
      setPublicToken(null);
      toast.success('Link público removido');
    }
  };

  const copyPublicLink = () => {
    const url = `${window.location.origin}/canvas/public?token=${publicToken}`;
    navigator.clipboard.writeText(url);
    setCopiedPublic(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedPublic(false), 2000);
  };

  const loadShares = async () => {
    const { data } = await supabase
      .from('canvas_board_shares')
      .select('id, shared_with_user_id, permission')
      .eq('board_id', boardId);

    if (data && data.length > 0) {
      const userIds = data.map((s) => s.shared_with_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      setShares(data.map((s) => ({
        ...s,
        permission: s.permission as 'view' | 'edit',
        profile: profileMap.get(s.shared_with_user_id) as any,
      })));
    } else {
      setShares([]);
    }
  };

  const loadTenantUsers = async () => {
    if (!currentTenantId) return;
    const { data } = await supabase
      .from('user_memberships')
      .select('user_id')
      .eq('tenant_id', currentTenantId)
      .eq('is_active', true);

    if (data) {
      const userIds = data.map((m) => m.user_id).filter((id) => id !== user?.id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds)
          .eq('is_active', true);

        setTenantUsers((profiles || []).map((p) => ({
          user_id: p.id,
          name: p.name,
          email: p.email,
        })));
      }
    }
  };

  const addShare = async () => {
    if (!selectedUser || !user || !currentTenantId) return;
    setLoading(true);
    const { error } = await supabase.from('canvas_board_shares').insert({
      board_id: boardId,
      shared_with_user_id: selectedUser,
      permission: selectedPerm,
      shared_by: user.id,
      tenant_id: currentTenantId,
    });

    if (error) {
      if (error.code === '23505') toast.info('Usuário já tem acesso');
      else toast.error('Erro ao compartilhar');
    } else {
      toast.success('Canvas compartilhado!');
      setSelectedUser('');
      await loadShares();
    }
    setLoading(false);
  };

  const updatePermission = async (shareId: string, permission: 'view' | 'edit') => {
    const { error } = await supabase.from('canvas_board_shares').update({ permission }).eq('id', shareId);
    if (error) toast.error('Erro ao atualizar');
    else await loadShares();
  };

  const removeShare = async (shareId: string) => {
    const { error } = await supabase.from('canvas_board_shares').delete().eq('id', shareId);
    if (error) toast.error('Erro ao remover');
    else {
      toast.success('Acesso removido');
      await loadShares();
    }
  };

  const availableUsers = useMemo(() => {
    const normalized = userSearch.trim().toLowerCase();
    return tenantUsers
      .filter((u) => !shares.find((s) => s.shared_with_user_id === u.user_id))
      .filter((u) => {
        if (!normalized) return true;
        return [u.name, u.email].some((value) => value.toLowerCase().includes(normalized));
      });
  }, [tenantUsers, shares, userSearch]);

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" title="Compartilhar">
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-3xl border-border/70">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Compartilhar “{boardName}”
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            {isOwner && (
              <div className="rounded-2xl border border-border/70 bg-background/60 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Governança do board</p>
                    <p className="text-xs text-muted-foreground">Defina acesso interno e controle a exposição pública em um só lugar.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-card px-3 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Link público</span>
                    <Badge variant="outline" className="rounded-full text-[10px]">somente visualização</Badge>
                  </div>
                  {publicToken ? (
                    <div className="space-y-2">
                      <Input
                        readOnly
                        value={`${window.location.origin}/canvas/public?token=${publicToken}`}
                        className="text-xs h-9 font-mono rounded-xl"
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={copyPublicLink}>
                          {copiedPublic ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                          Copiar link
                        </Button>
                        <Button variant="ghost" size="sm" className="rounded-xl gap-1.5 text-destructive" onClick={removePublicLink}>
                          <Link2Off className="h-3.5 w-3.5" /> Remover
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={generatePublicLink}>
                      <Globe className="h-3.5 w-3.5" /> Gerar link público
                    </Button>
                  )}
                </div>
              </div>
            )}

            {isOwner && (
              <div className="rounded-2xl border border-border/70 bg-background/60 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Convidar colaboradores</p>
                    <p className="text-xs text-muted-foreground">Compartilhe com membros do tenant e defina o nível de acesso.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Buscar colaborador por nome ou e-mail..."
                        className="h-9 pl-9 rounded-xl"
                      />
                    </div>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="h-9 text-sm rounded-xl">
                        <SelectValue placeholder="Selecione um usuário..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum usuário disponível</div>
                        ) : (
                          availableUsers.map((u) => (
                            <SelectItem key={u.user_id} value={u.user_id}>
                              <span className="text-sm">{u.name}</span>
                              <span className="text-xs text-muted-foreground ml-1">({u.email})</span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Select value={selectedPerm} onValueChange={(v) => setSelectedPerm(v as 'view' | 'edit')}>
                    <SelectTrigger className="h-9 text-sm rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">Visualizar</SelectItem>
                      <SelectItem value="edit">Editar</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={addShare} disabled={!selectedUser || loading} className="h-9 rounded-xl">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border/70 bg-background/60 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Pessoas com acesso</p>
                  <p className="text-xs text-muted-foreground">Gerencie visualizadores, editores e revise quem participa deste canvas.</p>
                </div>
                <Badge variant="secondary" className="rounded-full">{shares.length}</Badge>
              </div>

              <div className="space-y-2">
                {shares.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                    <Sparkles className="mx-auto h-5 w-5 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum compartilhamento ativo ainda.</p>
                  </div>
                ) : (
                  shares.map((share) => (
                    <div key={share.id} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(share.profile?.name || '?')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{share.profile?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{share.profile?.email}</p>
                      </div>
                      {isOwner ? (
                        <div className="flex items-center gap-2">
                          <Select value={share.permission} onValueChange={(v) => updatePermission(share.id, v as 'view' | 'edit')}>
                            <SelectTrigger className="w-32 h-8 text-xs rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view">Visualizar</SelectItem>
                              <SelectItem value="edit">Editar</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive" onClick={() => removeShare(share.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs rounded-full">
                          {share.permission === 'edit' ? <><Pencil className="h-3 w-3 mr-1" /> Editor</> : <><Eye className="h-3 w-3 mr-1" /> Visualizador</>}
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4 space-y-3">
              <p className="text-sm font-semibold">Resumo de acesso</p>
              <div className="grid grid-cols-1 gap-2">
                <AccessMiniCard label="Editores" value={shares.filter((s) => s.permission === 'edit').length} helper="Podem colaborar e alterar o board" />
                <AccessMiniCard label="Visualizadores" value={shares.filter((s) => s.permission === 'view').length} helper="Apenas leitura e consulta" />
                <AccessMiniCard label="Link público" value={publicToken ? 'Ativo' : 'Inativo'} helper="Exposição externa do canvas" />
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/60 p-4 space-y-2">
              <p className="text-sm font-semibold">Boas práticas</p>
              <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                <li>Use “Visualizar” para stakeholders que não precisam editar o fluxo.</li>
                <li>Reserve “Editar” para responsáveis diretos pelo board.</li>
                <li>Ative link público apenas quando houver real necessidade externa.</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AccessMiniCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{helper}</p>
    </div>
  );
}
