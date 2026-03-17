import { useMemo } from 'react';
import { type PlannerTask, type PlannerBucket, type TaskAssignment } from '@/hooks/usePlanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, AlertTriangle, BarChart3, Users, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto h-full">
      {/* Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Resumo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold">{totalTasks}</div>
              <div className="text-[10px] text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{completedTasks}</div>
              <div className="text-[10px] text-muted-foreground">Concluídas</div>
            </div>
            <div className="text-center">
              <div className={cn("text-2xl font-bold", overdueTasks > 0 ? "text-destructive" : "text-muted-foreground")}>{overdueTasks}</div>
              <div className="text-[10px] text-muted-foreground">Atrasadas</div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* By Bucket */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Por Coluna</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>

      {/* By Priority */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /> Por Prioridade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {byPriority.map(p => {
            const pct = totalTasks > 0 ? Math.round((p.count / totalTasks) * 100) : 0;
            return (
              <div key={p.key} className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-xs flex-1">{p.label}</span>
                <span className="text-xs font-medium">{p.count}</span>
                <span className="text-[10px] text-muted-foreground w-8 text-right">{pct}%</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* By Assignee */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Distribuição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {byAssignee.assigned.slice(0, 8).map(a => (
            <div key={a.id} className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                {a.id.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <Progress value={(a.count / totalTasks) * 100} className="h-1.5" />
              </div>
              <span className="text-xs font-medium">{a.count}</span>
            </div>
          ))}
          {byAssignee.unassigned > 0 && (
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] text-muted-foreground shrink-0">—</div>
              <span className="text-xs text-muted-foreground flex-1">Sem atribuição</span>
              <span className="text-xs font-medium">{byAssignee.unassigned}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
