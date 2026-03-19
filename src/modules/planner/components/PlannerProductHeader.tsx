import { Plus, Upload, Download, Star, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  onCreatePlan: () => void;
  onImport: () => void;
  onExport: () => void;
}

export function PlannerProductHeader({ search, onSearchChange, onCreatePlan, onImport, onExport }: Props) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              <Star className="h-3.5 w-3.5" /> Planner Workspace
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Planejamento e execução da equipe</h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Organize tarefas, acompanhe prazos, visualize capacidade do time e conduza a execução com uma experiência moderna e operacional.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onImport}>
              <Upload className="h-4 w-4" /> Importar
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onExport}>
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <Button size="sm" className="h-9 gap-1.5" onClick={onCreatePlan}>
              <Plus className="h-4 w-4" /> Novo plano
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar planos por nome..."
            className="h-10 pl-10 bg-background"
          />
        </div>
      </div>
    </div>
  );
}
