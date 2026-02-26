import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Bell, Plus, Trash2, Search, ArrowLeft, Loader2, Tag, X,
  ChevronRight, Clock, AlertCircle, CheckCircle2, Cloud,
  Calendar as CalendarIcon, Repeat, Flag, FolderOpen, FileText,
  FolderPlus, Filter, ChevronDown, Sparkles,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useRemindersEngine, type Reminder, type SyncStatus } from '@/hooks/useRemindersEngine';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isTomorrow, isThisWeek, isPast, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// ─── Priority config ───

const PRIORITIES = [
  { value: 'baixa', label: 'Baixa', color: 'text-muted-foreground', bg: 'bg-muted', dot: 'bg-muted-foreground' },
  { value: 'media', label: 'Média', color: 'text-blue-500', bg: 'bg-blue-500/10', dot: 'bg-blue-500' },
  { value: 'alta', label: 'Alta', color: 'text-amber-500', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
  { value: 'critica', label: 'Crítica', color: 'text-red-500', bg: 'bg-red-500/10', dot: 'bg-red-500' },
] as const;

const RECURRENCE_LABELS: Record<string, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

function getPriority(val: string) {
  return PRIORITIES.find(p => p.value === val) || PRIORITIES[1];
}

function formatDueDate(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isToday(d)) return `Hoje ${format(d, 'HH:mm')}`;
  if (isTomorrow(d)) return `Amanhã ${format(d, 'HH:mm')}`;
  if (isThisWeek(d)) return format(d, "EEEE HH:mm", { locale: ptBR });
  return format(d, "dd MMM yyyy HH:mm", { locale: ptBR });
}

function isOverdue(rem: Reminder) {
  return !rem.is_completed && rem.due_at && isPast(new Date(rem.due_at));
}

// ─── Sync Indicator ───

