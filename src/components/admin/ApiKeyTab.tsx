import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { logAudit } from '@/lib/audit';
import { Plus, Copy, Trash2, Key, ExternalLink, Eye, EyeOff, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface ApiKeyTabProps {
  tenants: any[];
}

export default function ApiKeyTab({ tenants }: ApiKeyTabProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', tenant_id: '', permissions: ['read'] as string[] });

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ['admin_api_keys'],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)('tenant_api_keys')
        .select('*, tenants!inner(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: requestLogs = [] } = useQuery({
    queryKey: ['api_request_logs_summary'],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)('api_request_logs')
        .select('id, method, path, status_code, response_time_ms, created_at, api_key_id')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const generateKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const prefix = 'ofy_';
    let key = prefix;
    for (let i = 0; i < 40; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const hashKey = async (key: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const createApiKey = useMutation({
    mutationFn: async () => {
      const key = generateKey();
      const keyHash = await hashKey(key);
      const keyPrefix = key.substring(0, 8);

      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from as any)('tenant_api_keys').insert({
        tenant_id: form.tenant_id,
        name: form.name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        permissions: form.permissions,
        created_by: user?.id || null,
      });
      if (error) throw error;
      return key;
    },
    onSuccess: async (key) => {
      setNewKey(key);
      await logAudit({ entity: 'api_key', action: 'api_key.created', tenantId: form.tenant_id, diff: { name: form.name } });
      qc.invalidateQueries({ queryKey: ['admin_api_keys'] });
      toast({ title: 'API Key criada!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const deleteApiKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)('tenant_api_keys').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_api_keys'] });
      toast({ title: 'API Key removida!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const togglePermission = (perm: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  const apiBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;

  const [showLogs, setShowLogs] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">API Keys</CardTitle>
            <CardDescription className="text-xs">Gerencie chaves de acesso à API REST pública</CardDescription>
          </div>
          <Button size="sm" onClick={() => { setCreateOpen(true); setNewKey(null); setForm({ name: '', tenant_id: '', permissions: ['read'] }); }}>
            <Plus className="h-4 w-4 mr-1" />Nova API Key
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Prefixo</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead>Último uso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((k: any) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell><Badge variant="outline">{k.tenants?.name}</Badge></TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{k.key_prefix}...</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {k.permissions?.map((p: string) => (
                          <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {k.last_used_at ? format(new Date(k.last_used_at), 'dd/MM HH:mm') : 'Nunca'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={k.is_active ? 'default' : 'destructive'} className="text-[10px]">
                        {k.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteApiKey.mutate(k.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {apiKeys.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma API Key criada.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* API Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><ExternalLink className="h-4 w-4" />Documentação da API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Base URL</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs bg-muted px-3 py-1.5 rounded font-mono flex-1 break-all">{apiBaseUrl}</code>
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => { navigator.clipboard.writeText(apiBaseUrl); toast({ title: 'URL copiada!' }); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Documentação interativa</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs bg-muted px-3 py-1.5 rounded font-mono flex-1">GET {apiBaseUrl}/docs</code>
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => window.open(`${apiBaseUrl}/docs`, '_blank')}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" />Abrir
              </Button>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium">Exemplo de uso:</p>
            <pre className="text-[11px] text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">
{`curl -H "X-API-Key: ofy_sua_chave_aqui" \\
  ${apiBaseUrl}/work-orders?page=1&per_page=10`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Request Logs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" />Últimas Requisições</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowLogs(!showLogs)}>
            {showLogs ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {showLogs ? 'Ocultar' : 'Mostrar'}
          </Button>
        </CardHeader>
        {showLogs && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Método</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell><Badge variant="outline" className="text-[10px] font-mono">{log.method}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{log.path}</TableCell>
                    <TableCell>
                      <Badge variant={log.status_code < 400 ? 'default' : 'destructive'} className="text-[10px]">
                        {log.status_code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.response_time_ms}ms</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), 'dd/MM HH:mm:ss')}
                    </TableCell>
                  </TableRow>
                ))}
                {requestLogs.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma requisição registrada.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setNewKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Key className="h-5 w-5" />Nova API Key</DialogTitle>
            <DialogDescription>Crie uma chave para integração via API REST.</DialogDescription>
          </DialogHeader>

          {newKey ? (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-400 mb-2">⚠️ Copie sua chave agora!</p>
                <p className="text-xs text-muted-foreground mb-3">Esta chave só será exibida uma vez. Guarde-a em local seguro.</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-background px-3 py-2 rounded font-mono flex-1 break-all border">{newKey}</code>
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(newKey); toast({ title: 'Chave copiada!' }); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button className="w-full" onClick={() => { setCreateOpen(false); setNewKey(null); }}>Fechar</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da chave</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Integração ERP, App Mobile" />
              </div>
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select value={form.tenant_id} onValueChange={v => setForm(f => ({ ...f, tenant_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {tenants.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Permissões</Label>
                <div className="flex gap-4">
                  {['read', 'write', 'delete'].map(perm => (
                    <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={form.permissions.includes(perm)}
                        onCheckedChange={() => togglePermission(perm)}
                      />
                      <span className="capitalize">{perm === 'read' ? 'Leitura' : perm === 'write' ? 'Escrita' : 'Exclusão'}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!form.name || !form.tenant_id || form.permissions.length === 0 || createApiKey.isPending}
                onClick={() => createApiKey.mutate()}
              >
                {createApiKey.isPending ? 'Gerando...' : 'Gerar API Key'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
