import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type AuditLog = {
  id: string;
  created_at: string;
  entity: string;
  action: string;
};

interface AuditActivityChartProps {
  logs: AuditLog[];
  days?: number;
}

export default function AuditActivityChart({ logs, days = 14 }: AuditActivityChartProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const buckets: Record<string, { date: string; label: string; auth: number; operations: number }> = {};

    for (let i = days - 1; i >= 0; i--) {
      const d = startOfDay(subDays(now, i));
      const key = format(d, 'yyyy-MM-dd');
      buckets[key] = {
        date: key,
        label: format(d, 'dd/MM', { locale: ptBR }),
        auth: 0,
        operations: 0,
      };
    }

    for (const log of logs) {
      const key = log.created_at.slice(0, 10);
      if (buckets[key]) {
        if (log.entity === 'auth') {
          buckets[key].auth++;
        } else {
          buckets[key].operations++;
        }
      }
    }

    return Object.values(buckets);
  }, [logs, days]);

  return (
    <Card className="border-border shadow-none rounded-xl">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Atividade dos últimos {days} dias</p>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} width={30} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                labelFormatter={(label) => `Dia ${label}`}
              />
              <Bar dataKey="auth" name="Autenticação" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="operations" name="Operações" fill="hsl(var(--primary) / 0.4)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
