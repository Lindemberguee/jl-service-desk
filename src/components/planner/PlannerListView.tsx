import { type PlannerTask, type PlannerBucket, type TaskAssignment } from '@/hooks/usePlanner';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Calendar, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const priorityConfig: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgente', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  high: { label: 'Alta', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  medium: { label: 'Média', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  low: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
};

const bucketDotColors = ['bg-blue-500', 'bg-amber-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500'];

interface Props {
  buckets: PlannerBucket[];
  tasks: PlannerTask[];
  assignments: TaskAssignment[];
  onTaskClick: (id: string) => void;
  onToggleComplete: (task: PlannerTask) => void;
}

export function PlannerListView({ buckets, tasks, assignments, onTaskClick, onToggleComplete }: Props) {
  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full">
      {buckets.map((bucket, bucketIdx) => {
        const bucketTasks = tasks.filter(t => t.bucket_id === bucket.id).sort((a, b) => a.sort_order - b.sort_order);
        if (bucketTasks.length === 0) return null;
        const dotColor = bucketDotColors[bucketIdx % bucketDotColors.length];

        return (
          <motion.div
            key={bucket.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: bucketIdx * 0.05 }}
          >
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className={cn("h-2 w-2 rounded-full", dotColor)} />
              <span className="text-xs font-bold text-foreground tracking-tight">{bucket.name}</span>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
                {bucketTasks.length}
              </span>
            </div>
            <div className="space-y-0.5">
              {bucketTasks.map((task, taskIdx) => {
                const prio = priorityConfig[task.priority] || priorityConfig.medium;
                const isCompleted = !!task.completed_at;
                const checklistTotal = task.checklist?.length || 0;
                const checklistDone = task.checklist?.filter((c: any) => c.checked).length || 0;
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isCompleted;

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: taskIdx * 0.02 }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer group transition-all duration-150",
                      "hover:bg-muted/50 border border-transparent hover:border-border/50",
                      isCompleted && "opacity-50 grayscale-[0.3]"
                    )}
                    onClick={() => onTaskClick(task.id)}
                  >
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={() => onToggleComplete(task)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[13px] font-medium truncate", isCompleted && "line-through text-muted-foreground")}>
                        {task.title}
                      </p>
                    </div>
                    {task.labels && task.labels.length > 0 && (
                      <div className="flex gap-0.5">
                        {task.labels.slice(0, 3).map((l: any, i: number) => (
                          <div key={i} className="h-1.5 w-5 rounded-full" style={{ backgroundColor: l.color }} title={l.name} />
                        ))}
                      </div>
                    )}
                    {task.priority === 'urgent' && (
                      <Zap className="h-3 w-3 text-red-500 fill-current shrink-0" />
                    )}
                    {task.priority === 'high' && (
                      <Badge variant="outline" className={cn("text-[9px] px-1 h-4 shrink-0 border-0", prio.color)}>
                        {prio.label}
                      </Badge>
                    )}
                    {checklistTotal > 0 && (
                      <span className={cn("text-[10px] shrink-0 flex items-center gap-0.5", checklistDone === checklistTotal ? "text-green-500" : "text-muted-foreground")}>
                        <CheckCircle2 className="h-3 w-3" />{checklistDone}/{checklistTotal}
                      </span>
                    )}
                    {task.due_date && (
                      <span className={cn(
                        "text-[10px] shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full",
                        isOverdue ? "bg-destructive/10 text-destructive font-medium" : "text-muted-foreground"
                      )}>
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                    <ChevronRight className="h-3 w-3 text-muted-foreground/20 group-hover:text-muted-foreground transition-colors shrink-0" />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
      {tasks.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Nenhuma tarefa criada ainda.
        </div>
      )}
    </div>
  );
}
