import { useMemo } from 'react';
import { type PlannerTask, type PlannerBucket, type TaskAssignment } from '@/hooks/usePlanner';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, AlertTriangle, BarChart3, Users, Layers, Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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

  const byBucket = useMemo(() =>
    buckets.map(b => ({
      name: b.name,
      count: tasks.filter(t => t.bucket_id === b.id).length,
      completed: tasks.filter(t => t.bucket_id === b.id && t.completed_at).length,
    })),
  [buckets, tasks]);

  const byPriority = useMemo(() =>
    Object.entries(priorityConfig).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      color: cfg.color,
      count: tasks.filter(t => t.priority === key).length,
    })).filter(p => p.count > 0),
  [tasks]);

  const byAssignee = useMemo(() => {
    const map: Record<string, number> = {};
    assignments.forEach(a => { map[a.user_id] = (map[a.user_id] || 0) + 1; });
    const unassigned = tasks.filter(t => !assignments.some(a => a.task_id === t.id)).length;
    return { assigned: Object.entries(map).map(([id, count]) => ({ id, count })), unassigned };
  }, [tasks, assignments]);

  if (totalTasks === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Crie tarefas para ver os gráficos.
      </div>
    );
  }

  const statCards = [
    { label: 'Total', value: totalTasks, icon: Layers, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Concluídas', value: completedTasks, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Em andamento', value: inProgressTasks, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Atrasadas', value: overdueTasks, icon: AlertTriangle, color: overdueTasks > 0 ? 'text-destructive' : 'text-muted-foreground', bg: overdueTasks > 0 ? 'bg-destructive/10' : 'bg-muted' },
  ];

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Progress ring + bucket breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Overall progress */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold tracking-tight">Progresso Geral</h3>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${completionRate * 2.64} 264`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold">{completionRate}%</span>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Feitas</span>
                <span className="font-semibold text-green-500">{completedTasks}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Pendentes</span>
                <span className="font-semibold">{inProgressTasks}</span>
              </div>
              {overdueTasks > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Atrasadas</span>
                  <span className="font-semibold text-destructive">{overdueTasks}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* By Bucket */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold tracking-tight">Por Coluna</h3>
          </div>
          <div className="space-y-3">
            {byBucket.map(b => {
              const pct = b.count > 0 ? Math.round((b.completed / b.count) * 100) : 0;
              return (
                <div key={b.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium truncate">{b.name}</span>
                    <span className="text-muted-foreground">{b.completed}/{b.count}</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Priority + Assignees */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold tracking-tight">Por Prioridade</h3>
          </div>
          <div className="space-y-2.5">
            {byPriority.map(p => {
              const pct = totalTasks > 0 ? Math.round((p.count / totalTasks) * 100) : 0;
              return (
                <div key={p.key} className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-xs flex-1 font-medium">{p.label}</span>
                  <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                  </div>
                  <span className="text-xs font-bold w-6 text-right">{p.count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold tracking-tight">Distribuição</h3>
          </div>
          <div className="space-y-2.5">
            {byAssignee.assigned.slice(0, 8).map(a => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                  {a.id.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <Progress value={(a.count / totalTasks) * 100} className="h-1.5" />
                </div>
                <span className="text-xs font-bold">{a.count}</span>
              </div>
            ))}
            {byAssignee.unassigned > 0 && (
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] text-muted-foreground shrink-0">—</div>
                <span className="text-xs text-muted-foreground flex-1">Sem atribuição</span>
                <span className="text-xs font-bold">{byAssignee.unassigned}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
