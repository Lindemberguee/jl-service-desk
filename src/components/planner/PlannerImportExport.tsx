import { useState, useRef } from 'react';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PlannerPlan, PlannerBucket, PlannerTask } from '@/hooks/usePlanner';

interface Props {
  plans: PlannerPlan[];
  selectedPlan: PlannerPlan | null;
  onImportComplete: () => void;
  id?: string;
}

const PRIORITY_MAP: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const PRIORITY_REVERSE: Record<string, string> = {
  urgente: 'urgent',
  alta: 'high',
  média: 'medium',
  media: 'medium',
  baixa: 'low',
};

export function PlannerExportButton({ plans, selectedPlan, id }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!selectedPlan) {
      toast.error('Selecione um plano para exportar');
      return;
    }

    setExporting(true);
    try {
      // Fetch buckets and tasks for the selected plan
      const [bucketsRes, tasksRes] = await Promise.all([
        supabase.from('planner_buckets').select('*').eq('plan_id', selectedPlan.id).order('sort_order'),
        supabase.from('planner_tasks').select('*').eq('plan_id', selectedPlan.id).order('sort_order'),
      ]);

      const buckets = (bucketsRes.data || []) as PlannerBucket[];
      const tasks = (tasksRes.data || []) as unknown as PlannerTask[];

      const wb = new ExcelJS.Workbook();
      wb.creator = 'Ordfy Planner';
      wb.created = new Date();

      // -- Sheet 1: Plan Info --
      const infoSheet = wb.addWorksheet('Plano');
      infoSheet.columns = [
        { header: 'Campo', key: 'field', width: 20 },
        { header: 'Valor', key: 'value', width: 50 },
      ];
      infoSheet.addRows([
        { field: 'Nome', value: selectedPlan.name },
        { field: 'Escopo', value: selectedPlan.scope === 'personal' ? 'Pessoal' : 'Equipe' },
        { field: 'Descrição', value: selectedPlan.description || '' },
        { field: 'Criado em', value: format(new Date(selectedPlan.created_at), 'dd/MM/yyyy HH:mm') },
      ]);
      styleHeaderRow(infoSheet);

      // -- Sheet 2: Buckets --
      const bucketsSheet = wb.addWorksheet('Colunas');
      bucketsSheet.columns = [
        { header: 'Ordem', key: 'order', width: 10 },
        { header: 'Nome da Coluna', key: 'name', width: 35 },
        { header: 'Qtd. Tarefas', key: 'count', width: 15 },
      ];
      buckets.forEach((b, i) => {
        bucketsSheet.addRow({
          order: i + 1,
          name: b.name,
          count: tasks.filter(t => t.bucket_id === b.id).length,
        });
      });
      styleHeaderRow(bucketsSheet);

      // -- Sheet 3: Tasks --
      const tasksSheet = wb.addWorksheet('Tarefas');
      tasksSheet.columns = [
        { header: 'Coluna', key: 'bucket', width: 20 },
        { header: 'Título', key: 'title', width: 40 },
        { header: 'Descrição', key: 'description', width: 50 },
        { header: 'Prioridade', key: 'priority', width: 12 },
        { header: 'Data Início', key: 'start_date', width: 14 },
        { header: 'Data Entrega', key: 'due_date', width: 14 },
        { header: 'Concluída em', key: 'completed_at', width: 18 },
        { header: 'Etiquetas', key: 'labels', width: 25 },
        { header: 'Checklist', key: 'checklist', width: 40 },
      ];

      const bucketMap = new Map(buckets.map(b => [b.id, b.name]));

      tasks.forEach(task => {
        const checklist = Array.isArray(task.checklist)
          ? task.checklist.map((c: any) => `${c.checked ? '✅' : '⬜'} ${c.text}`).join('\n')
          : '';
        const labels = Array.isArray(task.labels)
          ? task.labels.map((l: any) => l.name).join(', ')
          : '';

        const row = tasksSheet.addRow({
          bucket: bucketMap.get(task.bucket_id) || '',
          title: task.title,
          description: task.description || '',
          priority: PRIORITY_MAP[task.priority] || task.priority,
          start_date: task.start_date ? format(new Date(task.start_date), 'dd/MM/yyyy') : '',
          due_date: task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy') : '',
          completed_at: task.completed_at ? format(new Date(task.completed_at), 'dd/MM/yyyy HH:mm') : '',
          labels,
          checklist,
        });

        // Color priority
        const prioColors: Record<string, string> = {
          urgent: 'FFE74C3C',
          high: 'FFF39C12',
          medium: 'FF3498DB',
          low: 'FF95A5A6',
        };
        const prioCell = row.getCell('priority');
        if (prioColors[task.priority]) {
          prioCell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
          prioCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: prioColors[task.priority] } };
        }
      });

      styleHeaderRow(tasksSheet);
      tasksSheet.getColumn('checklist').alignment = { wrapText: true, vertical: 'top' };
      tasksSheet.getColumn('description').alignment = { wrapText: true, vertical: 'top' };

      // Generate file
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `planner_${selectedPlan.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Plano exportado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao exportar plano');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      id={id}
      size="sm"
      variant="outline"
      className="h-8 text-xs gap-1.5"
      onClick={handleExport}
      disabled={exporting || !selectedPlan}
    >
      {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      Exportar
    </Button>
  );
}

export function PlannerImportButton({ onImportComplete, id }: Pick<Props, 'onImportComplete' | 'id'>) {
  const { currentTenantId, user } = useAuth();
  const [importing, setImporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ name: string; scope: string; buckets: string[]; tasks: any[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => fileRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const wb = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await wb.xlsx.load(buffer);

      // Parse plan info
      const infoSheet = wb.getWorksheet('Plano');
      let planName = 'Plano Importado';
      let planScope = 'team';
      let planDesc = '';

      if (infoSheet) {
        infoSheet.eachRow((row, rowNum) => {
          if (rowNum <= 1) return;
          const field = String(row.getCell(1).value || '').toLowerCase();
          const value = String(row.getCell(2).value || '');
          if (field.includes('nome')) planName = value;
          if (field.includes('escopo')) planScope = value.toLowerCase().includes('pessoal') ? 'personal' : 'team';
          if (field.includes('descri')) planDesc = value;
        });
      }

      // Parse buckets
      const bucketsSheet = wb.getWorksheet('Colunas');
      const bucketNames: string[] = [];
      if (bucketsSheet) {
        bucketsSheet.eachRow((row, rowNum) => {
          if (rowNum <= 1) return;
          const name = String(row.getCell(2).value || '').trim();
          if (name) bucketNames.push(name);
        });
      }
      if (bucketNames.length === 0) bucketNames.push('A fazer', 'Em andamento', 'Concluído');

      // Parse tasks
      const tasksSheet = wb.getWorksheet('Tarefas');
      const tasks: any[] = [];
      if (tasksSheet) {
        tasksSheet.eachRow((row, rowNum) => {
          if (rowNum <= 1) return;
          const title = String(row.getCell(2).value || '').trim();
          if (!title) return;
          tasks.push({
            bucket: String(row.getCell(1).value || '').trim(),
            title,
            description: String(row.getCell(3).value || ''),
            priority: PRIORITY_REVERSE[String(row.getCell(4).value || '').toLowerCase().trim()] || 'medium',
            start_date: parseDateCell(row.getCell(5).value),
            due_date: parseDateCell(row.getCell(6).value),
            completed_at: parseDateCell(row.getCell(7).value),
            labels: String(row.getCell(8).value || '').split(',').map(l => l.trim()).filter(Boolean),
          });
        });
      }

      setPreviewData({ name: planName, scope: planScope, buckets: bucketNames, tasks });
      setPreviewOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao ler arquivo. Verifique o formato.');
    }

    // reset input
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    if (!previewData || !currentTenantId || !user) return;
    setImporting(true);

    try {
      // 1. Create plan
      const { data: plan, error: planErr } = await supabase
        .from('planner_plans')
        .insert({
          tenant_id: currentTenantId,
          name: previewData.name,
          description: '',
          scope: previewData.scope as any,
          created_by: user.id,
        })
        .select()
        .single();
      if (planErr) throw planErr;

      // 2. Create buckets
      const bucketInserts = previewData.buckets.map((name, i) => ({
        plan_id: plan.id,
        tenant_id: currentTenantId,
        name,
        sort_order: i,
      }));
      const { data: createdBuckets, error: bucketErr } = await supabase
        .from('planner_buckets')
        .insert(bucketInserts)
        .select();
      if (bucketErr) throw bucketErr;

      const bucketMap = new Map((createdBuckets || []).map((b: any) => [b.name.toLowerCase(), b.id]));
      const firstBucketId = createdBuckets?.[0]?.id;

      // 3. Create tasks
      if (previewData.tasks.length > 0) {
        const taskInserts = previewData.tasks.map((t, i) => ({
          plan_id: plan.id,
          bucket_id: bucketMap.get(t.bucket.toLowerCase()) || firstBucketId,
          tenant_id: currentTenantId,
          title: t.title,
          description: t.description || '',
          priority: t.priority,
          start_date: t.start_date || null,
          due_date: t.due_date || null,
          completed_at: t.completed_at || null,
          labels: t.labels.map((l: string) => ({ name: l, color: getRandomColor() })),
          created_by: user.id,
          sort_order: i,
        }));
        const { error: taskErr } = await supabase.from('planner_tasks').insert(taskInserts);
        if (taskErr) throw taskErr;
      }

      toast.success(`Plano "${previewData.name}" importado com ${previewData.tasks.length} tarefas!`);
      setPreviewOpen(false);
      setPreviewData(null);
      onImportComplete();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao importar plano');
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
      <Button
        id={id}
        size="sm"
        variant="outline"
        className="h-8 text-xs gap-1.5"
        onClick={handleFileSelect}
      >
        <Upload className="h-3.5 w-3.5" />
        Importar
      </Button>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Pré-visualização da importação
            </DialogTitle>
            <DialogDescription>
              Confira os dados antes de importar o plano.
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Plano</p>
                  <p className="text-sm font-semibold mt-0.5">{previewData.name}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Escopo</p>
                  <p className="text-sm font-semibold mt-0.5">{previewData.scope === 'personal' ? '🔒 Pessoal' : '🌐 Equipe'}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-2">Colunas ({previewData.buckets.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {previewData.buckets.map((b, i) => (
                    <span key={i} className="px-2 py-0.5 text-xs rounded-md bg-primary/10 text-primary font-medium">{b}</span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-2">
                  Tarefas ({previewData.tasks.length})
                </p>
                {previewData.tasks.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Nenhuma tarefa encontrada na planilha
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin">
                    {previewData.tasks.slice(0, 20).map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-border/30 last:border-0">
                        <CheckCircle2 className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        <span className="truncate font-medium">{t.title}</span>
                        <span className="text-muted-foreground ml-auto shrink-0">{t.bucket}</span>
                      </div>
                    ))}
                    {previewData.tasks.length > 20 && (
                      <p className="text-[10px] text-muted-foreground pt-1">... e mais {previewData.tasks.length - 20} tarefas</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleConfirmImport} disabled={importing}>
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
              Importar Plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Helpers ──

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C3AED' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF5B21B6' } },
    };
  });
  headerRow.height = 28;
}

function parseDateCell(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const str = String(value).trim();
  // Try dd/MM/yyyy or dd/MM/yyyy HH:mm
  const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (match) {
    const [, dd, mm, yyyy, hh, min] = match;
    return new Date(+yyyy, +mm - 1, +dd, +(hh || 0), +(min || 0)).toISOString();
  }
  // Try ISO
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

const LABEL_COLORS = ['#6C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4'];
function getRandomColor() {
  return LABEL_COLORS[Math.floor(Math.random() * LABEL_COLORS.length)];
}
