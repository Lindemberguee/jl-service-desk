import { useState } from "react";
import { usePlannerBoard } from "@/hooks/usePlanner";
import { PlannerKanban } from "./PlannerKanban";
import { PlannerListView } from "./PlannerListView";
import { PlannerCharts } from "./PlannerCharts";
import { TaskDetailDialog } from "./TaskDetailDialog";
import {
  Kanban,
  List,
  BarChart3,
  Loader2,
  LayoutPanelTop,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PlannerOverviewPanel } from "@/modules/planner/components/PlannerOverviewPanel";

interface Props {
  planId: string;
}

export function PlannerBoard({ planId }: Props) {
  const board = usePlannerBoard(planId);
  const [view, setView] = useState<"kanban" | "list" | "charts">("kanban");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const buckets = board.bucketsQuery.data || [];
  const tasks = board.tasksQuery.data || [];
  const assignments = board.assignmentsQuery.data || [];
  const comments = board.commentsQuery.data || [];

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  const isLoading = board.bucketsQuery.isLoading || board.tasksQuery.isLoading;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed_at).length;
  const overdueTasks = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date() && !t.completed_at
  ).length;
  const openTasks = tasks.filter((t) => !t.completed_at).length;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">
            Carregando workspace do planner...
          </p>
        </div>
      </div>
    );
  }

  const views = [
    { key: "kanban", label: "Quadro", icon: Kanban },
    { key: "list", label: "Lista", icon: List },
    { key: "charts", label: "Gráficos", icon: BarChart3 },
  ] as const;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 bg-card/80 px-5 py-4 backdrop-blur-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              <LayoutPanelTop className="h-3.5 w-3.5" />
              Workspace ativo
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
              Execução do plano
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhe progresso, riscos, atrasos e capacidade de execução com
              uma visão operacional moderna.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/70 bg-background px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Tarefas
              </p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {totalTasks}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Concluídas
              </p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {completedTasks}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Em aberto
              </p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {openTasks}
              </p>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Atrasadas
              </p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {overdueTasks}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-border/50 bg-background px-5 py-4">
        <PlannerOverviewPanel tasks={tasks} />
      </div>

      <div className="border-b border-border/50 bg-card/40 px-5 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1">
            {views.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={cn(
                  "relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                  view === key
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {view === key && (
                  <motion.div
                    layoutId="planner-view-pill-product"
                    className="absolute inset-0 rounded-lg bg-background shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{totalTasks}</span>{" "}
              tarefas no plano
            </span>
            <span>
              <span className="font-semibold text-foreground">
                {completedTasks}
              </span>{" "}
              concluídas
            </span>
            {overdueTasks > 0 ? (
              <span className="font-medium text-destructive">
                {overdueTasks} com atraso
              </span>
            ) : (
              <span className="font-medium text-emerald-600">
                Nenhuma tarefa em atraso
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-muted/10">
        {view === "kanban" && (
          <PlannerKanban
            buckets={buckets}
            tasks={tasks}
            assignments={assignments}
            onTaskClick={setSelectedTaskId}
            onCreateTask={board.createTask.mutate}
            onMoveTask={(taskId, bucketId) =>
              board.updateTask.mutate({ id: taskId, bucket_id: bucketId })
            }
            onCreateBucket={board.createBucket.mutate}
            onUpdateBucket={board.updateBucket.mutate}
            onDeleteBucket={board.deleteBucket.mutate}
          />
        )}

        {view === "list" && (
          <PlannerListView
            buckets={buckets}
            tasks={tasks}
            assignments={assignments}
            onTaskClick={setSelectedTaskId}
            onToggleComplete={(task) => {
              board.updateTask.mutate({
                id: task.id,
                completed_at: task.completed_at
                  ? null
                  : new Date().toISOString(),
              });
            }}
          />
        )}

        {view === "charts" && (
          <PlannerCharts
            buckets={buckets}
            tasks={tasks}
            assignments={assignments}
          />
        )}
      </div>

      <TaskDetailDialog
        task={selectedTask}
        buckets={buckets}
        assignments={assignments.filter((a) => a.task_id === selectedTaskId)}
        comments={comments.filter((c) => c.task_id === selectedTaskId)}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdate={(data) => board.updateTask.mutate(data)}
        onDelete={(id) => {
          board.deleteTask.mutate(id);
          setSelectedTaskId(null);
        }}
        onAssign={(userId) =>
          selectedTaskId &&
          board.assignUser.mutate({ task_id: selectedTaskId, user_id: userId })
        }
        onUnassign={(userId) =>
          selectedTaskId &&
          board.unassignUser.mutate({
            task_id: selectedTaskId,
            user_id: userId,
          })
        }
        onAddComment={(content) =>
          selectedTaskId &&
          board.addComment.mutate({ task_id: selectedTaskId, content })
        }
        onDeleteComment={(id) => board.deleteComment.mutate(id)}
      />
    </div>
  );
}
