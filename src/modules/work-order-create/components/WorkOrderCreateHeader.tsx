import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  completionPercent: number;
  onBack: () => void;
}

export function WorkOrderCreateHeader({ completionPercent, onBack }: Props) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-0.5 h-9 w-9 rounded-xl" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Nova OS
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Abrir ordem de serviço</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Registre uma nova solicitação com contexto completo, vínculo de local e ativo, responsáveis e documentação de apoio.
            </p>
          </div>
        </div>

        <div className="min-w-[260px] rounded-2xl border border-border/70 bg-background p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Preenchimento</span>
            <span className="font-semibold text-foreground">{completionPercent}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${completionPercent}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Campos essenciais para uma abertura de OS mais clara e operacional.
          </p>
        </div>
      </div>
    </div>
  );
}
