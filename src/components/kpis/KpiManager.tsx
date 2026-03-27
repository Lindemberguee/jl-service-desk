import { useState } from 'react';
import { useKpis, type Kpi } from '@/hooks/useKpis';
import { useOkrs } from '@/hooks/useOkrs';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { getEffectiveKpiValue, getAutoKpiValue } from '@/lib/kpi-auto';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, BarChart3, TrendingUp, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const categories = ['Operacional', 'Financeiro', 'Qualidade', 'Satisfação', 'Produtividade', 'SLA'];

const directions = [
  { value: 'higher_is_better', label: 'Maior é melhor' },
  { value: 'lower_is_better', label: 'Menor é melhor' },
  { value: 'target_is_best', label: 'Meta exata' },
];

const dataSources = [
  { value: 'manual', label: 'Manual' },
  { value: 'auto_os', label: 'Automático (OS)' },
  { value: 'auto_stock', label: 'Automático (Estoque)' },
  { value: 'auto_maintenance', label: 'Automático (Manutenção)' },
  { value: 'auto_sla', label: 'Automático (SLA)' },
];

const defaultKpi: Partial<Kpi> = {
  name: '',
  description: '',
  unit: '%',
  category: 'Operacional',
  direction: 'higher_is_better',
  target_value: 100,
  data_source: 'manual',
  is_active: true,
  color: '#3B82F6',
};

