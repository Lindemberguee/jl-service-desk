import { Plus, Download, Printer, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onCreate?: () => void;
  onExport?: () => void;
  onPrint?: () => void;
  onRefresh?: () => void;
}

export function WorkOrdersHeader({ onCreate, onExport, onPrint, onRefresh }: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Ordens de Serviço
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie, acompanhe e execute atendimentos técnicos em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={onRefresh}>
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </Button>
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={onPrint}>
            <Printer className="h-4 w-4" />
            Guia
          </Button>
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={onExport}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button size="sm" className="h-9 gap-1.5" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            Nova OS
          </Button>
        </div>
      </div>
    </div>
  );
}
