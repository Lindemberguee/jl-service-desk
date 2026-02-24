import { useTenantQuery } from '@/hooks/useTenantQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { statusLabels, priorityLabels } from '@/lib/permissions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(262, 60%, 55%)', 'hsl(38, 92%, 50%)', 'hsl(142, 71%, 45%)', 'hsl(0, 72%, 51%)', 'hsl(199, 89%, 48%)'];

export default function Reports() {
  const { data: workOrders = [] } = useTenantQuery<any>('work_orders', 'work_orders');

  const statusData = Object.entries(statusLabels).map(([key, label]) => ({
    name: label,
    value: workOrders.filter((wo: any) => wo.status === key).length,
  })).filter(d => d.value > 0);

  const priorityData = Object.entries(priorityLabels).map(([key, label]) => ({
    name: label,
    value: workOrders.filter((wo: any) => wo.priority === key).length,
  })).filter(d => d.value > 0);

  const total = workOrders.length;
  const resolved = workOrders.filter((wo: any) => ['concluida', 'aprovada', 'encerrada'].includes(wo.status)).length;
  const overdue = workOrders.filter((wo: any) => wo.resolve_due_at && new Date(wo.resolve_due_at) < new Date() && !['encerrada', 'concluida', 'aprovada'].includes(wo.status)).length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Total de OS</p>
            <p className="text-3xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Resolvidas</p>
            <p className="text-3xl font-bold text-green-500">{resolved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">SLA Atrasadas</p>
            <p className="text-3xl font-bold text-destructive">{overdue}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="volume">
        <TabsList>
          <TabsTrigger value="volume">Volume por Status</TabsTrigger>
          <TabsTrigger value="priority">Por Prioridade</TabsTrigger>
        </TabsList>
        <TabsContent value="volume">
          <Card>
            <CardHeader><CardTitle className="text-lg">Distribuição por Status</CardTitle></CardHeader>
            <CardContent>
              {statusData.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">Sem dados para exibir.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="priority">
          <Card>
            <CardHeader><CardTitle className="text-lg">Distribuição por Prioridade</CardTitle></CardHeader>
            <CardContent>
              {priorityData.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">Sem dados para exibir.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={priorityData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {priorityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
