import { useState, useRef } from 'react';
import { type PlannerTask, type PlannerBucket, type TaskAssignment } from '@/hooks/usePlanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MoreHorizontal, Pencil, Trash2, GripVertical, CheckCircle2, Calendar, AlertTriangle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const priorityConfig: Record<string, { label: string; color: string; icon?: boolean }> = {
  urgent: { label: 'Urgente', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: true },
  high: { label: 'Alta', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  medium: { label: 'Média', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  low: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
};

interface Props {
  buckets: PlannerBucket[];
  tasks: PlannerTask[];
  assignments: TaskAssignment[];
  onTaskClick: (id: string) => void;
  onCreateTask: (input: { bucket_id: string; title: string }) => void;
  onMoveTask: (taskId: string, bucketId: string) => void;
  onCreateBucket: (name: string) => void;
  onUpdateBucket: (input: { id: string; name: string }) => void;
  onDeleteBucket: (id: string) => void;
}

export function PlannerKanban({
  buckets, tasks, assignments, onTaskClick, onCreateTask,
  onMoveTask, onCreateBucket, onUpdateBucket, onDeleteBucket,
}: Props) {
  const [addingToBucket, setAddingToBucket] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingBucket, setAddingBucket] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [editingBucketId, setEditingBucketId] = useState<string | null>(null);
  const [editBucketName, setEditBucketName] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverBucketId, setDragOverBucketId] = useState<string | null>(null);

  const getTasksForBucket = (bucketId: string) =>
    tasks.filter(t => t.bucket_id === bucketId).sort((a, b) => a.sort_order - b.sort_order);

  const getAssignmentsForTask = (taskId: string) =>
    assignments.filter(a => a.task_id === taskId);

  const handleAddTask = (bucketId: string) => {
    if (!newTaskTitle.trim()) return;
    onCreateTask({ bucket_id: bucketId, title: newTaskTitle.trim() });
    setNewTaskTitle('');
    setAddingToBucket(null);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, bucketId: string) => {
    e.preventDefault();
    setDragOverBucketId(bucketId);
  };

  const handleDrop = (e: React.DragEvent, bucketId: string) => {
    e.preventDefault();
    if (draggedTaskId) {
      onMoveTask(draggedTaskId, bucketId);
    }
    setDraggedTaskId(null);
    setDragOverBucketId(null);
  };

  return (
    <div className="flex gap-4 p-4 h-full overflow-x-auto">
      {buckets.map(bucket => {
        const bucketTasks = getTasksForBucket(bucket.id);
        const completedCount = bucketTasks.filter(t => t.completed_at).length;

        return (
          <div
            key={bucket.id}
            className={cn(
              "flex flex-col min-w-[280px] max-w-[320px] rounded-xl bg-muted/40 border transition-colors",
              dragOverBucketId === bucket.id && "border-primary/40 bg-primary/5"
            )}
            onDragOver={(e) => handleDragOver(e, bucket.id)}
            onDragLeave={() => setDragOverBucketId(null)}
            onDrop={(e) => handleDrop(e, bucket.id)}
          >
            {/* Bucket header */}
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              {editingBucketId === bucket.id ? (
                <Input
                  className="h-7 text-xs font-semibold"
                  value={editBucketName}
                  onChange={e => setEditBucketName(e.target.value)}
                  onBlur={() => {
                    if (editBucketName.trim()) onUpdateBucket({ id: bucket.id, name: editBucketName.trim() });
                    setEditingBucketId(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (editBucketName.trim()) onUpdateBucket({ id: bucket.id, name: editBucketName.trim() });
                      setEditingBucketId(null);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">{bucket.name}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 h-4 font-normal">
                    {bucketTasks.length}
                  </Badge>
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditingBucketId(bucket.id); setEditBucketName(bucket.name); }}>
                    <Pencil className="h-3 w-3 mr-2" /> Renomear
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => {
                    if (bucketTasks.length > 0) {
                      if (!confirm(`Excluir "${bucket.name}" e suas ${bucketTasks.length} tarefas?`)) return;
                    }
                    onDeleteBucket(bucket.id);
                  }}>
                    <Trash2 className="h-3 w-3 mr-2" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Tasks */}
            <ScrollArea className="flex-1 px-2 pb-2">
              <div className="space-y-2 px-1">
                <AnimatePresence mode="popLayout">
                  {bucketTasks.map(task => {
                    const prio = priorityConfig[task.priority] || priorityConfig.medium;
                    const taskAssignments = getAssignmentsForTask(task.id);
                    const checklistTotal = task.checklist?.length || 0;
                    const checklistDone = task.checklist?.filter((c: any) => c.checked).length || 0;
                    const isCompleted = !!task.completed_at;

                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        draggable
                        onDragStart={(e: any) => handleDragStart(e, task.id)}
                        onDragEnd={() => { setDraggedTaskId(null); setDragOverBucketId(null); }}
                        onClick={() => onTaskClick(task.id)}
                        className={cn(
                          "group rounded-lg border bg-card p-3 cursor-pointer transition-all hover:shadow-md hover:border-primary/20",
                          isCompleted && "opacity-60",
                          draggedTaskId === task.id && "opacity-40"
                        )}
                      >
                        {/* Labels */}
                        {task.labels && task.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {task.labels.map((label: any, i: number) => (
                              <div
                                key={i}
                                className="h-1.5 w-8 rounded-full"
                                style={{ backgroundColor: label.color }}
                                title={label.name}
                              />
                            ))}
                          </div>
                        )}

                        {/* Title */}
                        <p className={cn("text-xs font-medium leading-snug", isCompleted && "line-through text-muted-foreground")}>
                          {task.title}
                        </p>

                        {/* Meta row */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {task.priority !== 'medium' && (
                            <Badge variant="outline" className={cn("text-[9px] px-1 py-0 h-4", prio.color)}>
                              {prio.icon && <AlertTriangle className="h-2 w-2 mr-0.5" />}
                              {prio.label}
                            </Badge>
                          )}
                          {task.due_date && (
                            <span className={cn(
                              "flex items-center gap-0.5 text-[10px]",
                              new Date(task.due_date) < new Date() && !isCompleted ? "text-destructive" : "text-muted-foreground"
                            )}>
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                          {checklistTotal > 0 && (
                            <span className={cn(
                              "flex items-center gap-0.5 text-[10px]",
                              checklistDone === checklistTotal ? "text-green-500" : "text-muted-foreground"
                            )}>
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              {checklistDone}/{checklistTotal}
                            </span>
                          )}
                          {/* Spacer */}
                          <div className="flex-1" />
                          {/* Assignees */}
                          {taskAssignments.length > 0 && (
                            <div className="flex -space-x-1.5">
                              {taskAssignments.slice(0, 3).map(a => (
                                <Avatar key={a.id} className="h-5 w-5 border-2 border-card">
                                  <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                    {a.user_id.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {taskAssignments.length > 3 && (
                                <Avatar className="h-5 w-5 border-2 border-card">
                                  <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                                    +{taskAssignments.length - 3}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Add task input */}
                {addingToBucket === bucket.id ? (
                  <div className="space-y-1.5">
                    <Input
                      placeholder="Nome da tarefa..."
                      className="h-8 text-xs"
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddTask(bucket.id);
                        if (e.key === 'Escape') { setAddingToBucket(null); setNewTaskTitle(''); }
                      }}
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <Button size="sm" className="h-6 text-[10px]" onClick={() => handleAddTask(bucket.id)}>Adicionar</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setAddingToBucket(null); setNewTaskTitle(''); }}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs text-muted-foreground justify-start gap-1"
                    onClick={() => setAddingToBucket(bucket.id)}
                  >
                    <Plus className="h-3 w-3" /> Adicionar tarefa
                  </Button>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}

      {/* Add bucket column */}
      {addingBucket ? (
        <div className="min-w-[280px] rounded-xl border border-dashed p-3 space-y-2">
          <Input
            placeholder="Nome do bucket..."
            className="h-8 text-xs"
            value={newBucketName}
            onChange={e => setNewBucketName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newBucketName.trim()) {
                onCreateBucket(newBucketName.trim());
                setNewBucketName('');
                setAddingBucket(false);
              }
              if (e.key === 'Escape') { setAddingBucket(false); setNewBucketName(''); }
            }}
            autoFocus
          />
          <div className="flex gap-1">
            <Button size="sm" className="h-6 text-[10px]" onClick={() => {
              if (newBucketName.trim()) { onCreateBucket(newBucketName.trim()); setNewBucketName(''); setAddingBucket(false); }
            }}>Criar</Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setAddingBucket(false); setNewBucketName(''); }}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingBucket(true)}
          className="min-w-[240px] rounded-xl border border-dashed flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar coluna
        </button>
      )}
    </div>
  );
}
