import { useState } from 'react';
import { usePlanner } from '@/hooks/usePlanner';
import { PlannerBoard } from '@/components/planner/PlannerBoard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, LayoutGrid, MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function PlannerPage() {
  const { plansQuery, createPlan, deletePlan, updatePlan } = usePlanner();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingPlan, setEditingPlan] = useState<{ id: string; name: string } | null>(null);

  const plans = plansQuery.data || [];
  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[0] || null;

  // Auto-select first plan
  if (!selectedPlanId && plans.length > 0 && plans[0]) {
    setSelectedPlanId(plans[0].id);
  }

  const handleCreate = () => {
    if (!newName.trim()) return;
    createPlan.mutate({ name: newName.trim() }, {
      onSuccess: (data: any) => {
        setSelectedPlanId(data.id);
        setCreateOpen(false);
        setNewName('');
      },
    });
  };

  if (plansQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Plan tabs bar */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <LayoutGrid className="h-4 w-4 text-primary shrink-0" />
        <h1 className="text-sm font-bold tracking-tight mr-3">Planner</h1>

        <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin flex-1">
          {plans.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={cn(
                "relative px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all",
                selectedPlan?.id === plan.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {selectedPlan?.id === plan.id && (
                <motion.div
                  layoutId="planner-tab-pill"
                  className="absolute inset-0 rounded-lg bg-primary/10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{plan.name}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3 w-3" /> Novo Plano
          </Button>
          {selectedPlan && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditingPlan({ id: selectedPlan.id, name: selectedPlan.name })}>
                  <Pencil className="h-3.5 w-3.5 mr-2" /> Renomear
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
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
      </div>

      {/* Board content */}
      <div className="flex-1 overflow-hidden">
        {selectedPlan ? (
          <PlannerBoard planId={selectedPlan.id} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <LayoutGrid className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Crie seu primeiro plano para começar</p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Criar Plano
            </Button>
          </div>
        )}
      </div>

      {/* Create Plan Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Plano</DialogTitle>
            <DialogDescription>Dê um nome ao seu plano de tarefas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nome do plano"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleCreate} disabled={createPlan.isPending || !newName.trim()}>
                {createPlan.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Criar
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
