import { useMemo, useState } from 'react';
import { usePlanner } from '@/hooks/usePlanner';
import { useAuth } from '@/contexts/AuthContext';
import { PlannerBoard } from '@/components/planner/PlannerBoard';
import { PlannerExportButton, PlannerImportButton } from '@/components/planner/PlannerImportExport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Plus, Sparkles, User, Users, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlannerProductHeader } from '../components/PlannerProductHeader';
import { PlannerKpiStrip } from '../components/PlannerKpiStrip';
import { PlannerWorkspaceTabs } from '../components/PlannerWorkspaceTabs';

export default function PlannerProductPage() {
  const { plansQuery, createPlan, deletePlan, updatePlan } = usePlanner();
  const { user } = useAuth();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newScope, setNewScope] = useState<'personal' | 'team'>('team');
  const [editingPlan, setEditingPlan] = useState<{ id: string; name: string } | null>(null);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'personal' | 'team'>('all');
  const [search, setSearch] = useState('');

  const plans = plansQuery.data || [];

  const filteredPlans = useMemo(() => {
    let filtered = plans;
    if (scopeFilter === 'personal') {
      filtered = filtered.filter((p) => p.scope === 'personal' && p.created_by === user?.id);
    } else if (scopeFilter === 'team') {
      filtered = filtered.filter((p) => p.scope === 'team');
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(term));
    }

    return filtered;
  }, [plans, scopeFilter, search, user?.id]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || filteredPlans[0] || null;

  if (!selectedPlanId && filteredPlans.length > 0 && filteredPlans[0]) {
    setSelectedPlanId(filteredPlans[0].id);
  }

  const personalPlans = plans.filter((p) => p.scope === 'personal' && p.created_by === user?.id).length;
  const teamPlans = plans.filter((p) => p.scope === 'team').length;
  const visiblePlans = filteredPlans.length;

  const handleCreate = () => {
    if (!newName.trim()) return;
    createPlan.mutate(
      { name: newName.trim(), scope: newScope },
      {
        onSuccess: (data: any) => {
          setSelectedPlanId(data.id);
          setCreateOpen(false);
          setNewName('');
          setNewScope('team');
        },
      }
    );
  };

  if (plansQuery.isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">Carregando workspace do planner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <PlannerProductHeader
        search={search}
        onSearchChange={setSearch}
        onCreatePlan={() => setCreateOpen(true)}
        onImport={() => {
          const trigger = document.getElementById('planner-import-trigger-btn');
          trigger?.click();
        }}
        onExport={() => {
          const trigger = document.getElementById('planner-export-trigger-btn');
          trigger?.click();
        }}
      />

      <div className="hidden">
        <PlannerExportButton 
          plans={plans} 
          selectedPlan={selectedPlan} 
          onImportComplete={() => {}} 
          id="planner-export-trigger-btn"
        />
        <PlannerImportButton 
          onImportComplete={() => plansQuery.refetch()} 
          id="planner-import-trigger-btn"
        />
      </div>

      <PlannerKpiStrip
        items={[
          { label: 'Planos visíveis', value: visiblePlans, helper: 'Workspaces conforme filtros aplicados', tone: 'default' },
          { label: 'Planos da equipe', value: teamPlans, helper: 'Fluxos compartilhados com o time', tone: 'warning' },
          { label: 'Planos pessoais', value: personalPlans, helper: 'Organização privada do usuário', tone: 'success' },
          { label: 'Plano ativo', value: selectedPlan ? selectedPlan.name : 'Nenhum', helper: 'Workspace selecionado para execução', tone: selectedPlan ? 'default' : 'danger' },
        ]}
      />

      <div className="rounded-2xl border border-border/70 bg-card p-2 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-1">
          {[
            { value: 'all', label: 'Todos', icon: FolderOpen },
            { value: 'personal', label: 'Pessoal', icon: User },
            { value: 'team', label: 'Equipe', icon: Users },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setScopeFilter(value as any)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all',
                scopeFilter === value
                  ? 'border-primary/20 bg-primary/10 text-primary shadow-sm'
                  : 'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        <div className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
          <span className="text-foreground font-bold">{visiblePlans}</span> planos encontrados
        </div>
      </div>

      <PlannerWorkspaceTabs
        plans={filteredPlans.map((plan) => ({ id: plan.id, name: plan.name, scope: plan.scope }))}
        selectedPlanId={selectedPlan?.id}
        onSelect={setSelectedPlanId}
        onRename={() => selectedPlan && setEditingPlan({ id: selectedPlan.id, name: selectedPlan.name })}
        onDelete={() => {
          if (!selectedPlan) return;
          if (confirm('Excluir este plano e todas as tarefas?')) {
            deletePlan.mutate(selectedPlan.id, {
              onSuccess: () => setSelectedPlanId(null),
            });
          }
        }}
      />

      <div className="rounded-2xl border border-border/70 bg-card shadow-sm">
        {selectedPlan ? (
          <PlannerBoard planId={selectedPlan.id} />
        ) : (
          <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Crie seu primeiro workspace</p>
              <p className="mt-1 text-sm text-muted-foreground">Estruture planos pessoais ou de equipe com uma experiência visual moderna e operacional.</p>
            </div>
            <Button size="sm" className="h-9 gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Novo plano
            </Button>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Novo plano
            </DialogTitle>
            <DialogDescription>Configure um novo workspace do planner.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Nome</label>
              <Input
                placeholder="Ex: Operação semanal TI"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Escopo</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setNewScope('personal')}
                  className={cn(
                    'rounded-2xl border-2 p-4 text-left transition-all',
                    newScope === 'personal' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  )}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground"><User className="h-4 w-4" /> Pessoal</div>
                  <p className="mt-1 text-xs text-muted-foreground">Apenas você terá acesso a este plano.</p>
                </button>
                <button
                  onClick={() => setNewScope('team')}
                  className={cn(
                    'rounded-2xl border-2 p-4 text-left transition-all',
                    newScope === 'team' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  )}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground"><Users className="h-4 w-4" /> Equipe</div>
                  <p className="mt-1 text-xs text-muted-foreground">Todo o time poderá acompanhar e colaborar.</p>
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleCreate} disabled={createPlan.isPending || !newName.trim()}>
                {createPlan.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                Criar plano
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear plano</DialogTitle>
            <DialogDescription>Atualize o nome do workspace selecionado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={editingPlan?.name || ''}
              onChange={(e) => setEditingPlan((prev) => (prev ? { ...prev, name: e.target.value } : null))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editingPlan) {
                  updatePlan.mutate({ id: editingPlan.id, name: editingPlan.name });
                  setEditingPlan(null);
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingPlan(null)}>Cancelar</Button>
              <Button
                size="sm"
                onClick={() => {
                  if (editingPlan) {
                    updatePlan.mutate({ id: editingPlan.id, name: editingPlan.name });
                    setEditingPlan(null);
                  }
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
