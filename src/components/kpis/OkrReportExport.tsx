import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { OkrCycle, OkrObjective, OkrKeyResult, OkrCheckin } from '@/hooks/useOkrs';
import type { Kpi } from '@/hooks/useKpis';
import { STATUS_LABELS } from './constants';
import { krProgress, fmtDate as fmtDateShort } from './helpers';

function fmtDate(d: string | null) {
  return fmtDateShort(d, 'dd/MM/yyyy');
}

export function OkrReportExport({ cycles, objectives, keyResults, checkins, kpis, selectedCycleId, tenantName }: OkrReportExportProps) {
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const cycle = cycles.find(c => c.id === selectedCycleId);
  const cycleObjs = objectives.filter(o => o.cycle_id === selectedCycleId);
  const cycleKrs = keyResults.filter(kr => cycleObjs.some(o => o.id === kr.objective_id));

  const exportPDF = async () => {
    setExporting('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      let y = 20;

      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 36, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de OKRs', margin, 16);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${tenantName || 'Empresa'} • ${cycle?.name || 'Todos os ciclos'}`, margin, 24);
      doc.text(`Período: ${cycle ? `${fmtDate(cycle.starts_at)} a ${fmtDate(cycle.ends_at)}` : '—'} • Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, 30);
      y = 44;

      // Summary cards
      const totalObjs = cycleObjs.length;
      const totalKrs = cycleKrs.length;
      const avgProgress = totalObjs > 0 ? Math.round(cycleObjs.reduce((s, o) => s + o.progress, 0) / totalObjs) : 0;
      const completedKrs = cycleKrs.filter(kr => kr.activity_status === 'finalizado').length;
      const lateKrs = cycleKrs.filter(kr => ['fora_do_prazo', 'atrasado'].includes(kr.activity_status)).length;

      const summaryItems = [
        ['Objetivos', String(totalObjs)],
        ['Atividades', String(totalKrs)],
        ['Progresso Médio', `${avgProgress}%`],
        ['Concluídas', String(completedKrs)],
        ['Fora do Prazo', String(lateKrs)],
      ];

      const cardW = (pageWidth - margin * 2) / summaryItems.length;
      summaryItems.forEach(([label, val], i) => {
        const x = margin + i * cardW;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, cardW - 4, 16, 2, 2, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(label, x + 4, y + 6);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(val, x + 4, y + 14);
      });
      y += 24;

      // Group by macro objective
      const macroGroups = new Map<string, OkrObjective[]>();
      cycleObjs.forEach(obj => {
        const macro = obj.macro_objective || 'Sem Objetivo Macro';
        if (!macroGroups.has(macro)) macroGroups.set(macro, []);
        macroGroups.get(macro)!.push(obj);
      });

      for (const [macroName, objs] of macroGroups) {
        if (y > pageHeight - 30) { doc.addPage(); y = 16; }

        // Macro header
        doc.setFillColor(226, 232, 240);
        doc.roundedRect(margin, y, pageWidth - margin * 2, 8, 1, 1, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        const macroProgress = Math.round(objs.reduce((s, o) => s + o.progress, 0) / objs.length);
        doc.text(`${macroName}  —  ${macroProgress}%`, margin + 4, y + 5.5);
        y += 12;

        for (const obj of objs) {
          if (y > pageHeight - 25) { doc.addPage(); y = 16; }

          // Objective row
          doc.setFillColor(241, 245, 249);
          doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text(`🎯 ${obj.title}`, margin + 3, y + 5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(`Progresso: ${obj.progress}%  •  Área: ${obj.area || '—'}  •  Resp: ${obj.responsible_name || '—'}`, margin + 100, y + 5);
          y += 9;

          // KR table header
          const objKrs = cycleKrs.filter(kr => kr.objective_id === obj.id);
          if (objKrs.length > 0) {
            const cols = ['Atividade', 'Status', 'Progresso', 'Indicador', 'Meta', 'Área', 'Responsável', 'Início', 'Final', 'Entrega'];
            const colWidths = [55, 22, 18, 30, 25, 22, 28, 18, 18, 18];
            doc.setFillColor(220, 225, 235);
            doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');
            doc.setFontSize(6);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(71, 85, 105);
            let xPos = margin + 2;
            cols.forEach((col, i) => {
              doc.text(col, xPos, y + 4);
              xPos += colWidths[i];
            });
            y += 7;

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 41, 59);
            objKrs.forEach(kr => {
              if (y > pageHeight - 12) { doc.addPage(); y = 16; }
              const progress = krProgress(kr);
              const linkedKpis = (kr as any).kpi_ids?.map((id: string) => kpis.find(k => k.id === id)?.name).filter(Boolean).join(', ') || '—';

              xPos = margin + 2;
              doc.setFontSize(6);
              doc.text((kr.title || '').substring(0, 35), xPos, y + 3.5); xPos += colWidths[0];
              doc.text(STATUSES[kr.activity_status] || kr.activity_status, xPos, y + 3.5); xPos += colWidths[1];
              doc.text(`${progress}%`, xPos, y + 3.5); xPos += colWidths[2];
              doc.text((linkedKpis).substring(0, 20), xPos, y + 3.5); xPos += colWidths[3];
              doc.text(`${kr.current_value}/${kr.target_value} ${kr.unit}`, xPos, y + 3.5); xPos += colWidths[4];
              doc.text((kr.area || '—').substring(0, 14), xPos, y + 3.5); xPos += colWidths[5];
              doc.text((kr.responsible_name || '—').substring(0, 18), xPos, y + 3.5); xPos += colWidths[6];
              doc.text(fmtDate(kr.start_date), xPos, y + 3.5); xPos += colWidths[7];
              doc.text(fmtDate(kr.end_date), xPos, y + 3.5); xPos += colWidths[8];
              doc.text(fmtDate(kr.delivery_date), xPos, y + 3.5);

              doc.setDrawColor(226, 232, 240);
              doc.line(margin, y + 5, pageWidth - margin, y + 5);
              y += 6;
            });
            y += 3;
          }
        }
        y += 4;
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${p} de ${totalPages}`, margin, pageHeight - 6);
        doc.text('Gerado por Ordfy', pageWidth - margin - 30, pageHeight - 6);
      }

      doc.save(`relatorio-okrs-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF de OKRs gerado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setExporting(null);
    }
  };

  const exportExcel = async () => {
    setExporting('excel');
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Ordfy';
      workbook.created = new Date();

      const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
      const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
      const macroFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };

      // ── Resumo ──
      const summarySheet = workbook.addWorksheet('Resumo', { properties: { tabColor: { argb: '3B82F6' } } });
      summarySheet.columns = [
        { header: 'Métrica', key: 'label', width: 30 },
        { header: 'Valor', key: 'value', width: 20 },
      ];
      const avgProgress = cycleObjs.length > 0 ? Math.round(cycleObjs.reduce((s, o) => s + o.progress, 0) / cycleObjs.length) : 0;
      [
        { label: 'Ciclo', value: cycle?.name || '—' },
        { label: 'Período', value: cycle ? `${fmtDate(cycle.starts_at)} a ${fmtDate(cycle.ends_at)}` : '—' },
        { label: 'Total de Objetivos', value: cycleObjs.length },
        { label: 'Total de Atividades', value: cycleKrs.length },
        { label: 'Progresso Médio (%)', value: avgProgress },
        { label: 'Concluídas', value: cycleKrs.filter(kr => kr.activity_status === 'finalizado').length },
        { label: 'Em andamento', value: cycleKrs.filter(kr => kr.activity_status === 'em_andamento').length },
        { label: 'Fora do Prazo', value: cycleKrs.filter(kr => ['fora_do_prazo', 'atrasado'].includes(kr.activity_status)).length },
        { label: 'Pendentes', value: cycleKrs.filter(kr => kr.activity_status === 'a_iniciar').length },
      ].forEach(r => summarySheet.addRow(r));
      summarySheet.getRow(1).eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; cell.alignment = { vertical: 'middle' }; });
      summarySheet.getRow(1).height = 28;

      // ── Plano de Ação ──
      const actionSheet = workbook.addWorksheet('Plano de Ação', { properties: { tabColor: { argb: '22C55E' } } });
      actionSheet.columns = [
        { header: 'Objetivo Macro', key: 'macro', width: 25 },
        { header: 'Objetivo', key: 'objective', width: 30 },
        { header: 'Atividade', key: 'activity', width: 35 },
        { header: 'Status', key: 'status', width: 18 },
        { header: 'Progresso (%)', key: 'progress', width: 14 },
        { header: 'Indicador', key: 'indicator', width: 25 },
        { header: 'Meta', key: 'target', width: 18 },
        { header: 'Atual', key: 'current', width: 12 },
        { header: 'Área', key: 'area', width: 18 },
        { header: 'Responsável', key: 'responsible', width: 22 },
        { header: 'Equipe Apoio', key: 'support', width: 20 },
        { header: 'Início', key: 'start', width: 14 },
        { header: 'Final', key: 'end', width: 14 },
        { header: 'Entrega', key: 'delivery', width: 14 },
      ];

      cycleObjs.forEach(obj => {
        const objKrs = cycleKrs.filter(kr => kr.objective_id === obj.id);
        objKrs.forEach(kr => {
          const linkedKpis = (kr as any).kpi_ids?.map((id: string) => kpis.find(k => k.id === id)?.name).filter(Boolean).join(', ') || '—';
          const row = actionSheet.addRow({
            macro: obj.macro_objective || '—',
            objective: obj.title,
            activity: kr.title,
            status: STATUSES[kr.activity_status] || kr.activity_status,
            progress: krProgress(kr),
            indicator: linkedKpis,
            target: `${kr.target_value} ${kr.unit}`,
            current: kr.current_value,
            area: kr.area || '—',
            responsible: kr.responsible_name || '—',
            support: kr.support_team || '—',
            start: fmtDate(kr.start_date),
            end: fmtDate(kr.end_date),
            delivery: fmtDate(kr.delivery_date),
          });

          // Color by status
          const statusCell = row.getCell('status');
          if (['fora_do_prazo', 'atrasado'].includes(kr.activity_status)) {
            statusCell.font = { color: { argb: 'DC2626' }, bold: true };
          } else if (kr.activity_status === 'finalizado') {
            statusCell.font = { color: { argb: '16A34A' }, bold: true };
          }
        });
      });

      actionSheet.getRow(1).eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; cell.alignment = { vertical: 'middle' }; });
      actionSheet.getRow(1).height = 28;
      actionSheet.autoFilter = { from: 'A1', to: `N${cycleKrs.length + 1}` };

      // ── Objetivos ──
      const objSheet = workbook.addWorksheet('Objetivos', { properties: { tabColor: { argb: 'F59E0B' } } });
      objSheet.columns = [
        { header: 'Objetivo Macro', key: 'macro', width: 25 },
        { header: 'Título', key: 'title', width: 35 },
        { header: 'Área', key: 'area', width: 18 },
        { header: 'Responsável', key: 'responsible', width: 22 },
        { header: 'Progresso (%)', key: 'progress', width: 14 },
        { header: 'Status', key: 'status', width: 16 },
        { header: 'Prioridade', key: 'priority', width: 14 },
        { header: 'Indicador', key: 'indicator', width: 20 },
        { header: 'Meta', key: 'target_label', width: 18 },
      ];
      cycleObjs.forEach(obj => {
        objSheet.addRow({
          macro: obj.macro_objective || '—',
          title: obj.title,
          area: obj.area || '—',
          responsible: obj.responsible_name || '—',
          progress: obj.progress,
          status: STATUSES[obj.status] || obj.status,
          priority: obj.priority,
          indicator: obj.indicator || '—',
          target_label: obj.target_label || '—',
        });
      });
      objSheet.getRow(1).eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; cell.alignment = { vertical: 'middle' }; });
      objSheet.getRow(1).height = 28;

      // ── Checkins ──
      const krCheckins = checkins.filter(c => cycleKrs.some(kr => kr.id === c.key_result_id));
      if (krCheckins.length > 0) {
        const ciSheet = workbook.addWorksheet('Check-ins', { properties: { tabColor: { argb: '8B5CF6' } } });
        ciSheet.columns = [
          { header: 'Atividade', key: 'activity', width: 35 },
          { header: 'Valor', key: 'value', width: 14 },
          { header: 'Confiança (%)', key: 'confidence', width: 14 },
          { header: 'Observações', key: 'notes', width: 40 },
          { header: 'Data', key: 'date', width: 18 },
        ];
        krCheckins.forEach(ci => {
          const kr = cycleKrs.find(k => k.id === ci.key_result_id);
          ciSheet.addRow({
            activity: kr?.title || '—',
            value: ci.value,
            confidence: ci.confidence_level,
            notes: ci.notes || '',
            date: format(parseISO(ci.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          });
        });
        ciSheet.getRow(1).eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; cell.alignment = { vertical: 'middle' }; });
        ciSheet.getRow(1).height = 28;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-okrs-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel de OKRs gerado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar Excel');
    } finally {
      setExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" disabled={!!exporting}>
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportPDF} className="gap-2 text-xs">
          <FileText className="h-3.5 w-3.5 text-red-500" />
          Exportar PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportExcel} className="gap-2 text-xs">
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
          Exportar Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
