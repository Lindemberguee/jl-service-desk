import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserPlus, Users, Loader2, Eye, Pencil } from 'lucide-react';
import { useNoteShares } from '@/hooks/useNoteShares';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface NoteShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string | null;
  noteTitle: string;
}

export default function NoteShareDialog({ open, onOpenChange, noteId, noteTitle }: NoteShareDialogProps) {
  const { shares, loading, tenantUsers, addShare, updatePermission, removeShare } = useNoteShares(noteId);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<'view' | 'edit'>('view');

  const availableUsers = tenantUsers.filter(u => !shares.some(s => s.shared_with_user_id === u.id));

  const handleAdd = async () => {
    if (!selectedUser) return;
    await addShare(selectedUser, selectedPermission);
    setSelectedUser('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Compartilhar nota
          </DialogTitle>
          <p className="text-xs text-muted-foreground truncate">{noteTitle}</p>
        </DialogHeader>

        {/* Add user */}
        <div className="flex items-center gap-2">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue placeholder="Selecionar usuário..." />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.map(u => (
                <SelectItem key={u.id} value={u.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={u.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">{u.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{u.name}</span>
                  </div>
                </SelectItem>
              ))}
              {availableUsers.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">Nenhum usuário disponível</div>
              )}
            </SelectContent>
          </Select>

          <Select value={selectedPermission} onValueChange={(v) => setSelectedPermission(v as 'view' | 'edit')}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="view" className="text-xs">
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Visualizar</span>
              </SelectItem>
              <SelectItem value="edit" className="text-xs">
                <span className="flex items-center gap-1"><Pencil className="h-3 w-3" /> Editar</span>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" onClick={handleAdd} disabled={!selectedUser} className="h-8 gap-1">
            <UserPlus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Shares list */}
        <ScrollArea className="max-h-60">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : shares.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum compartilhamento</p>
          ) : (
            <div className="space-y-2">
              {shares.map(share => (
                <div key={share.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={share.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">{share.profile?.name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{share.profile?.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{share.profile?.email}</p>
                  </div>
                  <Select
                    value={share.permission}
                    onValueChange={(v) => updatePermission(share.id, v as 'view' | 'edit')}
                  >
                    <SelectTrigger className="w-24 h-7 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view" className="text-xs">Visualizar</SelectItem>
                      <SelectItem value="edit" className="text-xs">Editar</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeShare(share.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
