import { useAuth } from '@/contexts/AuthContext';
import { useTenantQuery } from '@/hooks/useTenantQuery';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { roleLabels, hasPermission } from '@/lib/permissions';
import { Users, Shield, Lock } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function UsersPage() {
  const { currentRole } = useAuth();
  const isMobile = useIsMobile();
  const canManage = currentRole && hasPermission(currentRole, 'users:manage');

  const { data: memberships = [], isLoading } = useTenantQuery<any>(
    'user_memberships', 'user_memberships',
    { select: '*, profiles!inner(name, email)' }
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive' as const;
      case 'admin': return 'default' as const;
      case 'coordenador': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Equipe do Departamento</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {canManage
            ? 'Gerencie os membros do departamento.'
            : 'Visualize os membros da sua equipe. Para alterações, entre em contato com o administrador.'}
        </p>
      </div>

      {!canManage && (
        <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-md p-3 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          Somente administradores podem gerenciar usuários e acessos.
        </div>
      )}

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : memberships.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="mx-auto h-10 w-10 mb-2 opacity-50" />
              <p>Nenhum membro encontrado.</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-2">
              {memberships.map((m: any) => (
                <div key={m.id} className="border border-border rounded-md p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{m.profiles?.name || '-'}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.profiles?.email || '-'}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant={getRoleBadgeVariant(m.role)} className="text-[10px] gap-1">
                        <Shield className="h-2.5 w-2.5" />
                        {roleLabels[m.role as keyof typeof roleLabels] || m.role}
                      </Badge>
                      <Badge variant={m.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {m.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.profiles?.name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{m.profiles?.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(m.role)} className="gap-1">
                        <Shield className="h-3 w-3" />
                        {roleLabels[m.role as keyof typeof roleLabels] || m.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.is_active ? 'default' : 'secondary'}>
                        {m.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