export function KpiManager() {
  const { kpis, entries, createKpi, updateKpi, deleteKpi, addEntry } = useKpis();
  const { keyResults } = useOkrs();
  const { currentRole, rolePermissions, user } = useAuth();
  const canManage = currentRole && hasPermission(currentRole, 'kpis:manage', undefined, rolePermissions);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<Partial<Kpi>>(defaultKpi);
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [entryValue, setEntryValue] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleSave = async () => {
    if (!editingKpi.name?.trim()) return toast.error('Nome é obrigatório');

    try {
      if (editingKpi.id) {
        await updateKpi.mutateAsync({ id: editingKpi.id, ...editingKpi });
        toast.success('KPI atualizado');
      } else {
        await createKpi.mutateAsync({ ...editingKpi, created_by: user?.id });
        toast.success('KPI criado');
      }

      setDialogOpen(false);
      setEditingKpi(defaultKpi);
    } catch {
      toast.error('Erro ao salvar KPI');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteKpi.mutateAsync(id);
      toast.success('KPI excluído');
    } catch {
      toast.error('Erro ao excluir');
    }
  };

  const handleAddEntry = async () => {
    if (!selectedKpiId || !entryValue) return;

    try {
      await addEntry.mutateAsync({
        kpi_id: selectedKpiId,
        value: parseFloat(entryValue),
        notes: entryNotes || null,
        period_start: entryDate,
        period_end: entryDate,
        recorded_by: user?.id,
      });

      toast.success('Valor registrado');
      setEntryDialogOpen(false);
      setEntryValue('');
      setEntryNotes('');
    } catch {
      toast.error('Erro ao registrar valor');
    }
  };

  const latestEntries = new Map<string, number>();
  for (const e of entries) {
    if (!latestEntries.has(e.kpi_id)) latestEntries.set(e.kpi_id, e.value);
  }

  const grouped = new Map<string, Kpi[]>();
  kpis.forEach((k) => {
    const list = grouped.get(k.category) || [];
    list.push(k);
    grouped.set(k.category, list);
  });

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>Como funciona:</strong> Indicadores sem vínculo continuam manuais. Quando um indicador está
              vinculado a atividades do OKR, o card passa a exibir o <strong>cálculo automático</strong> com base no
              progresso das atividades concluídas.
            </span>
          </div>

          <Button
            onClick={() => {
              setEditingKpi(defaultKpi);
              setDialogOpen(true);
            }}
            className="gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Novo Indicador
          </Button>
        </div>
      )}

      {kpis.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-14 w-14 text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-semibold">Comece a medir o que importa</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Crie KPIs para acompanhar a performance operacional do seu departamento.
            </p>
          </CardContent>
        </Card>
      )}

      {Array.from(grouped.entries()).map(([category, categoryKpis]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{category}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {categoryKpis.map((kpi) => {
              const currentValue = getEffectiveKpiValue(kpi, entries, keyResults);
              const autoInfo = getAutoKpiValue(kpi, keyResults);
              const pct = kpi.target_value ? Math.min((currentValue / kpi.target_value) * 100, 100) : 0;

              return (
                <Card
                  key={kpi.id}
                  className={cn('relative overflow-hidden transition-all hover:shadow-md', !kpi.is_active && 'opacity-50')}
                >
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: kpi.color }} />

                  <CardHeader className="pb-2 pl-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm">{kpi.name}</CardTitle>
                        {kpi.description && <p className="text-xs text-muted-foreground mt-0.5">{kpi.description}</p>}
                      </div>

                      <div className="flex items-center gap-1">
                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setSelectedKpiId(kpi.id);
                                setEntryDialogOpen(true);
                              }}
                            >
                              <TrendingUp className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingKpi(kpi);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(kpi.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pl-5">
                    <div className="flex items-end gap-2 mb-3">
                      <span className="text-3xl font-bold">{currentValue.toLocaleString('pt-BR')}</span>
                      <span className="text-sm text-muted-foreground mb-1">{kpi.unit}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{pct.toFixed(0)}% da meta</span>
                        <span>
                          {kpi.target_value.toLocaleString('pt-BR')} {kpi.unit}
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">
                        {autoInfo ? 'Automático (OKR)' : dataSources.find((d) => d.value === kpi.data_source)?.label}
                      </Badge>

                      <Badge variant="outline" className="text-[10px]">
                        {directions.find((d) => d.value === kpi.direction)?.label}
                      </Badge>

                      {autoInfo && (
                        <Badge variant="secondary" className="text-[10px]">
                          {autoInfo.completedCount}/{autoInfo.linkedCount} atividades
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingKpi.id ? 'Editar Indicador' : 'Novo Indicador'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input
                value={editingKpi.name || ''}
                onChange={(e) => setEditingKpi((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Taxa de Resolução"
              />
            </div>

            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Textarea
                value={editingKpi.description || ''}
                onChange={(e) => setEditingKpi((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição opcional..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Unidade</Label>
                <Input
                  value={editingKpi.unit || ''}
                  onChange={(e) => setEditingKpi((prev) => ({ ...prev, unit: e.target.value }))}
                  placeholder="%, h, un"
                />
              </div>

              <div className="grid gap-2">
                <Label>Categoria</Label>
                <Select
                  value={editingKpi.category}
                  onValueChange={(v) => setEditingKpi((prev) => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Meta</Label>
                <Input
                  type="number"
                  value={editingKpi.target_value ?? ''}
                  onChange={(e) =>
                    setEditingKpi((prev) => ({ ...prev, target_value: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>Direção</Label>
                <Select
                  value={editingKpi.direction}
                  onValueChange={(v) => setEditingKpi((prev) => ({ ...prev, direction: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {directions.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Limiar de Alerta</Label>
                <Input
                  type="number"
                  value={editingKpi.warning_threshold ?? ''}
                  onChange={(e) =>
                    setEditingKpi((prev) => ({
                      ...prev,
                      warning_threshold: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  placeholder="Opcional"
                />
              </div>

              <div className="grid gap-2">
                <Label>Limiar Crítico</Label>
                <Input
                  type="number"
                  value={editingKpi.critical_threshold ?? ''}
                  onChange={(e) =>
                    setEditingKpi((prev) => ({
                      ...prev,
                      critical_threshold: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Fonte de Dados</Label>
                <Select
                  value={editingKpi.data_source}
                  onValueChange={(v) => setEditingKpi((prev) => ({ ...prev, data_source: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dataSources.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Cor</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingKpi.color || '#3B82F6'}
                    onChange={(e) => setEditingKpi((prev) => ({ ...prev, color: e.target.value }))}
                    className="h-9 w-12 rounded cursor-pointer border border-border"
                  />
                  <Input
                    value={editingKpi.color || ''}
                    onChange={(e) => setEditingKpi((prev) => ({ ...prev, color: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={editingKpi.is_active ?? true}
                onCheckedChange={(v) => setEditingKpi((prev) => ({ ...prev, is_active: v }))}
              />
              <Label>Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={createKpi.isPending || updateKpi.isPending}>
              {editingKpi.id ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Valor</DialogTitle>
          </DialogHeader>

          {(() => {
            const selectedKpi = kpis.find((k) => k.id === selectedKpiId);
            const kpiEntries = entries.filter((e) => e.kpi_id === selectedKpiId).slice(0, 5);
            const currentValue =
              selectedKpi && selectedKpiId
                ? getEffectiveKpiValue(selectedKpi, entries, keyResults)
                : 0;
            const autoInfo = selectedKpi ? getAutoKpiValue(selectedKpi, keyResults) : null;

            return (
              <div className="grid gap-4">
                {selectedKpi && (
                  <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
                    <p className="text-sm font-medium">{selectedKpi.name}</p>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>
                        Atual:{' '}
                        <strong className="text-foreground">
                          {currentValue.toLocaleString('pt-BR')} {selectedKpi.unit}
                        </strong>
                      </span>
                      <span>
                        Meta:{' '}
                        <strong className="text-foreground">
                          {selectedKpi.target_value.toLocaleString('pt-BR')} {selectedKpi.unit}
                        </strong>
                      </span>
                    </div>

                    {autoInfo && (
                      <div className="text-[10px] text-muted-foreground">
                        Cálculo automático via OKR: {autoInfo.completedCount}/{autoInfo.linkedCount} atividades concluídas
                      </div>
                    )}

                    {!autoInfo && kpiEntries.length > 0 && (
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Últimos: {kpiEntries.map((e) => `${e.value} (${format(new Date(e.period_end), 'dd/MM')})`).join(' → ')}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>Data</Label>
                  <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label>Novo Valor {selectedKpi ? `(${selectedKpi.unit})` : ''}</Label>
                  <Input
                    type="number"
                    value={entryValue}
                    onChange={(e) => setEntryValue(e.target.value)}
                    placeholder="0"
                    autoFocus
                    disabled={!!autoInfo}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {autoInfo
                      ? 'Este indicador está sendo calculado automaticamente pelas atividades vinculadas.'
                      : 'Este valor substituirá o valor exibido no card do indicador.'}
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label>Observação</Label>
                  <Textarea
                    value={entryNotes}
                    onChange={(e) => setEntryNotes(e.target.value)}
                    placeholder="Opcional..."
                    rows={2}
                    disabled={!!autoInfo}
                  />
                </div>
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddEntry}
              disabled={addEntry.isPending || !!(selectedKpiId && kpis.find((k) => k.id === selectedKpiId) && getAutoKpiValue(kpis.find((k) => k.id === selectedKpiId)!, keyResults))}
            >
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
