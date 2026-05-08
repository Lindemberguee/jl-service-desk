import { useMemo } from 'react';
import { type PlannerTask, type PlannerBucket, type TaskAssignment } from '@/hooks/usePlanner';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Users, 
  Layers, 
  Zap, 
  TrendingUp, 
  PieChart, 
  Activity,
  Calendar,
  BarChart2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart as RePieChart,
  Pie,
  Legend
} from 'recharts';

interface Props {
  buckets: PlannerBucket[];
  tasks: PlannerTask[];
  assignments: TaskAssignment[];
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgente', color: 'hsl(0, 72%, 51%)' },
  high: { label: 'Alta', color: 'hsl(25, 95%, 53%)' },
  medium: { label: 'Média', color: 'hsl(217, 91%, 60%)' },
  low: { label: 'Baixa', color: 'hsl(215, 14%, 67%)' },
};

export function PlannerCharts({ buckets, tasks, assignments }: Props) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed_at).length;
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !t.completed_at).length;
  const inProgressTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const bucketData = useMemo(() =>
    buckets.map(b => ({
      name: b.name,
      total: tasks.filter(t => t.bucket_id === b.id).length,
      completed: tasks.filter(t => t.bucket_id === b.id && t.completed_at).length,
      pending: tasks.filter(t => t.bucket_id === b.id && !t.completed_at).length,
    })).filter(d => d.total > 0),
  [buckets, tasks]);

  const priorityData = useMemo(() =>
    Object.entries(priorityConfig).map(([key, cfg]) => ({
      name: cfg.label,
      value: tasks.filter(t => t.priority === key).length,
      color: cfg.color,
    })).filter(p => p.value > 0),
  [tasks]);

  const statusData = useMemo(() => [
    { name: 'Concluídas', value: completedTasks, color: '#10b981' },
    { name: 'Em Aberto', value: inProgressTasks, color: '#3b82f6' },
    { name: 'Atrasadas', value: overdueTasks, color: '#ef4444' },
  ].filter(d => d.value > 0), [completedTasks, inProgressTasks, overdueTasks]);

  if (totalTasks === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-3">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Activity className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium">Crie tarefas para visualizar as métricas de desempenho.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full bg-muted/5">
      {/* Header Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Tarefas', value: totalTasks, icon: Layers, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Conclusão', value: `${completionRate}%`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Em Execução', value: inProgressTasks, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Atrasos Críticos', value: overdueTasks, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={cn("p-2 rounded-xl", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Status */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Distribuição por Status</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Carga por Coluna */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Carga por Coluna</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bucketData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={100}
                  style={{ fontSize: '12px', fontWeight: 500 }}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="pending" name="Pendente" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="completed" name="Concluída" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Análise de Prioridade */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-6">
            <Zap className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Volume por Prioridade</h3>
          </div>
          <div className="space-y-4">
            {priorityData.map((p) => {
              const pct = totalTasks > 0 ? Math.round((p.value / totalTasks) * 100) : 0;
              return (
                <div key={p.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                    <span>{p.value} tarefas ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Resumo de Operação */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Resumo de Operação</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Colaboração</span>
              </div>
              <p className="text-xl font-bold">{assignments.length}</p>
              <p className="text-[11px] text-muted-foreground">Atribuições ativas</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Prazos</span>
              </div>
              <p className="text-xl font-bold">{tasks.filter(t => t.due_date).length}</p>
              <p className="text-[11px] text-muted-foreground">Com data definida</p>
            </div>
          </div>
          <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-xs font-medium text-primary leading-relaxed">
              Dica: Foque nas <span className="font-bold underline">tarefas atrasadas</span> para manter o cronograma do projeto saudável e evitar gargalos nas próximas colunas.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