function SyncIndicator({ status }: { status: SyncStatus }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={status} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
        className="flex items-center gap-1.5">
        {status === 'saving' && <><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /><span className="text-[10px] text-muted-foreground">Salvando...</span></>}
        {status === 'saved' && <><CheckCircle2 className="h-3 w-3 text-emerald-500" /><span className="text-[10px] text-emerald-500">Salvo</span></>}
        {status === 'error' && <><AlertCircle className="h-3 w-3 text-destructive" /><span className="text-[10px] text-destructive">Erro</span></>}
        {status === 'idle' && <Cloud className="h-3 w-3 text-muted-foreground/40" />}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Filter types ───

type FilterView = 'all' | 'pending' | 'overdue' | 'completed' | 'today';

// ─── Main Component ───

export default function RemindersPage() {
  const {
    reminders, loading, syncStatus, createReminder, updateReminder,
    deleteReminder, toggleComplete, flush, categories, allTags, overdueCount, pendingCount,
  } = useRemindersEngine();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [filterView, setFilterView] = useState<FilterView>('pending');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<string>('media');
  const [editCategory, setEditCategory] = useState('Geral');
  const [editDueDate, setEditDueDate] = useState<Date | undefined>();
  const [editDueTime, setEditDueTime] = useState('09:00');
  const [editRecurrence, setEditRecurrence] = useState<string | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const editingReminder = reminders.find(r => r.id === editingId);

  // Load editing state
  useEffect(() => {
    if (editingReminder) {
      setEditTitle(editingReminder.title);
      setEditDescription(editingReminder.description);
      setEditPriority(editingReminder.priority);
      setEditCategory(editingReminder.category);
      setEditRecurrence(editingReminder.recurrence_type);
      setEditTags([...editingReminder.tags]);
      if (editingReminder.due_at) {
        const d = new Date(editingReminder.due_at);
        setEditDueDate(d);
        setEditDueTime(format(d, 'HH:mm'));
      } else {
        setEditDueDate(undefined);
        setEditDueTime('09:00');
      }
    }
  }, [editingId]); // eslint-disable-line

  // Save changes when closing dialog
  const handleSaveAndClose = useCallback(() => {
    if (!editingId) return;
    let dueAt: string | null = null;
    if (editDueDate) {
      const [h, m] = editDueTime.split(':').map(Number);
      const d = new Date(editDueDate);
      d.setHours(h || 9, m || 0, 0, 0);
      dueAt = d.toISOString();
    }
    updateReminder(editingId, {
      title: editTitle.trim() || 'Sem título',
      description: editDescription,
      priority: editPriority as Reminder['priority'],
      category: editCategory,
      tags: editTags,
      due_at: dueAt,
      recurrence_type: (editRecurrence as Reminder['recurrence_type']) || null,
    });
    setEditingId(null);
  }, [editingId, editTitle, editDescription, editPriority, editCategory, editTags, editDueDate, editDueTime, editRecurrence, updateReminder]);

  const handleCreate = async () => {
    const cat = activeCategory || 'Geral';
    const result = await createReminder({ category: cat });
    if (result) setEditingId(result.id);
  };

  const handleQuickToggle = (id: string) => {
    toggleComplete(id);
  };

  const handleBackToTools = useCallback(async () => {
    await flush();
    navigate('/ferramentas');
  }, [flush, navigate]);

  const handleSelectCategory = useCallback(async (cat: string | null) => {
    await flush();
    setActiveCategory(cat);
    setActiveTag(null);
  }, [flush]);

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    const tag = newTag.trim().toLowerCase();
    if (!editTags.includes(tag)) setEditTags(prev => [...prev, tag]);
    setNewTag('');
  };

  // ─── Filtered ───
  const filtered = useMemo(() => reminders.filter(r => {
    if (activeCategory && r.category !== activeCategory) return false;
    if (activeTag && !r.tags.includes(activeTag)) return false;
    if (filterView === 'pending' && r.is_completed) return false;
    if (filterView === 'completed' && !r.is_completed) return false;
    if (filterView === 'overdue' && !isOverdue(r)) return false;
    if (filterView === 'today') {
      if (!r.due_at || !isToday(new Date(r.due_at))) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
    }
    return true;
  }), [reminders, activeCategory, activeTag, filterView, searchQuery]);

  // Flush on unmount
  useEffect(() => { return () => { void flush(); }; }, [flush]);

  // ─── RENDER ───

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* LEFT Sidebar */}
      <motion.div
        animate={{ width: sidebarCollapsed ? 48 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="shrink-0 border-r bg-muted/20 flex flex-col overflow-hidden"
      >
        <div className="p-3 flex items-center gap-2">
          {!sidebarCollapsed && (
            <Button variant="ghost" size="sm" onClick={handleBackToTools} className="gap-1 text-xs h-7 px-2">
              <ArrowLeft className="h-3 w-3" /> Ferramentas
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', !sidebarCollapsed && 'rotate-180')} />
          </Button>
        </div>

        {!sidebarCollapsed && (
          <ScrollArea className="flex-1 px-2">
            {/* Filter views */}
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-2">Filtros</p>
              <div className="space-y-0.5">
                {[
                  { key: 'all' as FilterView, label: 'Todos', icon: FileText, count: reminders.length },
                  { key: 'pending' as FilterView, label: 'Pendentes', icon: Clock, count: pendingCount },
                  { key: 'overdue' as FilterView, label: 'Atrasados', icon: AlertCircle, count: overdueCount },
                  { key: 'today' as FilterView, label: 'Hoje', icon: CalendarIcon, count: reminders.filter(r => r.due_at && isToday(new Date(r.due_at))).length },
                  { key: 'completed' as FilterView, label: 'Concluídos', icon: CheckCircle2, count: reminders.filter(r => r.is_completed).length },
                ].map(f => (
                  <button key={f.key}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                      filterView === f.key ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    onClick={() => setFilterView(f.key)}>
                    <f.icon className="h-3.5 w-3.5" />
                    <span className="flex-1 text-left">{f.label}</span>
                    <span className={cn('text-[10px]', f.key === 'overdue' && f.count > 0 ? 'text-red-500 font-bold' : 'opacity-60')}>{f.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator className="mb-4" />

            {/* Categories */}
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-2">Categorias</p>
              <div className="space-y-0.5">
                <button
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                    activeCategory === null ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  onClick={() => void handleSelectCategory(null)}>
                  <FileText className="h-3.5 w-3.5" />
                  <span className="flex-1 text-left">Todas</span>
                </button>
                {categories.map(c => (
                  <button key={c}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                      activeCategory === c ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    onClick={() => void handleSelectCategory(c)}>
                    <FolderOpen className="h-3.5 w-3.5" />
                    <span className="flex-1 text-left truncate">{c}</span>
                    <span className="text-[10px] opacity-60">{reminders.filter(r => r.category === c).length}</span>
                  </button>
                ))}
                {showNewCategory ? (
                  <div className="px-1 pt-1">
                    <Input autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newCategoryName.trim()) { setActiveCategory(newCategoryName.trim()); setShowNewCategory(false); setNewCategoryName(''); }
                        if (e.key === 'Escape') setShowNewCategory(false);
                      }}
                      onBlur={() => setShowNewCategory(false)}
                      className="h-7 text-xs" placeholder="Nova categoria..." />
                  </div>
                ) : (
                  <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted transition-colors"
                    onClick={() => setShowNewCategory(true)}>
                    <FolderPlus className="h-3.5 w-3.5" /> Nova categoria
                  </button>
                )}
              </div>
            </div>

            {/* Tags */}
            {allTags.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-2">Tags</p>
                <div className="flex flex-wrap gap-1 px-1">
                  {allTags.map(t => (
                    <Badge key={t} variant={activeTag === t ? 'default' : 'outline'}
                      className={cn('text-[10px] cursor-pointer transition-all', activeTag === t && 'shadow-sm')}
                      onClick={() => setActiveTag(activeTag === t ? null : t)}>
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        )}

        <div className="p-2 border-t">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handleCreate} size={sidebarCollapsed ? 'icon' : 'sm'}
                className={cn('gap-1.5 w-full', sidebarCollapsed && 'h-8 w-8')}>
                <Plus className="h-4 w-4" />
                {!sidebarCollapsed && <span className="text-xs">Novo Lembrete</span>}
              </Button>
            </TooltipTrigger>
            {sidebarCollapsed && <TooltipContent side="right">Novo Lembrete</TooltipContent>}
          </Tooltip>
        </div>
      </motion.div>

      {/* MAIN content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 space-y-3 shrink-0 border-b">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-violet-500" />
              {activeCategory || 'Lembretes'}
            </h1>
            <div className="flex-1" />
            <SyncIndicator status={syncStatus} />
            <span className="text-[10px] text-muted-foreground">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar lembretes..." className="pl-8 h-8 text-xs bg-muted/50 border-transparent focus:border-border" />
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="h-12 w-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-violet-500" />
              </div>
              <p className="text-sm font-medium mb-1">Nenhum lembrete</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? 'Tente outra busca.' : 'Crie seu primeiro lembrete.'}
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-1.5">
              {filtered.map(rem => {
                const prio = getPriority(rem.priority);
                const overdue = isOverdue(rem);
                return (
                  <motion.div
                    key={rem.id} layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'group flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer',
                      rem.is_completed ? 'bg-muted/30 border-transparent opacity-60' : 'bg-card hover:border-primary/20 hover:shadow-sm',
                      overdue && 'border-red-500/30 bg-red-500/5'
                    )}
                    onClick={() => setEditingId(rem.id)}
                  >
                    {/* Checkbox */}
                    <div className="pt-0.5" onClick={e => { e.stopPropagation(); handleQuickToggle(rem.id); }}>
                      <Checkbox checked={rem.is_completed} className={cn('h-4.5 w-4.5', overdue && 'border-red-500')} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn('text-sm font-medium truncate', rem.is_completed && 'line-through text-muted-foreground')}>
                          {rem.title || 'Sem título'}
                        </span>
                        {/* Priority dot */}
                        <span className={cn('h-2 w-2 rounded-full shrink-0', prio.dot)} />
                      </div>
                      {rem.description && (
                        <p className="text-[11px] text-muted-foreground/70 line-clamp-1">{rem.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {rem.due_at && (
                          <span className={cn('text-[10px] flex items-center gap-1', overdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
                            <CalendarIcon className="h-2.5 w-2.5" />
                            {formatDueDate(rem.due_at)}
                          </span>
                        )}
                        {rem.recurrence_type && (
                          <span className="text-[10px] text-violet-500 flex items-center gap-0.5">
                            <Repeat className="h-2.5 w-2.5" />
                            {RECURRENCE_LABELS[rem.recurrence_type]}
                          </span>
                        )}
                        {rem.tags.slice(0, 2).map(t => (
                          <Badge key={t} variant="outline" className="text-[8px] h-3.5 px-1 border-muted-foreground/20">{t}</Badge>
                        ))}
                      </div>
                    </div>

                    {/* Delete */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive shrink-0"
                          onClick={e => e.stopPropagation()}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={e => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir lembrete?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteReminder(rem.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* EDIT Dialog */}
      <Dialog open={!!editingId} onOpenChange={open => { if (!open) handleSaveAndClose(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-violet-500" />
              Editar Lembrete
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Título</label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                placeholder="O que você precisa lembrar?" className="text-sm" />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição</label>
              <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)}
                placeholder="Detalhes..." className="text-sm min-h-[60px] resize-none" />
            </div>

            {/* Row: Priority + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Prioridade</label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value} className="text-xs">
                        <span className="flex items-center gap-2">
                          <span className={cn('h-2 w-2 rounded-full', p.dot)} />
                          {p.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoria</label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...new Set(['Geral', ...categories, editCategory])].sort().map(c => (
                      <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due date + time */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Vencimento</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 h-9 text-xs justify-start gap-2 font-normal">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {editDueDate ? format(editDueDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={editDueDate} onSelect={setEditDueDate}
                      locale={ptBR} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Input type="time" value={editDueTime} onChange={e => setEditDueTime(e.target.value)}
                  className="w-28 h-9 text-xs" />
                {editDueDate && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"
                    onClick={() => { setEditDueDate(undefined); setEditDueTime('09:00'); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Recurrence */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Recorrência</label>
              <Select value={editRecurrence || 'none'} onValueChange={v => setEditRecurrence(v === 'none' ? null : v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">Sem recorrência</SelectItem>
                  <SelectItem value="daily" className="text-xs">Diário</SelectItem>
                  <SelectItem value="weekly" className="text-xs">Semanal</SelectItem>
                  <SelectItem value="monthly" className="text-xs">Mensal</SelectItem>
                  <SelectItem value="yearly" className="text-xs">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {editTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[10px] h-5 gap-1 cursor-pointer hover:bg-destructive/10"
                    onClick={() => setEditTags(prev => prev.filter(t => t !== tag))}>
                    {tag} <X className="h-2.5 w-2.5" />
                  </Badge>
                ))}
                <Input value={newTag} onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                  placeholder="+ tag" className="h-5 text-[10px] w-20 border-0 bg-transparent px-1 focus-visible:ring-0" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSaveAndClose} size="sm" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
