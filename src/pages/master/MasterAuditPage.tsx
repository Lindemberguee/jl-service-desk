import { useMasterAuditLogs } from '@/hooks/useMasterAdmin';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollText, Search } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const actionColors: Record<string, string> = {
  'tenant.onboarded': 'bg-emerald-500/10 text-emerald-500',
  'tenant.deleted': 'bg-red-500/10 text-red-500',
  'subscription.updated': 'bg-blue-500/10 text-blue-500',
  'user.created': 'bg-violet-500/10 text-violet-500',
  'user.deleted': 'bg-red-500/10 text-red-500',
  'user.deactivated': 'bg-orange-500/10 text-orange-500',
  'user.reactivated': 'bg-emerald-500/10 text-emerald-500',
  'user.password_changed': 'bg-amber-500/10 text-amber-500',
};

const actionLabels: Record<string, string> = {
  'tenant.onboarded': 'Empresa criada',
  'tenant.deleted': 'Empresa excluída',
  'subscription.updated': 'Plano atualizado',
  'user.created': 'Usuário criado',
  'user.deleted': 'Usuário excluído',
  'user.deactivated': 'Usuário desativado',
  'user.reactivated': 'Usuário reativado',
  'user.password_changed': 'Senha alterada',
  'login': 'Login',
  'logout': 'Logout',
};

export default function MasterAuditPage() {
  const { data: logs = [], isLoading } = useMasterAuditLogs(200);
  const [search, setSearch] = useState('');

  const filtered = logs.filter((l: any) =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity?.toLowerCase().includes(search.toLowerCase()) ||
    JSON.stringify(l.diff || {}).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-blue-500" />
          Auditoria Global
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Últimos {logs.length} eventos de toda a plataforma
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar evento..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Carregando...</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Data</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Ação</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Entidade</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Empresa</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l: any) => (
                <tr key={l.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {l.created_at ? format(parseISO(l.created_at), "dd/MM HH:mm", { locale: ptBR }) : '—'}
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary" className={cn("text-[10px] font-medium", actionColors[l.action] || 'bg-muted')}>
                      {actionLabels[l.action] || l.action}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs font-mono text-muted-foreground">{l.entity}</td>
                  <td className="p-3 text-xs">{(l as any).tenants?.name || '—'}</td>
                  <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">
                    {l.diff ? JSON.stringify(l.diff).slice(0, 80) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum registro encontrado</p>
          )}
        </div>
      )}
    </div>
  );
}
