import { useState, useMemo } from 'react';
import { usePlannerBoard, type PlannerTask, type PlannerBucket } from '@/hooks/usePlanner';
import { PlannerKanban } from './PlannerKanban';
import { PlannerListView } from './PlannerListView';
import { PlannerCharts } from './PlannerCharts';
import { TaskDetailDialog } from './TaskDetailDialog';
import { Kanban, List, BarChart3, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props {
  planId: string;
}

export function PlannerBoard({ planId }: Props) {
  const board = usePlannerBoard(planId);
  const [view, setView] = useState<'kanban' | 'list' | 'charts'>('kanban');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const buckets = board.bucketsQuery.data || [];
  const tasks = board.tasksQuery.data || [];
  const assignments = board.assignmentsQuery.data || [];
  const comments = board.commentsQuery.data || [];

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  const isLoading = board.bucketsQuery.isLoading || board.tasksQuery.isLoading;

  // Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed_at).length;
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !t.completed_at).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const views = [
    { key: 'kanban', label: 'Quadro', icon: Kanban },
    { key: 'list', label: 'Lista', icon: List },
    { key: 'charts', label: 'Gráficos', icon: BarChart3 },
  ] as const;

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header with view switcher and stats */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-border/30">
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5">
          {views.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={cn(
                "relative px-3 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1.5",
                view === key
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {view === key && (
                <motion.div
                  layoutId="planner-view-pill"
                  className="absolute inset-0 rounded-md bg-background shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className="h-3 w-3" />
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Mini stats */}
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{totalTasks}</span> tarefas
          </span>
          {completedTasks > 0 && (
            <span className="text-green-500">
              <span className="font-semibold">{completedTasks}</span> concluídas
            </span>
          )}
          {overdueTasks > 0 && (
            <span className="text-destructive">
              <span className="font-semibold">{overdueTasks}</span> atrasadas
            </span>
          )}
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-hidden">
        {view === 'kanban' && (
          <PlannerKanban
            buckets={buckets}
            tasks={tasks}
            assignments={assignments}
            onTaskClick={setSelectedTaskId}
            onCreateTask={board.createTask.mutate}
            onMoveTask={(taskId, bucketId) => board.updateTask.mutate({ id: taskId, bucket_id: bucketId })}
            onCreateBucket={board.createBucket.mutate}
            onUpdateBucket={board.updateBucket.mutate}
            onDeleteBucket={board.deleteBucket.mutate}
          />
        )}
        {view === 'list' && (
          <PlannerListView
            buckets={buckets}
            tasks={tasks}
            assignments={assignments}
            onTaskClick={setSelectedTaskId}
            onToggleComplete={(task) => {
              board.updateTask.mutate({
                id: task.id,
                completed_at: task.completed_at ? null : new Date().toISOString(),
              });
            }}
          />
        )}
        {view === 'charts' && (
          <PlannerCharts buckets={buckets} tasks={tasks} assignments={assignments} />
        )}
      </div>

      {/* Task detail dialog */}
      <TaskDetailDialog
        task={selectedTask}
        buckets={buckets}
        assignments={assignments.filter(a => a.task_id === selectedTaskId)}
        comments={comments.filter(c => c.task_id === selectedTaskId)}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdate={(data) => board.updateTask.mutate(data)}
        onDelete={(id) => { board.deleteTask.mutate(id); setSelectedTaskId(null); }}
        onAssign={(userId) => selectedTaskId && board.assignUser.mutate({ task_id: selectedTaskId, user_id: userId })}
        onUnassign={(userId) => selectedTaskId && board.unassignUser.mutate({ task_id: selectedTaskId, user_id: userId })}
        onAddComment={(content) => selectedTaskId && board.addComment.mutate({ task_id: selectedTaskId, content })}
        onDeleteComment={(id) => board.deleteComment.mutate(id)}
      />
    </div>
  );
}
