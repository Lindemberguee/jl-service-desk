import { useState } from 'react';
import { useVault } from '@/hooks/useVault';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Shield, Eye, EyeOff, Copy, Search, Trash2, Edit, Globe, Key, Lock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { useModuleCategories } from '@/hooks/useModuleCategories';
import { CategoryManager } from './CategoryManager';

interface VaultFormData {
  title: string; service_name: string; url: string;
  username: string; password: string; notes: string;
  category: string; tags: string;
}

const emptyForm: VaultFormData = { title: '', service_name: '', url: '', username: '', password: '', notes: '', category: 'Geral', tags: '' };

export function VaultManager() {
  const { listQuery, decryptEntry, createEntry, updateEntry, deleteEntry } = useVault();
  const { currentRole, rolePermissions } = useAuth();
  const { categories: VAULT_CATEGORIES } = useModuleCategories('vault');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<VaultFormData>(emptyForm);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, { username: string; password: string; notes: string }>>({});
  const [loadingReveal, setLoadingReveal] = useState<string | null>(null);

  const canManage = currentRole && hasPermission(currentRole, 'vault:manage' as any, undefined, rolePermissions);
  const entries = listQuery.data || [];
  const filtered = entries.filter((e: any) => {
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.service_name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === 'all' || e.category === filterCategory;
    return matchSearch && matchCat;
  });

  const handleReveal = async (entryId: string) => {
    if (revealedPasswords[entryId]) {
      setRevealedPasswords(prev => { const n = { ...prev }; delete n[entryId]; return n; });
      return;
    }
    setLoadingReveal(entryId);
    try {
      const decrypted = await decryptEntry(entryId);
      setRevealedPasswords(prev => ({ ...prev, [entryId]: { username: decrypted.username, password: decrypted.password, notes: decrypted.notes } }));
    } catch {
      toast({ title: 'Erro ao descriptografar', variant: 'destructive' });
    } finally {
      setLoadingReveal(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado(a)` });
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: 'Preencha o título', variant: 'destructive' }); return; }
    const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (editId) {
      await updateEntry.mutateAsync({ entry_id: editId, ...form, tags });
    } else {
      await createEntry.mutateAsync({ ...form, tags });
    }
    setFormOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const handleEdit = async (entry: any) => {
    setLoadingReveal(entry.id);
    try {
      const decrypted = await decryptEntry(entry.id);
      setForm({
        title: entry.title, service_name: entry.service_name || '', url: entry.url || '',
        username: decrypted.username, password: decrypted.password, notes: decrypted.notes,
        category: entry.category || 'Geral', tags: (entry.tags || []).join(', '),
      });
      setEditId(entry.id);
      setFormOpen(true);
    } catch {
      toast({ title: 'Erro ao carregar credencial', variant: 'destructive' });
    } finally {
      setLoadingReveal(null);
    }
  };

  if (listQuery.isLoading) {
    return <div className="grid gap-4 md:grid-cols-2">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
        <Lock className="h-5 w-5 text-primary" />
        <div className="text-sm">
          <p className="font-medium">Criptografia AES-256-GCM</p>
          <p className="text-muted-foreground text-xs">Todas as credenciais são criptografadas no servidor. Acessos são registrados em log de auditoria.</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar credenciais..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {VAULT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {canManage && <CategoryManager module="vault" label="Cofre" />}
          {canManage && (
            <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Credencial</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>{editId ? 'Editar Credencial' : 'Nova Credencial'}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Título *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="mt-1" placeholder="Ex: Servidor de Produção" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Serviço</Label><Input value={form.service_name} onChange={e => setForm(p => ({ ...p, service_name: e.target.value }))} className="mt-1" placeholder="Ex: SSH, RDP" /></div>
                    <div><Label>Categoria</Label>
                      <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{VAULT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>URL</Label>
                    <Input
                      value={form.url}
                      onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                      onBlur={() => {
                        if (form.url && !/^https?:\/\//i.test(form.url) && !/^\\\\/.test(form.url)) {
                          setForm(p => ({ ...p, url: 'https://' + p.url }));
                        }
                      }}
                      onFocus={() => {
                        if (!form.url) setForm(p => ({ ...p, url: 'https://' }));
                      }}
                      className="mt-1"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Usuário</Label><Input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} className="mt-1" autoComplete="off" /></div>
                    <div><Label>Senha</Label><Input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="mt-1" autoComplete="new-password" /></div>
                  </div>
                  <div><Label>Notas</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="mt-1" rows={2} placeholder="Informações adicionais..." /></div>
                  <div><Label>Tags (separadas por vírgula)</Label><Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} className="mt-1" /></div>
                  <Button onClick={handleSave} disabled={createEntry.isPending || updateEntry.isPending} className="w-full">
                    {createEntry.isPending || updateEntry.isPending ? 'Salvando...' : editId ? 'Atualizar' : 'Salvar com Segurança'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats */}
      <p className="text-sm text-muted-foreground">{filtered.length} credencial(is) armazenada(s)</p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Nenhuma credencial cadastrada</p>
          {canManage && <Button variant="outline" className="mt-4" onClick={() => setFormOpen(true)}>Adicionar primeira credencial</Button>}
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((entry: any) => {
            const revealed = revealedPasswords[entry.id];
            const isRevealing = loadingReveal === entry.id;
            return (
              <Card key={entry.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Key className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{entry.title}</h3>
                        <p className="text-xs text-muted-foreground">{entry.service_name || entry.category}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{entry.category}</Badge>
                  </div>

                  {entry.url && (
                    <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      <a href={entry.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary truncate">{entry.url}</a>
                    </div>
                  )}

                  {/* Revealed secrets */}
                  {revealed && (
                    <div className="mt-3 space-y-2 p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Usuário:</span>
                        <div className="flex items-center gap-1">
                          <code className="text-xs bg-background px-2 py-0.5 rounded">{revealed.username || '—'}</code>
                          {revealed.username && <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => copyToClipboard(revealed.username, 'Usuário')}><Copy className="h-3 w-3" /></Button>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Senha:</span>
                        <div className="flex items-center gap-1">
                          <code className="text-xs bg-background px-2 py-0.5 rounded">{revealed.password || '—'}</code>
                          {revealed.password && <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => copyToClipboard(revealed.password, 'Senha')}><Copy className="h-3 w-3" /></Button>}
                        </div>
                      </div>
                      {revealed.notes && (
                        <div><span className="text-xs text-muted-foreground">Notas:</span><p className="text-xs mt-0.5">{revealed.notes}</p></div>
                      )}
                    </div>
                  )}

                  {entry.tags?.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {entry.tags.map((t: string) => <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>)}
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-3 text-[10px] text-muted-foreground">
                    {entry.last_rotated_at && (
                      <><RefreshCw className="h-3 w-3" /> Rotação: {format(new Date(entry.last_rotated_at), 'dd/MM/yy', { locale: ptBR })} •</>
                    )}
                    Criado: {format(new Date(entry.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </div>

                  <div className="flex gap-1 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={() => handleReveal(entry.id)} disabled={isRevealing}>
                      {isRevealing ? <RefreshCw className="h-3 w-3 animate-spin" /> : revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {revealed ? 'Ocultar' : 'Revelar'}
                    </Button>
                    {canManage && (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleEdit(entry)} disabled={isRevealing}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => deleteEntry.mutate(entry.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
