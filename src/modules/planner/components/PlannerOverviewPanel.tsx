import { AlertTriangle, CalendarDays, CheckCircle2, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PlannerTaskLike {
  id: string;
  title: string;
  due_date?: string | null;
  completed_at?: string | null;
  priority?: string | null;
}

interface Props {
  tasks: PlannerTaskLike[];
}

function isToday(date: Date) {
  const now = new Date();
  return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

export function PlannerOverviewPanel({ tasks }: Props) {
  const todayTasks = tasks.filter((task) => task.due_date && isToday(new Date(task.due_date)) && !task.completed_at);
  const overdueTasks = tasks.filter((task) => task.due_date && new Date(task.due_date) < new Date() && !task.completed_at);
  const completedTasks = tasks.filter((task) => !!task.completed_at).slice(0, 4);
  const upcomingTasks = tasks
    .filter((task) => task.due_date && new Date(task.due_date) >= new Date() && !task.completed_at)
    .sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime())
    .slice(0, 4);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm xl:col-span-1">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600">
            <Clock3 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Foco do dia</h3>
            <p className="text-xs text-muted-foreground">Tarefas com prazo para hoje</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {todayTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma tarefa prevista para hoje.</p>
          ) : todayTasks.map((task) => (
            <div key={task.id} className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <p className="text-sm font-medium text-foreground">{task.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Vence hoje</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm xl:col-span-1">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-red-500/10 p-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Risco e atrasos</h3>
            <p className="text-xs text-muted-foreground">Itens que exigem ação imediata</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {overdueTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma tarefa atrasada.</p>
          ) : overdueTasks.slice(0, 4).map((task) => (
            <div key={task.id} className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{task.title}</p>
                <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-[10px] text-red-600">Atrasada</Badge>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Prazo: {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : '—'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm xl:col-span-1">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Próximos passos</h3>
            <p className="text-xs text-muted-foreground">Sequência sugerida de execução</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {upcomingTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma tarefa futura encontrada.</p>
          ) : upcomingTasks.map((task) => (
            <div key={task.id} className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <p className="text-sm font-medium text-foreground">{task.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Prazo: {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : '—'}
              </p>
            </div>
          ))}
          {completedTasks.length > 0 ? (
            <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="mb-2 flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.14em]">Concluídas recentemente</span>
              </div>
              <div className="space-y-1">
                {completedTasks.map((task) => (
                  <p key={task.id} className="text-xs text-foreground">{task.title}</p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
