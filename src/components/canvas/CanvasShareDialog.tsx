import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Share2, Trash2, Users, Loader2, Eye, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

  useEffect(() => {
    if (!open || !currentTenantId) return;
    loadShares();
    loadTenantUsers();
  }, [open, boardId, currentTenantId]);

  const loadShares = async () => {
    const { data } = await supabase
      .from('canvas_board_shares')
      .select('id, shared_with_user_id, permission')
      .eq('board_id', boardId);

    if (data && data.length > 0) {
      const userIds = data.map(s => s.shared_with_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      setShares(data.map(s => ({
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
      const userIds = data.map(m => m.user_id).filter(id => id !== user?.id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds)
          .eq('is_active', true);

        setTenantUsers((profiles || []).map(p => ({
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
    const { error } = await supabase
      .from('canvas_board_shares')
      .update({ permission })
      .eq('id', shareId);

    if (error) toast.error('Erro ao atualizar');
    else await loadShares();
  };

  const removeShare = async (shareId: string) => {
    const { error } = await supabase
      .from('canvas_board_shares')
      .delete()
      .eq('id', shareId);

    if (error) toast.error('Erro ao remover');
    else {
      toast.success('Acesso removido');
      await loadShares();
    }
  };

  const availableUsers = tenantUsers.filter(
    u => !shares.find(s => s.shared_with_user_id === u.user_id)
  );

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Compartilhar">
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Compartilhar "{boardName}"
          </DialogTitle>
        </DialogHeader>

        {isOwner && (
          <div className="flex items-center gap-2">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="flex-1 h-9 text-sm">
                <SelectValue placeholder="Selecione um usuário..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Nenhum usuário disponível
                  </div>
                ) : (
                  availableUsers.map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      <span className="text-sm">{u.name}</span>
                      <span className="text-xs text-muted-foreground ml-1">({u.email})</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Select value={selectedPerm} onValueChange={(v) => setSelectedPerm(v as 'view' | 'edit')}>
              <SelectTrigger className="w-28 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">Visualizar</SelectItem>
                <SelectItem value="edit">Editar</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={addShare} disabled={!selectedUser || loading} className="h-9">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            </Button>
          </div>
        )}

        <div className="space-y-2 mt-2">
          {shares.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum compartilhamento ainda
            </p>
          ) : (
            shares.map(share => (
              <div key={share.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(share.profile?.name || '?')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{share.profile?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{share.profile?.email}</p>
                </div>
                {isOwner ? (
                  <>
                    <Select
                      value={share.permission}
                      onValueChange={(v) => updatePermission(share.id, v as 'view' | 'edit')}
                    >
                      <SelectTrigger className="w-28 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">Visualizar</SelectItem>
                        <SelectItem value="edit">Editar</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => removeShare(share.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    {share.permission === 'edit' ? (
                      <><Pencil className="h-3 w-3 mr-1" /> Editor</>
                    ) : (
                      <><Eye className="h-3 w-3 mr-1" /> Visualizador</>
                    )}
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
