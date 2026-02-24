import { useAuth } from '@/contexts/AuthContext';
import { useTenantQuery } from '@/hooks/useTenantQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { roleLabels } from '@/lib/permissions';
import { Users, Shield } from 'lucide-react';

export default function UsersPage() {
  const { data: memberships = [], isLoading } = useTenantQuery<any>(
    'user_memberships', 'user_memberships',
    { select: '*, profiles!inner(name, email)' }
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Usuários do Tenant</h1>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : memberships.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="mx-auto h-10 w-10 mb-2 opacity-50" />
              <p>Nenhum membro encontrado.</p>
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
                    <TableCell>{m.profiles?.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
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
