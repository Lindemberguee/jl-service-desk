import { useState } from 'react';
import { useOkrs, type OkrCycle, type OkrObjective, type OkrKeyResult } from '@/hooks/useOkrs';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Target, Calendar, Pencil, Trash2, ChevronRight, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const cycleTypes = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semester', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
];

const statusLabels: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  on_track: { label: 'No caminho', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: TrendingUp },
  at_risk: { label: 'Em risco', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: AlertTriangle },
  behind: { label: 'Atrasado', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertTriangle },
  completed: { label: 'Concluído', color: 'bg-primary/10 text-primary border-primary/20', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: 'bg-muted text-muted-foreground', icon: Target },
};

const priorityLabels: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };

export function OkrBoard() {
  const {
    cycles, objectives, keyResults, checkins,
    createCycle, updateCycle, deleteCycle,
    createObjective, updateObjective, deleteObjective,
    createKeyResult, updateKeyResult, deleteKeyResult,
    addCheckin,
  } = useOkrs();
  const { currentRole, rolePermissions, user } = useAuth();
  const canManage = currentRole && hasPermission(currentRole, 'kpis:manage', undefined, rolePermissions);

  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [objDialogOpen, setObjDialogOpen] = useState(false);
  const [krDialogOpen, setKrDialogOpen] = useState(false);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);

  const [editingCycle, setEditingCycle] = useState<Partial<OkrCycle>>({});
  const [editingObj, setEditingObj] = useState<Partial<OkrObjective>>({});
  const [editingKr, setEditingKr] = useState<Partial<OkrKeyResult>>({});
  const [checkinKrId, setCheckinKrId] = useState<string | null>(null);
  const [checkinValue, setCheckinValue] = useState('');
  const [checkinNotes, setCheckinNotes] = useState('');
  const [checkinConfidence, setCheckinConfidence] = useState('70');

  const activeCycle = selectedCycleId
    ? cycles.find(c => c.id === selectedCycleId)
    : cycles.find(c => c.status === 'active') || cycles[0];

  const cycleId = activeCycle?.id;
  const cycleObjectives = cycleId ? objectives.filter(o => o.cycle_id === cycleId) : [];

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
    if (!editingKr.title?.trim()) return toast.error('Título obrigatório');
    try {
      if (editingKr.id) {
        await updateKeyResult.mutateAsync({ id: editingKr.id, ...editingKr });
        toast.success('Key Result atualizado');
      } else {
        await createKeyResult.mutateAsync(editingKr);
        toast.success('Key Result criado');
      }
      setKrDialogOpen(false);
    } catch { toast.error('Erro ao salvar'); }
  };

  const handleCheckin = async () => {
    if (!checkinKrId || !checkinValue) return;
    try {
      await addCheckin.mutateAsync({
        key_result_id: checkinKrId,
        value: parseFloat(checkinValue),
        confidence_level: parseFloat(checkinConfidence),
        notes: checkinNotes || null,
        recorded_by: user?.id,
      });
      // Also update current_value on key result
      await updateKeyResult.mutateAsync({
        id: checkinKrId,
        current_value: parseFloat(checkinValue),
        confidence_level: parseFloat(checkinConfidence),
      });
      toast.success('Check-in registrado');
      setCheckinDialogOpen(false);
      setCheckinValue('');
      setCheckinNotes('');
    } catch { toast.error('Erro ao registrar check-in'); }
  };

  const daysRemaining = activeCycle
    ? Math.max(0, differenceInDays(parseISO(activeCycle.ends_at), new Date()))
    : 0;
  const totalDays = activeCycle
    ? differenceInDays(parseISO(activeCycle.ends_at), parseISO(activeCycle.starts_at))
    : 1;
  const elapsedPct = totalDays > 0 ? Math.min(((totalDays - daysRemaining) / totalDays) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* Cycle Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {cycles.map(c => (
            <Button
              key={c.id}
              variant={c.id === activeCycle?.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCycleId(c.id)}
              className="gap-2"
            >
              <Calendar className="h-3.5 w-3.5" />
              {c.name}
              <Badge variant="secondary" className="text-[9px] ml-1">
                {cycleTypes.find(t => t.value === c.type)?.label}
              </Badge>
            </Button>
          ))}
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => { setEditingCycle({ type: 'quarterly', status: 'active' }); setCycleDialogOpen(true); }} className="gap-2">
              <Plus className="h-3.5 w-3.5" />
              Novo Ciclo
            </Button>
          )}
        </div>
      </div>

      {/* Cycle Progress Bar */}
      {activeCycle && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{activeCycle.name}</h3>
                {canManage && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingCycle(activeCycle); setCycleDialogOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{daysRemaining}</span> dias restantes
              </div>
            </div>
            <Progress value={elapsedPct} className="h-2" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{format(parseISO(activeCycle.starts_at), "dd MMM yyyy", { locale: ptBR })}</span>
              <span>{format(parseISO(activeCycle.ends_at), "dd MMM yyyy", { locale: ptBR })}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Objectives */}
      {canManage && cycleId && (
        <div className="flex justify-end">
          <Button onClick={() => { setEditingObj({ priority: 'media', status: 'on_track', progress: 0 }); setObjDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Objetivo
          </Button>
        </div>
      )}

      {cycleObjectives.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Target className="h-14 w-14 text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-semibold">Defina seus objetivos</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Crie objetivos e resultados-chave para acompanhar o progresso estratégico.
            </p>
          </CardContent>
        </Card>
      )}

      <Accordion type="multiple" defaultValue={cycleObjectives.map(o => o.id)} className="space-y-3">
        {cycleObjectives.map(obj => {
          const objKrs = keyResults.filter(kr => kr.objective_id === obj.id);
          const avgKrProgress = objKrs.length > 0
            ? objKrs.reduce((s, kr) => s + ((kr.current_value - kr.start_value) / (kr.target_value - kr.start_value || 1)) * 100, 0) / objKrs.length
            : obj.progress;
          const StatusInfo = statusLabels[obj.status] || statusLabels.on_track;

          return (
            <AccordionItem key={obj.id} value={obj.id} className="border rounded-lg overflow-hidden bg-card">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-3 flex-1 text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{obj.title}</span>
                      <Badge variant="outline" className={cn('text-[10px] gap-1', StatusInfo.color)}>
                        <StatusInfo.icon className="h-3 w-3" />
                        {StatusInfo.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{priorityLabels[obj.priority]}</Badge>
                    </div>
                    {obj.description && <p className="text-xs text-muted-foreground mt-0.5">{obj.description}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold">{Math.round(avgKrProgress)}%</p>
                      <p className="text-[10px] text-muted-foreground">{objKrs.length} KRs</p>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3">
                  {objKrs.map(kr => {
                    const range = kr.target_value - kr.start_value || 1;
                    const krPct = Math.min(Math.max(((kr.current_value - kr.start_value) / range) * 100, 0), 100);
                    const KrStatus = statusLabels[kr.status] || statusLabels.on_track;

                    return (
                      <div key={kr.id} className="rounded-lg border p-3 space-y-2 bg-muted/30">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium">{kr.title}</span>
                              <Badge variant="outline" className={cn('text-[9px] gap-1', KrStatus.color)}>
                                {KrStatus.label}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {canManage && (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                  setCheckinKrId(kr.id);
                                  setCheckinValue(kr.current_value.toString());
                                  setCheckinConfidence((kr.confidence_level ?? 70).toString());
                                  setCheckinDialogOpen(true);
                                }}>
                                  <TrendingUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                  setEditingKr(kr);
                                  setKrDialogOpen(true);
                                }}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteKeyResult.mutateAsync(kr.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="pl-6">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>{kr.current_value.toLocaleString('pt-BR')} / {kr.target_value.toLocaleString('pt-BR')} {kr.unit}</span>
                            <span>Confiança: {kr.confidence_level}%</span>
                          </div>
                          <Progress value={krPct} className="h-1.5" />
                        </div>
                      </div>
                    );
                  })}

                  {canManage && (
                    <div className="flex items-center gap-2 pt-1">
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                        setEditingKr({ objective_id: obj.id, start_value: 0, target_value: 100, current_value: 0, confidence_level: 70, unit: '%', status: 'on_track' });
                        setKrDialogOpen(true);
                      }}>
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar Key Result
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2" onClick={() => { setEditingObj(obj); setObjDialogOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                        Editar Objetivo
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2 text-destructive" onClick={() => deleteObjective.mutateAsync(obj.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </Button>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Cycle Dialog */}
      <Dialog open={cycleDialogOpen} onOpenChange={setCycleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingCycle.id ? 'Editar Ciclo' : 'Novo Ciclo OKR'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input value={editingCycle.name || ''} onChange={e => setEditingCycle(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Q1 2026" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={editingCycle.type || 'quarterly'} onValueChange={v => setEditingCycle(p => ({ ...p, type: v }))}>
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingObj.id ? 'Editar Objetivo' : 'Novo Objetivo'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input value={editingObj.title || ''} onChange={e => setEditingObj(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Reduzir tempo médio de resolução" />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Textarea value={editingObj.description || ''} onChange={e => setEditingObj(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Prioridade</Label>
                <Select value={editingObj.priority || 'media'} onValueChange={v => setEditingObj(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={editingObj.status || 'on_track'} onValueChange={v => setEditingObj(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObjDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveObjective}>{editingObj.id ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Key Result Dialog */}
      <Dialog open={krDialogOpen} onOpenChange={setKrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingKr.id ? 'Editar Key Result' : 'Novo Key Result'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input value={editingKr.title || ''} onChange={e => setEditingKr(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Tempo médio abaixo de 4h" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Início</Label>
                <Input type="number" value={editingKr.start_value ?? 0} onChange={e => setEditingKr(p => ({ ...p, start_value: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-2">
                <Label>Meta</Label>
                <Input type="number" value={editingKr.target_value ?? 100} onChange={e => setEditingKr(p => ({ ...p, target_value: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-2">
                <Label>Unidade</Label>
                <Input value={editingKr.unit || '%'} onChange={e => setEditingKr(p => ({ ...p, unit: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKrDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveKr}>{editingKr.id ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-in Dialog */}
      <Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Check-in</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Valor Atual</Label>
              <Input type="number" value={checkinValue} onChange={e => setCheckinValue(e.target.value)} autoFocus />
            </div>
            <div className="grid gap-2">
              <Label>Confiança (%)</Label>
              <Input type="number" min={0} max={100} value={checkinConfidence} onChange={e => setCheckinConfidence(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Observação</Label>
              <Textarea value={checkinNotes} onChange={e => setCheckinNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckinDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCheckin}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
