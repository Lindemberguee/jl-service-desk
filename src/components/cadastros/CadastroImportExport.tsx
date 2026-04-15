import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Upload, FileDown, FileUp, Loader2, AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { logAudit } from '@/lib/audit';

interface FieldDef {
  key: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'select';
  options?: { value: string; label: string }[];
}

interface Props {
  title: string;
  table: string;
  queryKey: string;
  fields: FieldDef[];
  data: any[];
  lookupMaps?: Record<string, Record<string, string>>; // field key -> { id: name }
  reverseLookupMaps?: Record<string, Record<string, string>>; // field key -> { name: id }
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const bom = '\uFEFF';
  const csv = bom + [headers.join(';'), ...rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(';'))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function normalizeStr(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function parseCSV(text: string): string[][] {
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ';' || ch === ',' || ch === '\t') { cells.push(current.trim()); current = ''; }
        else { current += ch; }
      }
    }
    cells.push(current.trim());
    return cells;
  });
}

export function CadastroImportExport({ title, table, queryKey, fields, data, lookupMaps, reverseLookupMaps }: Props) {
  const { currentTenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);

  const exportableFields = fields.filter(f => f.key !== 'id');

  const handleDownloadTemplate = () => {
    const headers = exportableFields.map(f => f.label);
    const exampleRow = exportableFields.map(f => {
      if (f.type === 'select' && f.options?.length) {
        return f.options[0].label;
      }
      return f.required ? `(obrigatório)` : '(opcional)';
    });
    downloadCSV(`modelo_${table}.csv`, headers, [exampleRow]);
    toast({ title: 'Modelo baixado!', description: 'Preencha e importe o arquivo CSV.' });
  };

  const handleExport = () => {
    if (data.length === 0) {
      toast({ title: 'Nenhum dado para exportar', variant: 'destructive' });
      return;
    }
    const headers = exportableFields.map(f => f.label);
    const rows = data.map((item: any) =>
      exportableFields.map(f => {
        if (f.type === 'select' && lookupMaps?.[f.key]) {
          return lookupMaps[f.key][item[f.key]] || item[f.key] || '';
        }
        return item[f.key]?.toString() || '';
      })
    );
    downloadCSV(`${table}_export.csv`, headers, rows);
    toast({ title: `${data.length} registro(s) exportado(s)!` });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTenantId) {
      console.log('[Import] No file or tenant', { file: !!file, tenant: currentTenantId });
      return;
    }
    
    console.log('[Import] Starting import of:', file.name, 'size:', file.size);
    setImporting(true);
    setImportResult(null);
    setImportOpen(true);

    try {
      // Try UTF-8 first; if it contains replacement chars, fall back to Latin-1
      let text = await file.text();
      if (text.includes('\uFFFD')) {
        const buffer = await file.arrayBuffer();
        const decoder = new TextDecoder('iso-8859-1');
        text = decoder.decode(buffer);
      }
      console.log('[Import] File text length:', text.length, 'first 200 chars:', text.substring(0, 200));
      const parsed = parseCSV(text);
      console.log('[Import] Parsed rows:', parsed.length, 'first row:', parsed[0]);
      if (parsed.length < 2) {
        setImportResult({ success: 0, errors: ['Arquivo vazio ou sem dados (precisa de cabeçalho + linhas).'] });
        setImporting(false);
        return;
      }

      const headerRow = parsed[0].map(h => normalizeStr(h));
      console.log('[Import] Normalized headers:', headerRow);
      console.log('[Import] Expected fields:', exportableFields.map(f => ({ key: f.key, label: f.label, normalizedLabel: normalizeStr(f.label), normalizedKey: normalizeStr(f.key) })));
      const fieldMap: Record<number, typeof exportableFields[0]> = {};
      
      exportableFields.forEach(f => {
        const idx = headerRow.findIndex(h => h === normalizeStr(f.label) || h === normalizeStr(f.key));
        if (idx >= 0) fieldMap[idx] = f;
      });

      if (Object.keys(fieldMap).length === 0) {
        setImportResult({ success: 0, errors: ['Nenhuma coluna reconhecida. Use o modelo para referência.'] });
        setImporting(false);
        return;
      }

      const dataRows = parsed.slice(1);
      let success = 0;
      const errors: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const record: Record<string, any> = {};
        let rowValid = true;

        for (const [idxStr, field] of Object.entries(fieldMap)) {
          const idx = parseInt(idxStr);
          let value = row[idx]?.trim() || '';

          if (field.required && !value) {
            errors.push(`Linha ${i + 2}: "${field.label}" é obrigatório.`);
            rowValid = false;
            break;
          }

          if (value && field.type === 'select' && reverseLookupMaps?.[field.key]) {
            const resolvedId = reverseLookupMaps[field.key][value] || reverseLookupMaps[field.key][value.toLowerCase()];
            if (!resolvedId) {
              errors.push(`Linha ${i + 2}: "${field.label}" valor "${value}" não encontrado.`);
              rowValid = false;
              break;
            }
            value = resolvedId;
          }

          if (value) record[field.key] = value;
        }

        if (!rowValid) continue;
        if (Object.keys(record).length === 0) continue;

        record.tenant_id = currentTenantId;

        const { error } = await supabase.from(table as any).insert(record);
        if (error) {
          const msg = error.message?.includes('duplicate') ? 'registro duplicado' : error.message;
          errors.push(`Linha ${i + 2}: ${msg}`);
        } else {
          success++;
        }
      }

      setImportResult({ success, errors });
      if (success > 0) {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        await logAudit({ entity: table, action: `${table}.bulk_import`, tenantId: currentTenantId, diff: { count: success } });
      }
    } catch (err: any) {
      setImportResult({ success: 0, errors: [`Erro ao processar arquivo: ${err.message}`] });
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleDownloadTemplate}>
          <FileDown className="h-3.5 w-3.5" /> Modelo
        </Button>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" /> Exportar
        </Button>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" /> Importar
        </Button>
        <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImport} />
      </div>

      <Dialog open={importOpen} onOpenChange={v => { if (!importing) { setImportOpen(v); if (!v) setImportResult(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Importação — {title}
            </DialogTitle>
            <DialogDescription>Resultado da importação do arquivo CSV.</DialogDescription>
          </DialogHeader>

          {importing && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processando registros...</p>
            </div>
          )}

          {importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                {importResult.success > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {importResult.success} registro(s) importado(s)
                  </p>
                  {importResult.errors.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {importResult.errors.length} erro(s) encontrado(s)
                    </p>
                  )}
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1 p-2 bg-destructive/5 rounded-lg border border-destructive/20">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive flex items-start gap-1.5">
                      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                      {err}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => { setImportOpen(false); setImportResult(null); }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
