import { useState, useMemo } from 'react';
import { usePlannerBoard, type PlannerTask, type PlannerBucket } from '@/hooks/usePlanner';
import { PlannerKanban } from './PlannerKanban';
import { PlannerListView } from './PlannerListView';
import { PlannerCharts } from './PlannerCharts';
import { TaskDetailDialog } from './TaskDetailDialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Kanban, List, BarChart3, Loader2 } from 'lucide-react';

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* View switcher */}
      <div className="px-4 pt-2 pb-1">
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="kanban" className="text-xs gap-1 px-3 h-7">
              <Kanban className="h-3 w-3" /> Quadro
            </TabsTrigger>
            <TabsTrigger value="list" className="text-xs gap-1 px-3 h-7">
              <List className="h-3 w-3" /> Lista
            </TabsTrigger>
            <TabsTrigger value="charts" className="text-xs gap-1 px-3 h-7">
              <BarChart3 className="h-3 w-3" /> Gráficos
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
