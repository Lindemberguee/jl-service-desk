import { useRef, useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Printer, Save, RotateCcw, Filter } from 'lucide-react';
import { priorityLabels, statusLabels } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'ordfy_print_prefs';

interface PrintPrefs {
  selectedResponsavel: string;
  excludeConcluidas: boolean;
  priorityFilter: string;
  showDescription: boolean;
  showTechnicalNote: boolean;
  showSignature: boolean;
}

interface PrintWorkOrderGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrders: any[];
  profiles: any[];
  customers: any[];
  locations: any[];
  units: any[];
  tenantName: string;
  primaryColor: string;
}

function loadPrefs(): PrintPrefs | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function savePrefsToStorage(prefs: PrintPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function PrintWorkOrderGuide({
  open, onOpenChange, workOrders, profiles, customers, locations, units, tenantName, primaryColor,
}: PrintWorkOrderGuideProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const saved = loadPrefs();
  const [selectedResponsavel, setSelectedResponsavel] = useState<string>(saved?.selectedResponsavel || 'all');
  const [excludeConcluidas, setExcludeConcluidas] = useState(saved?.excludeConcluidas ?? true);
  const [priorityFilter, setPriorityFilter] = useState<string>(saved?.priorityFilter || 'all');
  const [showDescription, setShowDescription] = useState(saved?.showDescription ?? true);
  const [showTechnicalNote, setShowTechnicalNote] = useState(saved?.showTechnicalNote ?? true);
  const [showSignature, setShowSignature] = useState(saved?.showSignature ?? true);
  const [prefsSaved, setPrefsSaved] = useState(!!saved);

  const getAssignedName = (id: string | null) => {
    if (!id) return '—';
    return profiles.find((p: any) => p.id === id)?.name || '—';
  };
  const getRequesterName = (wo: any) => {
    if (wo.requester_id) return customers.find((c: any) => c.id === wo.requester_id)?.name || '—';
    if (wo.requester_user_id) return profiles.find((p: any) => p.id === wo.requester_user_id)?.name || '—';
    return '—';
  };
  const getLocationName = (id: string | null) => locations.find((l: any) => l.id === id)?.name || '';
  const getUnitName = (id: string | null) => units.find((u: any) => u.id === id)?.name || '';

  const responsaveis = useMemo(() => {
    const ids = new Set(workOrders.map((wo: any) => wo.assigned_to_id).filter(Boolean));
    return Array.from(ids).map(id => ({ id: id as string, name: getAssignedName(id as string) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [workOrders, profiles]);

  const CLOSED = ['concluida', 'aprovada', 'encerrada'];

  const filteredOrders = useMemo(() => {
    let data = workOrders.filter((wo: any) => !wo.deleted_at);
    if (excludeConcluidas) data = data.filter((wo: any) => !CLOSED.includes(wo.status));
    if (selectedResponsavel !== 'all') {
      if (selectedResponsavel === 'unassigned') data = data.filter((wo: any) => !wo.assigned_to_id);
      else data = data.filter((wo: any) => wo.assigned_to_id === selectedResponsavel);
    }
    if (priorityFilter !== 'all') data = data.filter((wo: any) => wo.priority === priorityFilter);
    return data;
  }, [workOrders, excludeConcluidas, selectedResponsavel, priorityFilter]);

  const handleSavePrefs = () => {
    savePrefsToStorage({ selectedResponsavel, excludeConcluidas, priorityFilter, showDescription, showTechnicalNote, showSignature });
    setPrefsSaved(true);
    toast({ title: 'Preferências salvas', description: 'Suas configurações de impressão foram salvas.' });
  };

  const handleResetPrefs = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSelectedResponsavel('all');
    setExcludeConcluidas(true);
    setPriorityFilter('all');
    setShowDescription(true);
    setShowTechnicalNote(true);
    setShowSignature(true);
    setPrefsSaved(false);
    toast({ title: 'Preferências resetadas' });
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>Guia de Serviço — ${tenantName}</title>
      <style>
        @media print { @page { margin: 12mm 10mm; size: A4; } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Calibri, sans-serif; font-size: 11px; color: #222; }
        .page { page-break-after: always; padding: 0; }
        .page:last-child { page-break-after: auto; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid ${primaryColor}; padding-bottom: 8px; margin-bottom: 12px; }
        .header h1 { font-size: 16px; color: ${primaryColor}; }
        .header .code { font-size: 14px; font-weight: 700; }
        .header .date { font-size: 10px; color: #888; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin-bottom: 12px; }
        .field { border-bottom: 1px solid #e5e5e5; padding: 4px 0; }
        .field-label { font-size: 9px; text-transform: uppercase; color: #888; font-weight: 600; letter-spacing: 0.5px; }
        .field-value { font-size: 11px; margin-top: 1px; }
        .desc-section { margin-bottom: 14px; }
        .desc-section h3 { font-size: 10px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 4px; letter-spacing: 0.5px; }
        .desc-box { border: 1px solid #e5e5e5; border-radius: 4px; padding: 8px; min-height: 50px; font-size: 11px; white-space: pre-wrap; }
        .notes-section { margin-top: 14px; }
        .notes-section h3 { font-size: 10px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 4px; letter-spacing: 0.5px; }
        .notes-box { border: 1px solid #e5e5e5; border-radius: 4px; min-height: 80px; padding: 8px; }
        .signature-area { display: flex; gap: 40px; margin-top: 30px; padding-top: 8px; }
        .sig-line { flex: 1; text-align: center; }
        .sig-line .line { border-top: 1px solid #333; margin-bottom: 4px; margin-top: 40px; }
        .sig-line span { font-size: 9px; color: #888; text-transform: uppercase; }
        .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #aaa; border-top: 1px solid #eee; padding-top: 6px; }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Guia de Serviço
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="space-y-4 border border-border/50 rounded-lg p-3 bg-muted/10">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filtros da Guia
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Responsável</Label>
              <Select value={selectedResponsavel} onValueChange={setSelectedResponsavel}>
                <SelectTrigger className="h-8 text-xs border-transparent bg-muted/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="unassigned">Sem responsável</SelectItem>
                  {responsaveis.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Prioridade</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-8 text-xs border-transparent bg-muted/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(priorityLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Excluir concluídas/encerradas</Label>
              <Switch checked={excludeConcluidas} onCheckedChange={setExcludeConcluidas} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Incluir descrição</Label>
              <Switch checked={showDescription} onCheckedChange={setShowDescription} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Incluir nota técnica</Label>
              <Switch checked={showTechnicalNote} onCheckedChange={setShowTechnicalNote} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Área de assinatura</Label>
              <Switch checked={showSignature} onCheckedChange={setShowSignature} />
            </div>
          </div>
        </div>

        {/* Hidden print content */}
        <div ref={printRef} className="hidden">
          {filteredOrders.map((wo: any) => (
            <div key={wo.id} className="page">
              <div className="header">
                <div>
                  <h1>{tenantName}</h1>
                  <span className="date">Guia de Serviço</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="code">{wo.code}</div>
                  <div className="date">{new Date(wo.created_at).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>

              <div className="grid">
                <div className="field">
                  <div className="field-label">Título</div>
                  <div className="field-value" style={{ fontWeight: 600 }}>{wo.title}</div>
                </div>
                <div className="field">
                  <div className="field-label">Prioridade</div>
                  <div className="field-value">{priorityLabels[wo.priority] || wo.priority}</div>
                </div>
                <div className="field">
                  <div className="field-label">Responsável</div>
                  <div className="field-value">{getAssignedName(wo.assigned_to_id)}</div>
                </div>
                <div className="field">
                  <div className="field-label">Solicitante</div>
                  <div className="field-value">{getRequesterName(wo)}</div>
                </div>
                <div className="field">
                  <div className="field-label">Local / Sala</div>
                  <div className="field-value">{getLocationName(wo.location_id) || '—'}</div>
                </div>
                <div className="field">
                  <div className="field-label">Unidade</div>
                  <div className="field-value">{getUnitName(wo.unit_id) || '—'}</div>
                </div>
              </div>

              {showDescription && (
                <div className="desc-section">
                  <h3>Descrição</h3>
                  <div className="desc-box">{wo.description || 'Sem descrição'}</div>
                </div>
              )}

              {showTechnicalNote && wo.technical_note && (
                <div className="desc-section">
                  <h3>Nota Técnica</h3>
                  <div className="desc-box">{wo.technical_note}</div>
                </div>
              )}

              <div className="notes-section">
                <h3>Observações do Técnico</h3>
                <div className="notes-box"></div>
              </div>

              {showSignature && (
                <div className="signature-area">
                  <div className="sig-line">
                    <div className="line"></div>
                    <span>Assinatura do Técnico</span>
                  </div>
                  <div className="sig-line">
                    <div className="line"></div>
                    <span>Assinatura do Solicitante</span>
                  </div>
                </div>
              )}

              <div className="footer">
                {tenantName} — Guia gerada em {new Date().toLocaleString('pt-BR')}
              </div>
            </div>
          ))}
        </div>

        {/* Visual preview */}
        <div className="space-y-2 max-h-[250px] overflow-y-auto">
          {filteredOrders.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma OS encontrada com os filtros selecionados.</p>
          )}
          {filteredOrders.map((wo: any) => (
            <div key={wo.id} className="border border-border/50 rounded-lg p-2.5 text-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs text-muted-foreground">{wo.code}</span>
                  <p className="font-medium text-xs">{wo.title}</p>
                </div>
                <span className="text-xs text-muted-foreground">{getAssignedName(wo.assigned_to_id)}</span>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-1.5 mr-auto">
            <Button variant="ghost" size="sm" className="gap-1 text-xs h-8" onClick={handleSavePrefs}>
              <Save className="h-3 w-3" />
              {prefsSaved ? 'Atualizar' : 'Salvar'}
            </Button>
            {prefsSaved && (
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-8 text-muted-foreground" onClick={handleResetPrefs}>
                <RotateCcw className="h-3 w-3" />
                Resetar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Fechar</Button>
            <Button size="sm" className="gap-1.5" onClick={handlePrint} disabled={filteredOrders.length === 0}>
              <Printer className="h-3.5 w-3.5" />
              Imprimir {filteredOrders.length} Guia(s)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
