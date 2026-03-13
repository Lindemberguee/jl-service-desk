import { useState, useMemo, useEffect, useRef } from 'react';
import { useOkrs, type OkrCycle, type OkrObjective, type OkrKeyResult } from '@/hooks/useOkrs';
import { useKpis } from '@/hooks/useKpis';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Plus, Target, Calendar, Pencil, Trash2, BarChart3,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Clock, Play, Pause, Timer
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* ───────── Constants ───────── */

const cycleTypes = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semester', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
];

const ACTIVITY_STATUSES: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  a_iniciar: { label: 'A Iniciar', color: 'text-sky-500', icon: Clock, bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  em_andamento: { label: 'Em Andamento', color: 'text-amber-500', icon: Play, bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  no_prazo: { label: 'No Prazo', color: 'text-emerald-500', icon: CheckCircle2, bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  atrasado: { label: 'Atrasado', color: 'text-destructive', icon: AlertTriangle, bg: 'bg-destructive/10 text-destructive border-destructive/20' },
  finalizado: { label: 'Finalizado', color: 'text-primary', icon: CheckCircle2, bg: 'bg-primary/10 text-primary border-primary/20' },
  finalizado_com_atraso: { label: 'Finalizado c/ Atraso', color: 'text-orange-500', icon: Timer, bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  pausado: { label: 'Pausado', color: 'text-muted-foreground', icon: Pause, bg: 'bg-muted text-muted-foreground border-border' },
  cancelado: { label: 'Cancelado', color: 'text-muted-foreground', icon: Trash2, bg: 'bg-muted text-muted-foreground border-border' },
};

/* ───────── Component ───────── */

export function OkrBoard() {
  const {
    cycles, objectives, keyResults, checkins,
    createCycle, updateCycle, deleteCycle,
    createObjective, updateObjective, deleteObjective,
    createKeyResult, updateKeyResult, deleteKeyResult,
    addCheckin, isLoading,
  } = useOkrs();
  const { kpis } = useKpis();
  const { currentRole, rolePermissions, user } = useAuth();
  const canManage = currentRole && hasPermission(currentRole, 'kpis:manage', undefined, rolePermissions);

  /* ── State ── */
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [objDialogOpen, setObjDialogOpen] = useState(false);
  const [krDialogOpen, setKrDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Partial<OkrCycle>>({});
  const [editingObj, setEditingObj] = useState<Partial<OkrObjective>>({});
  const [editingKr, setEditingKr] = useState<Partial<OkrKeyResult>>({});

  /* ── Derived ── */
  const activeCycle = selectedCycleId
    ? cycles.find(c => c.id === selectedCycleId)
    : cycles.find(c => c.status === 'active') || cycles[0];
  const cycleId = activeCycle?.id;
  const cycleObjectives = cycleId ? objectives.filter(o => o.cycle_id === cycleId) : [];

  const daysRemaining = activeCycle ? Math.max(0, differenceInDays(parseISO(activeCycle.ends_at), new Date())) : 0;
  const totalDays = activeCycle ? differenceInDays(parseISO(activeCycle.ends_at), parseISO(activeCycle.starts_at)) : 1;
  const elapsedPct = totalDays > 0 ? Math.min(((totalDays - daysRemaining) / totalDays) * 100, 100) : 0;

  /* ── Build table data: each objective with its KRs ── */
  const tableData = useMemo(() => {
    return cycleObjectives.map(obj => {
      const krs = keyResults.filter(kr => kr.objective_id === obj.id);
      return { objective: obj, keyResults: krs };
    });
  }, [cycleObjectives, keyResults]);

  /* ── Auto-detect overdue ── */
  const autoRan = useRef(false);
  const allActivities = useMemo(() => cycleObjectives.flatMap(o => keyResults.filter(kr => kr.objective_id === o.id)), [cycleObjectives, keyResults]);

  useEffect(() => {
    if (isLoading || allActivities.length === 0 || autoRan.current) return;
    autoRan.current = true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    allActivities
      .filter(a => {
        if (!a.end_date) return false;
        const end = parseISO(a.end_date);
        end.setHours(0, 0, 0, 0);
        return end < today && !['finalizado', 'finalizado_com_atraso', 'cancelado', 'pausado', 'atrasado'].includes(a.activity_status);
      })
      .forEach(a => updateKeyResult.mutateAsync({ id: a.id, activity_status: 'atrasado' }).catch(() => {}));
  }, [isLoading, allActivities]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = allActivities.length;
    const finalizados = allActivities.filter(a => ['finalizado', 'finalizado_com_atraso'].includes(a.activity_status)).length;
    const pct = cycleObjectives.length > 0
      ? Math.round(cycleObjectives.reduce((s, o) => s + (o.progress || 0), 0) / cycleObjectives.length)
      : 0;
    return { total, finalizados, pct };
  }, [allActivities, cycleObjectives]);

  /* ── Handlers ── */
  const handleSaveCycle = async () => {
    if (!editingCycle.name?.trim()) return toast.error('Nome obrigatório');
    if (!editingCycle.starts_at || !editingCycle.ends_at) return toast.error('Datas obrigatórias');
    try {
      if (editingCycle.id) {
        await updateCycle.mutateAsync({ id: editingCycle.id, ...editingCycle });
        toast.success('Ciclo atualizado');
      } else {
        await createCycle.mutateAsync({ ...editingCycle, created_by: user?.id });
        toast.success('Ciclo criado');
      }
      setCycleDialogOpen(false);
    } catch { toast.error('Erro ao salvar ciclo'); }
  };

  const handleSaveObjective = async () => {
    if (!editingObj.title?.trim()) return toast.error('Título obrigatório');
    try {
      if (editingObj.id) {
        await updateObjective.mutateAsync({ id: editingObj.id, ...editingObj });
        toast.success('Objetivo atualizado');
      } else {
        await createObjective.mutateAsync({ ...editingObj, cycle_id: cycleId });
        toast.success('Objetivo criado');
      }
      setObjDialogOpen(false);
    } catch { toast.error('Erro ao salvar objetivo'); }
  };

  const handleSaveKr = async () => {
    if (!editingKr.title?.trim()) return toast.error('Resultado-chave obrigatório');
    try {
      if (editingKr.id) {
        await updateKeyResult.mutateAsync({ id: editingKr.id, ...editingKr });
        toast.success('Resultado-chave atualizado');
      } else {
        await createKeyResult.mutateAsync(editingKr);
        toast.success('Resultado-chave criado');
      }
      setKrDialogOpen(false);
    } catch { toast.error('Erro ao salvar resultado-chave'); }
  };

  const handleQuickStatusChange = async (krId: string, newStatus: string) => {
    try {
      const kr = keyResults.find(k => k.id === krId);
      let finalStatus = newStatus;
      if (newStatus === 'finalizado' && kr?.end_date) {
        const end = parseISO(kr.end_date);
        end.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (today > end) finalStatus = 'finalizado_com_atraso';
      }
      const updates: any = { id: krId, activity_status: finalStatus };
      if (['finalizado', 'finalizado_com_atraso'].includes(finalStatus) && kr) {
        updates.current_value = kr.target_value;
        updates.delivery_date = new Date().toISOString().split('T')[0];
      }
      await updateKeyResult.mutateAsync(updates);
      if (kr) {
        const objKrs = keyResults.filter(k => k.objective_id === kr.objective_id);
        const totalProgress = objKrs.reduce((sum, k) => {
          const cv = k.id === krId && ['finalizado', 'finalizado_com_atraso'].includes(finalStatus) ? k.target_value : k.current_value;
          const range = k.target_value - k.start_value;
          if (range === 0) return sum;
          return sum + Math.max(0, Math.min(((cv - k.start_value) / range) * 100, 100));
        }, 0);
        const avg = objKrs.length > 0 ? Math.round(totalProgress / objKrs.length) : 0;
        await updateObjective.mutateAsync({ id: kr.objective_id, progress: avg });
      }
      toast.success('Status atualizado');
    } catch { toast.error('Erro ao atualizar status'); }
  };

  /* ═══════════════════════ RENDER ═══════════════════════ */

  return (
    <div className="space-y-5">

      {/* ── Cycle Selector ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {cycles.map(c => (
            <Button key={c.id} variant={c.id === activeCycle?.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCycleId(c.id)} className="gap-1.5 h-8 text-xs">
              <Calendar className="h-3 w-3" />
              {c.name}
            </Button>
          ))}
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => { setEditingCycle({ type: 'annual', status: 'active' }); setCycleDialogOpen(true); }} className="gap-1.5 h-8 text-xs border-dashed">
              <Plus className="h-3 w-3" /> Ciclo
            </Button>
          )}
        </div>
      </div>

      {/* ── Timeline + Stats ── */}
      {activeCycle && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2 rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium flex items-center gap-1.5">
                {canManage && (
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setEditingCycle(activeCycle); setCycleDialogOpen(true); }}>
                    <Pencil className="h-2.5 w-2.5" />
                  </Button>
                )}
                {activeCycle.name}
              </span>
              <span className="text-muted-foreground tabular-nums"><strong className="text-foreground">{daysRemaining}</strong> dias restantes</span>
            </div>
            <Progress value={elapsedPct} className="h-1.5" />
            <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
              <span>{format(parseISO(activeCycle.starts_at), 'dd MMM yy', { locale: ptBR })}</span>
              <span>{Math.round(elapsedPct)}%</span>
              <span>{format(parseISO(activeCycle.ends_at), 'dd MMM yy', { locale: ptBR })}</span>
            </div>
          </div>
          <StatCard value={`${stats.pct}%`} label="Progresso Geral" color={stats.pct >= 70 ? 'text-emerald-500' : stats.pct >= 40 ? 'text-amber-500' : 'text-muted-foreground'} />
          <StatCard value={`${stats.finalizados}/${stats.total}`} label="Resultados Concluídos" color="text-emerald-500" />
        </div>
      )}

      {/* ── New Objective button ── */}
      {canManage && cycleId && (
        <div className="flex justify-end">
          <Button onClick={() => { setEditingObj({ priority: 'media', status: 'on_track', progress: 0, category: 'Operacional' }); setObjDialogOpen(true); }} className="gap-1.5 h-8 text-xs" size="sm">
            <Plus className="h-3.5 w-3.5" /> Novo Objetivo
          </Button>
        </div>
      )}

      {/* ── Empty ── */}
      {cycleObjectives.length === 0 && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Target className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mt-4">Monte seu Plano de Ação</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">Crie objetivos e defina resultados-chave com indicadores e metas.</p>
          </CardContent>
        </Card>
      )}

      {/* ══════════ MAIN TABLE — Spreadsheet style ══════════ */}
      {tableData.length > 0 && (
        <div className="rounded-xl overflow-hidden border bg-card shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)]">
          {/* Table Header */}
          <div className="grid grid-cols-12 bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider">
            <div className="col-span-3 px-4 py-3">Objetivo</div>
            <div className="col-span-4 px-4 py-3">Resultados-Chave</div>
            <div className="col-span-3 px-4 py-3">Indicadores</div>
            <div className="col-span-1 px-4 py-3 text-center">Meta</div>
            <div className="col-span-1 px-4 py-3 text-center">Status</div>
          </div>

          {/* Table Body */}
          {tableData.map(({ objective: obj, keyResults: krs }, objIdx) => {
            const rowCount = Math.max(krs.length, 1);

            return (
              <div key={obj.id} className={cn("border-t border-border", objIdx % 2 === 0 ? 'bg-card' : 'bg-muted/20')}>
                <div className="grid grid-cols-12">
                  {/* OBJETIVO cell — spans all KR rows */}
                  <div className="col-span-3 px-4 py-4 border-r border-border/40 flex flex-col justify-center" style={{ gridRow: `span ${rowCount}` }}>
                    <p className="text-sm font-semibold leading-snug text-foreground">{obj.title}</p>
                    {obj.description && (
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{obj.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Progress value={obj.progress} className="h-1.5 flex-1" />
                      <span className="text-[11px] font-bold tabular-nums text-foreground">{Math.round(obj.progress)}%</span>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1 mt-2">
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-1.5" onClick={() => { setEditingObj(obj); setObjDialogOpen(true); }}>
                          <Pencil className="h-2.5 w-2.5" /> Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-1.5 text-destructive" onClick={() => { if (confirm('Excluir objetivo?')) deleteObjective.mutateAsync(obj.id); }}>
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* KR rows */}
                  <div className="col-span-9">
                    {krs.length > 0 ? krs.map((kr, krIdx) => {
                      const linkedKpi = kr.kpi_id ? kpis.find(k => k.id === kr.kpi_id) : null;
                      const indicatorText = linkedKpi?.name || kr.description || kr.unit || '—';
                      const metaText = `${kr.target_value}${kr.unit ? (kr.unit === '%' ? '%' : ` ${kr.unit}`) : ''}`;
                      const st = ACTIVITY_STATUSES[kr.activity_status] || ACTIVITY_STATUSES.a_iniciar;
                      const StIcon = st.icon;
                      const pct = kr.target_value - kr.start_value > 0
                        ? Math.round(((kr.current_value - kr.start_value) / (kr.target_value - kr.start_value)) * 100)
                        : 0;

                      return (
                        <div
                          key={kr.id}
                          className={cn(
                            "grid grid-cols-9 items-center",
                            krIdx > 0 && "border-t border-border/30",
                            "hover:bg-muted/30 transition-colors group"
                          )}
                        >
                          {/* RESULTADO-CHAVE */}
                          <div className="col-span-4 px-4 py-3 border-r border-border/30">
                            <p className="text-xs leading-snug">{kr.title}</p>
                            {kr.responsible_name && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">👤 {kr.responsible_name}</p>
                            )}
                          </div>

                          {/* INDICADORES */}
                          <div className="col-span-3 px-4 py-3 border-r border-border/30">
                            <p className="text-xs text-muted-foreground leading-snug">{indicatorText}</p>
                          </div>

                          {/* META */}
                          <div className="col-span-1 px-4 py-3 text-center border-r border-border/30">
                            <span className="text-xs font-bold tabular-nums">{metaText}</span>
                          </div>

                          {/* STATUS */}
                          <div className="col-span-1 px-3 py-3 text-center">
                            {canManage ? (
                              <Select value={kr.activity_status} onValueChange={v => handleQuickStatusChange(kr.id, v)}>
                                <SelectTrigger className={cn("h-6 text-[10px] font-semibold border gap-0.5 px-1.5 w-auto mx-auto", st.bg)}>
                                  <StIcon className="h-3 w-3" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(ACTIVITY_STATUSES).map(([k, v]) => (
                                    <SelectItem key={k} value={k}>
                                      <div className="flex items-center gap-2"><v.icon className={cn("h-3 w-3", v.color)} />{v.label}</div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline" className={cn('text-[10px] gap-1', st.bg)}>
                                <StIcon className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>

                          {/* Edit/Delete on hover */}
                          {canManage && (
                            <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5" style={{ position: 'relative', gridColumn: 'auto', display: 'none' }}>
                            </div>
                          )}
                        </div>
                      );
                    }) : (
                      <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                        Nenhum resultado-chave cadastrado
                      </div>
                    )}

                    {/* Add KR button */}
                    {canManage && (
                      <div className="border-t border-border/30 px-4 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] gap-1 px-2 border-dashed border"
                          onClick={() => {
                            setEditingKr({
                              objective_id: obj.id,
                              start_value: 0, target_value: 100, current_value: 0,
                              confidence_level: 70, unit: '%', status: 'on_track',
                              activity_status: 'a_iniciar',
                            });
                            setKrDialogOpen(true);
                          }}
                        >
                          <Plus className="h-2.5 w-2.5" /> Resultado-Chave
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════ DIALOGS ══════════ */}

      {/* Cycle Dialog */}
      <Dialog open={cycleDialogOpen} onOpenChange={setCycleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingCycle.id ? 'Editar Ciclo' : 'Novo Ciclo OKR'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input value={editingCycle.name || ''} onChange={e => setEditingCycle(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Plano de Ação 2026" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={editingCycle.type || 'annual'} onValueChange={v => setEditingCycle(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{cycleTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={editingCycle.status || 'active'} onValueChange={v => setEditingCycle(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Início</Label>
                <Input type="date" value={editingCycle.starts_at || ''} onChange={e => setEditingCycle(p => ({ ...p, starts_at: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Fim</Label>
                <Input type="date" value={editingCycle.ends_at || ''} onChange={e => setEditingCycle(p => ({ ...p, ends_at: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCycleDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCycle}>{editingCycle.id ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Objective Dialog */}
      <Dialog open={objDialogOpen} onOpenChange={setObjDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingObj.id ? 'Editar Objetivo' : 'Novo Objetivo'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Título do Objetivo</Label>
              <Textarea value={editingObj.title || ''} onChange={e => setEditingObj(p => ({ ...p, title: e.target.value }))} rows={3} placeholder="Ex: Aumentar o uso e pertencimento tecnológico e a infraestrutura digital..." />
            </div>
            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea value={editingObj.description || ''} onChange={e => setEditingObj(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Responsável</Label>
                <Input value={editingObj.responsible_name || ''} onChange={e => setEditingObj(p => ({ ...p, responsible_name: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Área</Label>
                <Input value={editingObj.area || ''} onChange={e => setEditingObj(p => ({ ...p, area: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObjDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveObjective}>{editingObj.id ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resultado-Chave Dialog */}
      <Dialog open={krDialogOpen} onOpenChange={setKrDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingKr.id ? 'Editar Resultado-Chave' : 'Novo Resultado-Chave'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Resultado-Chave</Label>
              <Textarea value={editingKr.title || ''} onChange={e => setEditingKr(p => ({ ...p, title: e.target.value }))} rows={2} placeholder="Ex: Gestão da infraestrutura de TI: Monitoramento e manutenção..." />
            </div>
            <div className="grid gap-2">
              <Label>Indicador</Label>
              <Input value={editingKr.description || ''} onChange={e => setEditingKr(p => ({ ...p, description: e.target.value }))} placeholder="Ex: % dos ativos de T.I. com controle patrimonial" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Meta (valor)</Label>
                <Input type="number" value={editingKr.target_value ?? 100} onChange={e => setEditingKr(p => ({ ...p, target_value: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-2">
                <Label>Unidade</Label>
                <Input value={editingKr.unit || '%'} onChange={e => setEditingKr(p => ({ ...p, unit: e.target.value }))} placeholder="%, un, horas" />
              </div>
              <div className="grid gap-2">
                <Label>Valor Inicial</Label>
                <Input type="number" value={editingKr.start_value ?? 0} onChange={e => setEditingKr(p => ({ ...p, start_value: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Responsável</Label>
                <Input value={editingKr.responsible_name || ''} onChange={e => setEditingKr(p => ({ ...p, responsible_name: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={editingKr.activity_status || 'a_iniciar'} onValueChange={v => setEditingKr(p => ({ ...p, activity_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY_STATUSES).map(([k, v]) => (
                      <SelectItem key={k} value={k}><div className="flex items-center gap-2"><v.icon className={cn("h-3 w-3", v.color)} />{v.label}</div></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Início</Label>
                <Input type="date" value={editingKr.start_date || ''} onChange={e => setEditingKr(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Final</Label>
                <Input type="date" value={editingKr.end_date || ''} onChange={e => setEditingKr(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-primary" />Vincular a KPI</Label>
              <Select value={editingKr.kpi_id || '__none__'} onValueChange={v => setEditingKr(p => ({ ...p, kpi_id: v === '__none__' ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum (manual)</SelectItem>
                  {kpis.filter(k => k.is_active).map(k => (
                    <SelectItem key={k.id} value={k.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: k.color }} />
                        {k.name} ({k.unit})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            {editingKr.id && (
              <Button variant="destructive" size="sm" className="mr-auto" onClick={() => { deleteKeyResult.mutateAsync(editingKr.id!); setKrDialogOpen(false); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
              </Button>
            )}
            <Button variant="outline" onClick={() => setKrDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveKr}>{editingKr.id ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
