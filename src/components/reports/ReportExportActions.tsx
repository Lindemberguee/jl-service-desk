import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { statusLabels, priorityLabels } from '@/lib/permissions';

interface ReportExportActionsProps {
  workOrders: any[];
  techPerformance: any[];
  period: string;
  kpis: {
    total: number;
    resolved: number;
    resolutionRate: number;
    avgResolutionHours: number;
    avgResponseMinutes: number;
    slaCompliance: number;
    totalBacklog: number;
    reopenedCount: number;
    overdue: number;
    mttr: number;
    mtbf: number;
    avgCostPerOS: number;
    totalCost: number;
  };
  tenantName?: string;
}

const periodLabels: Record<string, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  '12m': 'Últimos 12 meses',
};

export function ReportExportActions({ workOrders, techPerformance, period, kpis, tenantName }: ReportExportActionsProps) {
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const exportPDF = async () => {
    setExporting('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = 20;

      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório Operacional', margin, 18);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${tenantName || 'Empresa'} • ${periodLabels[period] || period}`, margin, 28);
      doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, 35);
      y = 50;

      // KPIs Section
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Indicadores Principais', margin, y);
      y += 8;

      const kpiItems = [
        ['Total de OS', String(kpis.total)],
        ['Resolvidas', String(kpis.resolved)],
        ['Taxa de Resolução', `${kpis.resolutionRate}%`],
        ['Conformidade SLA', `${kpis.slaCompliance}%`],
        ['Tempo Médio Resolução', `${kpis.avgResolutionHours}h`],
        ['1ª Resposta (média)', `${kpis.avgResponseMinutes}min`],
        ['Backlog Atual', String(kpis.totalBacklog)],
        ['OS Reabertas', String(kpis.reopenedCount)],
        ['OS Atrasadas', String(kpis.overdue)],
        ['MTTR', `${kpis.mttr}h`],
        ['MTBF', `${kpis.mtbf}h`],
        ['Custo Médio/OS', `R$ ${kpis.avgCostPerOS.toFixed(2)}`],
        ['Custo Total', `R$ ${kpis.totalCost.toFixed(2)}`],
      ];

      const colWidth = (pageWidth - margin * 2) / 3;
      kpiItems.forEach((item, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = margin + col * colWidth;
        const yy = y + row * 14;

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, yy, colWidth - 4, 12, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(item[0], x + 3, yy + 4.5);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(item[1], x + 3, yy + 10);
      });

      y += Math.ceil(kpiItems.length / 3) * 14 + 10;

      // Tech Performance Table
      if (techPerformance.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Desempenho por Técnico', margin, y);
        y += 8;

        // Table header
        const cols = ['Técnico', 'Atribuídas', 'Resolvidas', 'Taxa', 'Tempo Médio'];
        const colWidths = [55, 25, 25, 20, 30];
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        let xPos = margin + 3;
        cols.forEach((col, i) => {
          doc.text(col, xPos, y + 5.5);
          xPos += colWidths[i];
        });
        y += 10;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        techPerformance.forEach((t) => {
          if (y > 275) { doc.addPage(); y = 20; }
          xPos = margin + 3;
          doc.setFontSize(8);
          doc.text(t.name.substring(0, 25), xPos, y + 4); xPos += colWidths[0];
          doc.text(String(t.total), xPos, y + 4); xPos += colWidths[1];
          doc.text(String(t.resolved), xPos, y + 4); xPos += colWidths[2];
          doc.text(`${t.rate}%`, xPos, y + 4); xPos += colWidths[3];
          doc.text(`${t.avgHours}h`, xPos, y + 4);
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, y + 6, pageWidth - margin, y + 6);
          y += 8;
        });
        y += 6;
      }

      // Work Orders Table
      if (workOrders.length > 0) {
        if (y > 200) { doc.addPage(); y = 20; }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`Ordens de Serviço (${workOrders.length})`, margin, y);
        y += 8;

        const woCols = ['Código', 'Título', 'Status', 'Prioridade', 'Criação'];
        const woColWidths = [25, 65, 25, 22, 25];
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        let wx = margin + 2;
        woCols.forEach((col, i) => {
          doc.text(col, wx, y + 5.5);
          wx += woColWidths[i];
        });
        y += 10;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        const maxRows = Math.min(workOrders.length, 100);
        for (let i = 0; i < maxRows; i++) {
          if (y > 280) { doc.addPage(); y = 20; }
          const wo = workOrders[i];
          wx = margin + 2;
          doc.setFontSize(7);
          doc.text(wo.code || '', wx, y + 3.5); wx += woColWidths[0];
          doc.text((wo.title || '').substring(0, 40), wx, y + 3.5); wx += woColWidths[1];
          doc.text(statusLabels[wo.status] || wo.status, wx, y + 3.5); wx += woColWidths[2];
          doc.text(priorityLabels[wo.priority] || wo.priority, wx, y + 3.5); wx += woColWidths[3];
          doc.text(wo.created_at ? format(new Date(wo.created_at), 'dd/MM/yy') : '', wx, y + 3.5);
          if (i % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y - 1, pageWidth - margin * 2, 6, 'F');
            // Re-draw text over fill
            wx = margin + 2;
            doc.setTextColor(30, 41, 59);
            doc.text(wo.code || '', wx, y + 3.5); wx += woColWidths[0];
            doc.text((wo.title || '').substring(0, 40), wx, y + 3.5); wx += woColWidths[1];
            doc.text(statusLabels[wo.status] || wo.status, wx, y + 3.5); wx += woColWidths[2];
            doc.text(priorityLabels[wo.priority] || wo.priority, wx, y + 3.5); wx += woColWidths[3];
            doc.text(wo.created_at ? format(new Date(wo.created_at), 'dd/MM/yy') : '', wx, y + 3.5);
          }
          y += 6;
        }
        if (workOrders.length > maxRows) {
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(`... e mais ${workOrders.length - maxRows} ordens de serviço`, margin, y + 4);
        }
      }

      // Footer on all pages
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${p} de ${totalPages}`, margin, 290);
        doc.text('Gerado por Ordfy', pageWidth - margin - 30, 290);
      }

      doc.save(`relatorio-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF gerado com sucesso!');
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

      // ── KPIs Sheet ──
      const kpiSheet = workbook.addWorksheet('Indicadores', { properties: { tabColor: { argb: '3B82F6' } } });
      kpiSheet.columns = [
        { header: 'Indicador', key: 'label', width: 30 },
        { header: 'Valor', key: 'value', width: 20 },
      ];
      const kpiRows = [
        { label: 'Total de OS', value: kpis.total },
        { label: 'Resolvidas', value: kpis.resolved },
        { label: 'Taxa de Resolução (%)', value: kpis.resolutionRate },
        { label: 'Conformidade SLA (%)', value: kpis.slaCompliance },
        { label: 'Tempo Médio Resolução (h)', value: kpis.avgResolutionHours },
        { label: '1ª Resposta (min)', value: kpis.avgResponseMinutes },
        { label: 'Backlog', value: kpis.totalBacklog },
        { label: 'Reabertas', value: kpis.reopenedCount },
        { label: 'Atrasadas (SLA)', value: kpis.overdue },
        { label: 'MTTR (h)', value: kpis.mttr },
        { label: 'MTBF (h)', value: kpis.mtbf },
        { label: 'Custo Médio/OS (R$)', value: kpis.avgCostPerOS },
        { label: 'Custo Total (R$)', value: kpis.totalCost },
      ];
      kpiRows.forEach(r => kpiSheet.addRow(r));

      // Style header
      const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
      const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
      [kpiSheet].forEach(sheet => {
        sheet.getRow(1).eachCell(cell => {
          cell.fill = headerFill;
          cell.font = headerFont;
          cell.alignment = { vertical: 'middle' };
        });
        sheet.getRow(1).height = 28;
      });

      // ── Work Orders Sheet ──
      const woSheet = workbook.addWorksheet('Ordens de Serviço', { properties: { tabColor: { argb: '22C55E' } } });
      woSheet.columns = [
        { header: 'Código', key: 'code', width: 18 },
        { header: 'Título', key: 'title', width: 40 },
        { header: 'Status', key: 'status', width: 18 },
        { header: 'Prioridade', key: 'priority', width: 14 },
        { header: 'Criação', key: 'created_at', width: 16 },
        { header: 'Resolução', key: 'resolved_at', width: 16 },
        { header: 'Custo Total', key: 'total_cost', width: 14 },
      ];
      workOrders.forEach((wo: any) => {
        woSheet.addRow({
          code: wo.code,
          title: wo.title,
          status: statusLabels[wo.status] || wo.status,
          priority: priorityLabels[wo.priority] || wo.priority,
          created_at: wo.created_at ? format(new Date(wo.created_at), 'dd/MM/yyyy') : '',
          resolved_at: wo.resolved_at ? format(new Date(wo.resolved_at), 'dd/MM/yyyy') : '',
          total_cost: wo.total_cost || 0,
        });
      });
      woSheet.getRow(1).eachCell(cell => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { vertical: 'middle' };
      });
      woSheet.getRow(1).height = 28;

      // Auto-filter
      woSheet.autoFilter = { from: 'A1', to: `G${workOrders.length + 1}` };

      // ── Desempenho Sheet ──
      if (techPerformance.length > 0) {
        const perfSheet = workbook.addWorksheet('Desempenho', { properties: { tabColor: { argb: 'F59E0B' } } });
        perfSheet.columns = [
          { header: 'Técnico', key: 'name', width: 30 },
          { header: 'Atribuídas', key: 'total', width: 14 },
          { header: 'Resolvidas', key: 'resolved', width: 14 },
          { header: 'Taxa (%)', key: 'rate', width: 12 },
          { header: 'Tempo Médio (h)', key: 'avgHours', width: 16 },
        ];
        techPerformance.forEach(t => perfSheet.addRow(t));
        perfSheet.getRow(1).eachCell(cell => {
          cell.fill = headerFill;
          cell.font = headerFont;
          cell.alignment = { vertical: 'middle' };
        });
        perfSheet.getRow(1).height = 28;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel gerado com sucesso!');
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
        <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" disabled={!!exporting}>
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
