import { type PlannerTask, type PlannerBucket, type TaskAssignment } from '@/hooks/usePlanner';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Calendar, CheckCircle2, ChevronRight } from 'lucide-react';

const priorityConfig: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgente', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  high: { label: 'Alta', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  medium: { label: 'Média', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  low: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
};

interface Props {
  buckets: PlannerBucket[];
  tasks: PlannerTask[];
  assignments: TaskAssignment[];
  onTaskClick: (id: string) => void;
  onToggleComplete: (task: PlannerTask) => void;
}

export function PlannerListView({ buckets, tasks, assignments, onTaskClick, onToggleComplete }: Props) {
  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {buckets.map(bucket => {
        const bucketTasks = tasks.filter(t => t.bucket_id === bucket.id).sort((a, b) => a.sort_order - b.sort_order);
        if (bucketTasks.length === 0) return null;

        return (
          <div key={bucket.id}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-foreground">{bucket.name}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 h-4 font-normal">{bucketTasks.length}</Badge>
            </div>
            <div className="space-y-1">
              {bucketTasks.map(task => {
                const prio = priorityConfig[task.priority] || priorityConfig.medium;
                const isCompleted = !!task.completed_at;
                const checklistTotal = task.checklist?.length || 0;
                const checklistDone = task.checklist?.filter((c: any) => c.checked).length || 0;
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isCompleted;

                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer group transition-colors"
                    onClick={() => onTaskClick(task.id)}
                  >
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={(e) => {
                        e && onToggleComplete(task);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-medium truncate", isCompleted && "line-through text-muted-foreground")}>
                        {task.title}
                      </p>
                    </div>
                    {/* Labels */}
                    {task.labels && task.labels.length > 0 && (
                      <div className="flex gap-1">
                        {task.labels.slice(0, 3).map((l: any, i: number) => (
                          <div key={i} className="h-2 w-6 rounded-full" style={{ backgroundColor: l.color }} title={l.name} />
                        ))}
                      </div>
                    )}
                    {task.priority !== 'medium' && (
                      <Badge variant="outline" className={cn("text-[9px] px-1 h-4 shrink-0", prio.color)}>
                        {prio.label}
                      </Badge>
                    )}
                    {checklistTotal > 0 && (
                      <span className={cn("text-[10px] shrink-0", checklistDone === checklistTotal ? "text-green-500" : "text-muted-foreground")}>
                        <CheckCircle2 className="h-3 w-3 inline mr-0.5" />{checklistDone}/{checklistTotal}
                      </span>
                    )}
                    {task.due_date && (
                      <span className={cn("text-[10px] shrink-0 flex items-center gap-0.5", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                    <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {tasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhuma tarefa criada ainda.
        </div>
      )}
    </div>
  );
}
