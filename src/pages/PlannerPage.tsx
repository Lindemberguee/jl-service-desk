import { useState, useMemo } from 'react';
import { usePlanner } from '@/hooks/usePlanner';
import { useAuth } from '@/contexts/AuthContext';
import { PlannerBoard } from '@/components/planner/PlannerBoard';
import { PlannerExportButton, PlannerImportButton } from '@/components/planner/PlannerImportExport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2, User, Users, Sparkles, Lock, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function PlannerPage() {
  const { plansQuery, createPlan, deletePlan, updatePlan } = usePlanner();
  const { user } = useAuth();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newScope, setNewScope] = useState<'personal' | 'team'>('team');
  const [editingPlan, setEditingPlan] = useState<{ id: string; name: string } | null>(null);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'personal' | 'team'>('all');

  const plans = plansQuery.data || [];

  const filteredPlans = useMemo(() => {
    let filtered = plans;
    if (scopeFilter === 'personal') {
      filtered = plans.filter(p => p.scope === 'personal' && p.created_by === user?.id);
    } else if (scopeFilter === 'team') {
      filtered = plans.filter(p => p.scope === 'team');
    }
    return filtered;
  }, [plans, scopeFilter, user?.id]);

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || filteredPlans[0] || null;

  if (!selectedPlanId && filteredPlans.length > 0 && filteredPlans[0]) {
    setSelectedPlanId(filteredPlans[0].id);
  }

  const handleCreate = () => {
    if (!newName.trim()) return;
    createPlan.mutate({ name: newName.trim(), scope: newScope }, {
      onSuccess: (data: any) => {
        setSelectedPlanId(data.id);
        setCreateOpen(false);
        setNewName('');
        setNewScope('team');
      },
    });
  };

  if (plansQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
            <div className="absolute -inset-1 rounded-xl bg-primary/5 animate-pulse" />
          </div>
          <p className="text-xs text-muted-foreground">Carregando planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-border/50 bg-gradient-to-r from-background via-background to-primary/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Planner</h1>
            <p className="text-[10px] text-muted-foreground">Gerencie tarefas pessoais e da equipe</p>
          </div>
        </div>

        {/* Scope filter pills */}
        <div className="flex items-center gap-1 ml-4 bg-muted/50 rounded-lg p-0.5">
          {[
            { value: 'all', label: 'Todos', icon: null },
            { value: 'personal', label: 'Pessoal', icon: User },
            { value: 'team', label: 'Equipe', icon: Users },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setScopeFilter(value as any)}
              className={cn(
                "px-3 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1.5",
                scopeFilter === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {Icon && <Icon className="h-3 w-3" />}
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <PlannerExportButton
          plans={plans}
          selectedPlan={selectedPlan}
          onImportComplete={() => {}}
        />
        <PlannerImportButton
          onImportComplete={() => plansQuery.refetch()}
        />
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Novo Plano
        </Button>
      </div>

      {/* Plan tabs */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border/30 overflow-x-auto scrollbar-thin bg-gradient-to-r from-muted/30 via-background to-muted/30">
        <AnimatePresence mode="popLayout">
          {filteredPlans.map((plan, index) => {
            const isActive = selectedPlan?.id === plan.id;
            return (
              <motion.button
                key={plan.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelectedPlanId(plan.id)}
                className={cn(
                  "relative px-4 py-2 text-xs font-medium rounded-xl whitespace-nowrap transition-all flex items-center gap-2 group",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="planner-tab-active"
                    className="absolute inset-0 rounded-xl bg-primary shadow-lg shadow-primary/25"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <span className={cn(
                    "flex items-center justify-center h-5 w-5 rounded-md text-[10px]",
                    isActive
                      ? "bg-primary-foreground/20"
                      : "bg-muted/80"
                  )}>
                    {plan.scope === 'personal' ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Globe className="h-3 w-3" />
                    )}
                  </span>
                  {plan.name}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {selectedPlan && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 ml-1 shrink-0 rounded-xl hover:bg-muted/60">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl">
              <DropdownMenuItem onClick={() => setEditingPlan({ id: selectedPlan.id, name: selectedPlan.name })}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Renomear
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  if (confirm('Excluir este plano e todas as tarefas?')) {
                    deletePlan.mutate(selectedPlan.id, {
                      onSuccess: () => setSelectedPlanId(null),
                    });
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Board content */}
      <div className="flex-1 overflow-hidden">
        {selectedPlan ? (
          <PlannerBoard planId={selectedPlan.id} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center gap-4"
          >
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-primary/60" />
              </div>
              <div className="absolute -inset-2 rounded-3xl bg-primary/5 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium">Crie seu primeiro plano</p>
              <p className="text-xs text-muted-foreground mt-1">Organize tarefas pessoais ou da equipe</p>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Criar Plano
            </Button>
          </motion.div>
        )}
      </div>

      {/* Create Plan Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Novo Plano
            </DialogTitle>
            <DialogDescription>Configure seu novo plano de tarefas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome</label>
              <Input
                placeholder="Nome do plano"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Escopo</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setNewScope('personal')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                    newScope === 'personal'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center",
                    newScope === 'personal' ? "bg-primary/15" : "bg-muted"
                  )}>
                    <User className={cn("h-4 w-4", newScope === 'personal' ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium">Pessoal</p>
                    <p className="text-[10px] text-muted-foreground">Só você visualiza</p>
                  </div>
                </button>
                <button
                  onClick={() => setNewScope('team')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                    newScope === 'team'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center",
                    newScope === 'team' ? "bg-primary/15" : "bg-muted"
                  )}>
                    <Users className={cn("h-4 w-4", newScope === 'team' ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium">Equipe</p>
                    <p className="text-[10px] text-muted-foreground">Toda a equipe acessa</p>
                  </div>
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleCreate} disabled={createPlan.isPending || !newName.trim()}>
                {createPlan.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Criar Plano
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Plan Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear Plano</DialogTitle>
            <DialogDescription>Altere o nome do plano.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={editingPlan?.name || ''}
              onChange={e => setEditingPlan(prev => prev ? { ...prev, name: e.target.value } : null)}
              onKeyDown={e => {
                if (e.key === 'Enter' && editingPlan) {
                  updatePlan.mutate({ id: editingPlan.id, name: editingPlan.name });
                  setEditingPlan(null);
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingPlan(null)}>Cancelar</Button>
              <Button size="sm" onClick={() => {
                if (editingPlan) {
                  updatePlan.mutate({ id: editingPlan.id, name: editingPlan.name });
                  setEditingPlan(null);
                }
              }}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
