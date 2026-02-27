import { useState, useMemo, useEffect } from 'react';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Download, FileSpreadsheet, Save, RotateCcw } from 'lucide-react';
import { priorityLabels, statusLabels } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'ordfy_export_prefs';

interface ColumnOption {
  key: string;
  label: string;
  default: boolean;
  getValue: (wo: any) => string;
  width: number;
}

interface ExportPrefs {
  selectedColumns: string[];
  selectedResponsavel: string;
  separateByResponsavel: boolean;
  excludeConcluidas: boolean;
}

interface ExportWorkOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrders: any[];
  profiles: any[];
  customers: any[];
  locations: any[];
  units: any[];
  tenantMap: Record<string, string>;
  tenantName: string;
  primaryColor: string;
}

function loadPrefs(): ExportPrefs | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function savePrefs(prefs: ExportPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function ExportWorkOrdersDialog({
  open, onOpenChange, workOrders, profiles, customers, locations, units, tenantMap, tenantName, primaryColor,
}: ExportWorkOrdersDialogProps) {
  const { toast } = useToast();

  const getAssignedName = (id: string | null) => {
    if (!id) return '—';
    return profiles.find((p: any) => p.id === id)?.name || id.slice(0, 8);
  };
  const getRequesterName = (wo: any) => {
    if (wo.requester_id) return customers.find((c: any) => c.id === wo.requester_id)?.name || '—';
    if (wo.requester_user_id) return profiles.find((p: any) => p.id === wo.requester_user_id)?.name || '—';
    return '—';
  };
  const getLocationName = (id: string | null) => locations.find((l: any) => l.id === id)?.name || '';
  const getUnitName = (id: string | null) => units.find((u: any) => u.id === id)?.name || '';

  const ALL_COLUMNS: ColumnOption[] = [
    { key: 'code', label: 'Código', default: true, getValue: wo => wo.code, width: 20 },
    { key: 'title', label: 'Título', default: true, getValue: wo => wo.title, width: 35 },
    { key: 'description', label: 'Descrição', default: true, getValue: wo => wo.description || '', width: 45 },
    { key: 'priority', label: 'Prioridade', default: true, getValue: wo => priorityLabels[wo.priority] || wo.priority, width: 12 },
    { key: 'status', label: 'Status', default: false, getValue: wo => statusLabels[wo.status] || wo.status, width: 14 },
    { key: 'dept', label: 'Departamento', default: true, getValue: wo => tenantMap[wo.tenant_id] || '', width: 16 },
    { key: 'unit', label: 'Unidade', default: false, getValue: wo => getUnitName(wo.unit_id), width: 18 },
    { key: 'location', label: 'Local/Sala', default: true, getValue: wo => getLocationName(wo.location_id), width: 20 },
    { key: 'assigned', label: 'Responsável', default: true, getValue: wo => getAssignedName(wo.assigned_to_id), width: 20 },
    { key: 'requester', label: 'Solicitante', default: true, getValue: wo => getRequesterName(wo), width: 20 },
    { key: 'created_at', label: 'Criada em', default: true, getValue: wo => new Date(wo.created_at).toLocaleDateString('pt-BR'), width: 14 },
    { key: 'started_at', label: 'Iniciada em', default: false, getValue: wo => wo.started_at ? new Date(wo.started_at).toLocaleDateString('pt-BR') : '', width: 14 },
    { key: 'resolved_at', label: 'Resolvida em', default: false, getValue: wo => wo.resolved_at ? new Date(wo.resolved_at).toLocaleDateString('pt-BR') : '', width: 14 },
  ];

  const defaultCols = ALL_COLUMNS.filter(c => c.default).map(c => c.key);

  // Load saved prefs or defaults
  const saved = loadPrefs();
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(saved?.selectedColumns || defaultCols)
  );
  const [selectedResponsavel, setSelectedResponsavel] = useState<string>(saved?.selectedResponsavel || 'all');
  const [separateByResponsavel, setSeparateByResponsavel] = useState(saved?.separateByResponsavel ?? false);
  const [excludeConcluidas, setExcludeConcluidas] = useState(saved?.excludeConcluidas ?? true);
  const [isExporting, setIsExporting] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(!!saved);

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleSavePrefs = () => {
    savePrefs({
      selectedColumns: Array.from(selectedColumns),
      selectedResponsavel,
      separateByResponsavel,
      excludeConcluidas,
    });
    setPrefsSaved(true);
    toast({ title: 'Preferências salvas', description: 'Suas configurações de exportação foram salvas.' });
  };

  const handleResetPrefs = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSelectedColumns(new Set(defaultCols));
    setSelectedResponsavel('all');
    setSeparateByResponsavel(false);
    setExcludeConcluidas(true);
    setPrefsSaved(false);
    toast({ title: 'Preferências resetadas' });
  };

  const responsaveis = useMemo(() => {
    const ids = new Set(workOrders.map((wo: any) => wo.assigned_to_id).filter(Boolean));
    return Array.from(ids).map(id => ({
      id: id as string,
      name: getAssignedName(id as string),
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [workOrders, profiles]);

  const buildSheet = (ws: ExcelJS.Worksheet, data: any[], cols: ColumnOption[], brandHex: string, subtitle?: string) => {
    const colCount = cols.length;
    const lastCol = String.fromCharCode(64 + Math.min(colCount, 26));

    ws.mergeCells(`A1:${lastCol}1`);
    const titleCell = ws.getCell('A1');
    titleCell.value = tenantName;
    titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: `FF${brandHex}` } };
    titleCell.alignment = { vertical: 'middle' };
    ws.getRow(1).height = 36;

    ws.mergeCells(`A2:${lastCol}2`);
    const subCell = ws.getCell('A2');
    subCell.value = subtitle || `Relatório de Ordens de Serviço — ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`;
    subCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF888888' } };
    ws.getRow(2).height = 20;

    ws.mergeCells(`A3:${lastCol}3`);
    ws.getCell('A3').value = `${data.length} registro(s)`;
    ws.getCell('A3').font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF888888' } };
    ws.getRow(3).height = 18;
    ws.getRow(4).height = 8;

    const headerRow = ws.getRow(5);
    cols.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.label;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${brandHex}` } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
    headerRow.height = 26;

    data.forEach((wo, idx) => {
      const row = ws.getRow(6 + idx);
      cols.forEach((col, i) => {
        const cell = row.getCell(i + 1);
        cell.value = col.getValue(wo);
        cell.font = { name: 'Calibri', size: 10 };
        cell.alignment = { vertical: 'middle', wrapText: col.key === 'description' };
      });
      if (idx % 2 === 1) {
        cols.forEach((_, i) => {
          row.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
        });
      }
    });

    cols.forEach((col, i) => { ws.getColumn(i + 1).width = col.width; });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const brandHex = (primaryColor || '#3B82F6').replace('#', '');
      const cols = ALL_COLUMNS.filter(c => selectedColumns.has(c.key));
      const CLOSED = ['concluida', 'aprovada', 'encerrada'];

      let data = workOrders.filter((wo: any) => !wo.deleted_at);
      if (excludeConcluidas) data = data.filter((wo: any) => !CLOSED.includes(wo.status));
      if (selectedResponsavel !== 'all') {
        if (selectedResponsavel === 'unassigned') data = data.filter((wo: any) => !wo.assigned_to_id);
        else data = data.filter((wo: any) => wo.assigned_to_id === selectedResponsavel);
      }

      const wb = new ExcelJS.Workbook();
      wb.creator = tenantName;

      if (separateByResponsavel && selectedResponsavel === 'all') {
        const groups: Record<string, any[]> = {};
        data.forEach((wo: any) => {
          const name = getAssignedName(wo.assigned_to_id);
          if (!groups[name]) groups[name] = [];
          groups[name].push(wo);
        });
        Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).forEach(([name, items]) => {
          const sheetName = name.slice(0, 31).replace(/[\\/*?[\]:]/g, '');
          const ws = wb.addWorksheet(sheetName);
          buildSheet(ws, items, cols, brandHex, `OS de ${name} — ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`);
        });
      } else {
        const ws = wb.addWorksheet('Ordens de Serviço');
        buildSheet(ws, data, cols, brandHex);
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ordens-servico-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      onOpenChange(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Exportar Ordens de Serviço
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Responsável filter */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Responsável</Label>
            <Select value={selectedResponsavel} onValueChange={setSelectedResponsavel}>
              <SelectTrigger className="h-9 text-sm border-transparent bg-muted/40">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                <SelectItem value="unassigned">Sem responsável</SelectItem>
                {responsaveis.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Separar em abas por responsável</Label>
              <Switch checked={separateByResponsavel} onCheckedChange={setSeparateByResponsavel} disabled={selectedResponsavel !== 'all'} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Excluir OS concluídas/encerradas</Label>
              <Switch checked={excludeConcluidas} onCheckedChange={setExcludeConcluidas} />
            </div>
          </div>

          {/* Column selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Colunas a exportar</Label>
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 bg-muted/20 rounded-lg">
              {ALL_COLUMNS.map(col => (
                <label key={col.key} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/40 rounded px-2 py-1.5 transition-colors">
                  <Checkbox
                    checked={selectedColumns.has(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>
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
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button size="sm" className="gap-1.5" onClick={handleExport} disabled={isExporting || selectedColumns.size === 0}>
              <Download className="h-3.5 w-3.5" />
              {isExporting ? 'Exportando...' : 'Exportar Excel'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
