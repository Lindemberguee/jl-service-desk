import { useState } from 'react';
import { type PlannerTask, type PlannerBucket, type TaskAssignment } from '@/hooks/usePlanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MoreHorizontal, Pencil, Trash2, CheckCircle2, Calendar, AlertTriangle, Zap } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const priorityConfig: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
  urgent: { label: 'Urgente', dotClass: 'bg-red-500', badgeClass: 'bg-red-500/10 text-red-500 border-red-500/20' },
  high: { label: 'Alta', dotClass: 'bg-orange-500', badgeClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  medium: { label: 'Média', dotClass: 'bg-blue-500', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  low: { label: 'Baixa', dotClass: 'bg-muted-foreground/40', badgeClass: 'bg-muted text-muted-foreground' },
};

const bucketColors = [
  'from-blue-500/10 to-blue-500/5',
  'from-amber-500/10 to-amber-500/5',
  'from-green-500/10 to-green-500/5',
  'from-purple-500/10 to-purple-500/5',
  'from-pink-500/10 to-pink-500/5',
  'from-cyan-500/10 to-cyan-500/5',
];

const bucketAccentColors = [
  'bg-blue-500',
  'bg-amber-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-cyan-500',
];

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
    if (draggedTaskId) onMoveTask(draggedTaskId, bucketId);
    setDraggedTaskId(null);
    setDragOverBucketId(null);
  };

  return (
    <div className="flex gap-3 p-4 h-full overflow-x-auto">
      {buckets.map((bucket, bucketIndex) => {
        const bucketTasks = getTasksForBucket(bucket.id);
        const completedCount = bucketTasks.filter(t => t.completed_at).length;
        const colorGradient = bucketColors[bucketIndex % bucketColors.length];
        const accentColor = bucketAccentColors[bucketIndex % bucketAccentColors.length];

        return (
          <motion.div
            key={bucket.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: bucketIndex * 0.05 }}
            className={cn(
              "flex flex-col min-w-[290px] max-w-[320px] rounded-xl transition-all duration-200",
              "bg-gradient-to-b border border-border/40",
              colorGradient,
              dragOverBucketId === bucket.id && "border-primary/50 shadow-lg shadow-primary/10 scale-[1.01]"
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
                  <div className={cn("h-2 w-2 rounded-full", accentColor)} />
                  <span className="text-xs font-bold text-foreground tracking-tight">{bucket.name}</span>
                  <span className="text-[10px] font-medium text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded-full">
                    {bucketTasks.length}
                  </span>
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-60 hover:opacity-100">
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
              <div className="space-y-1.5 px-1">
                <AnimatePresence mode="popLayout">
                  {bucketTasks.map((task, taskIndex) => {
                    const prio = priorityConfig[task.priority] || priorityConfig.medium;
                    const taskAssignments = getAssignmentsForTask(task.id);
                    const checklistTotal = task.checklist?.length || 0;
                    const checklistDone = task.checklist?.filter((c: any) => c.checked).length || 0;
                    const isCompleted = !!task.completed_at;
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isCompleted;

                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: taskIndex * 0.02 }}
                        draggable
                        onDragStart={(e: any) => handleDragStart(e, task.id)}
                        onDragEnd={() => { setDraggedTaskId(null); setDragOverBucketId(null); }}
                        onClick={() => onTaskClick(task.id)}
                        className={cn(
                          "group rounded-lg bg-card/80 backdrop-blur-sm p-3 cursor-pointer transition-all duration-200",
                          "border border-border/30 hover:border-primary/25 hover:shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.12)]",
                          "hover:translate-y-[-1px]",
                          isCompleted && "opacity-50",
                          draggedTaskId === task.id && "opacity-30 rotate-1 scale-95"
                        )}
                      >
                        {/* Labels */}
                        {task.labels && task.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {task.labels.map((label: any, i: number) => (
                              <div
                                key={i}
                                className="h-1 w-7 rounded-full opacity-80"
                                style={{ backgroundColor: label.color }}
                                title={label.name}
                              />
                            ))}
                          </div>
                        )}

                        {/* Title */}
                        <p className={cn(
                          "text-[13px] font-medium leading-snug",
                          isCompleted && "line-through text-muted-foreground"
                        )}>
                          {task.title}
                        </p>

                        {/* Meta row */}
                        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                          {task.priority === 'urgent' && (
                            <div className="flex items-center gap-0.5 text-red-500">
                              <Zap className="h-2.5 w-2.5 fill-current" />
                              <span className="text-[9px] font-bold">Urgente</span>
                            </div>
                          )}
                          {task.priority === 'high' && (
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 border-0", prio.badgeClass)}>
                              {prio.label}
                            </Badge>
                          )}
                          {task.due_date && (
                            <span className={cn(
                              "flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full",
                              isOverdue
                                ? "bg-destructive/10 text-destructive font-medium"
                                : "text-muted-foreground"
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
                          <div className="flex-1" />
                          {taskAssignments.length > 0 && (
                            <div className="flex -space-x-1.5">
                              {taskAssignments.slice(0, 3).map(a => (
                                <Avatar key={a.id} className="h-5 w-5 border-2 border-card ring-0">
                                  <AvatarFallback className="text-[7px] font-bold bg-primary/10 text-primary">
                                    {a.user_id.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {taskAssignments.length > 3 && (
                                <Avatar className="h-5 w-5 border-2 border-card">
                                  <AvatarFallback className="text-[7px] bg-muted text-muted-foreground">
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
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-1.5 mt-1"
                  >
                    <Input
                      placeholder="Nome da tarefa..."
                      className="h-8 text-xs bg-card/80 border-border/50"
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
                  </motion.div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs text-muted-foreground/70 hover:text-foreground justify-start gap-1.5 mt-1"
                    onClick={() => setAddingToBucket(bucket.id)}
                  >
                    <Plus className="h-3 w-3" /> Adicionar tarefa
                  </Button>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        );
      })}

      {/* Add bucket column */}
      {addingBucket ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="min-w-[280px] rounded-xl border border-dashed border-primary/30 p-3 space-y-2 bg-primary/[0.02]"
        >
          <Input
            placeholder="Nome da coluna..."
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
        </motion.div>
      ) : (
        <button
          onClick={() => setAddingBucket(true)}
          className={cn(
            "min-w-[240px] rounded-xl border-2 border-dashed border-border/40",
            "flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60",
            "hover:text-primary hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-200"
          )}
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar coluna
        </button>
      )}
    </div>
  );
}
