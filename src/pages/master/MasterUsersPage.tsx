import { useMasterAllUsers } from '@/hooks/useMasterAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Search, Shield, Building2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin', admin: 'Admin', coordenador: 'Coordenador',
  tecnico: 'Técnico', analista: 'Analista', solicitante: 'Solicitante', leitura: 'Leitura',
};
const roleColors: Record<string, string> = {
  super_admin: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  admin: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  coordenador: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  tecnico: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  analista: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  solicitante: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  leitura: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function MasterUsersPage() {
  const { data: users = [], isLoading } = useMasterAllUsers();
  const [search, setSearch] = useState('');

  const filtered = users.filter((u: any) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalActive = users.filter((u: any) => u.is_active).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-violet-500" />
          Usuários Globais
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {users.length} usuários cadastrados · {totalActive} ativos
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Carregando...</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Usuário</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Departamentos</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u: any) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-3">
                    <div>
                      <p className="font-medium text-sm">{u.name || '—'}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {u.memberships?.length > 0 ? u.memberships.map((m: any, i: number) => (
                        <div key={i} className="flex items-center gap-1">
                          <Badge variant="outline" className={cn("text-[10px]", roleColors[m.role])}>
                            {roleLabels[m.role] || m.role}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">@ {m.tenant_name}</span>
                        </div>
                      )) : (
                        <span className="text-xs text-muted-foreground">Sem vínculo</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className={cn("text-[10px]", u.is_active ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>
                      {u.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {u.created_at ? format(parseISO(u.created_at), "dd/MM/yy", { locale: ptBR }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum usuário encontrado</p>
          )}
        </div>
      )}
    </div>
  );
}
