import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Clock3, Paperclip, ShieldCheck, Tag } from 'lucide-react';

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="max-w-[180px] text-right text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background px-3 py-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function QualityItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
      <span className={ok ? 'text-foreground' : 'text-muted-foreground'}>{text}</span>
    </div>
  );
}

interface Props {
  title: string;
  priorityLabel: string;
  categoryName: string;
  unitName: string;
  locationName: string;
  assetName: string;
  requesterName: string;
  technicianName: string;
  visibilityLabel: string;
  deadlineLabel: string;
  attachmentCount: number;
  tagCount: number;
  qualityChecks: { ok: boolean; text: string }[];
}

export function WorkOrderCreateSidebar(props: Props) {
  return (
    <div className="sticky top-6 space-y-6">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="px-5 pb-3 pt-5">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Resumo da abertura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Título</p>
            <p className="text-sm font-medium text-foreground">{props.title || 'Ainda não informado'}</p>
          </div>

          <SummaryRow label="Prioridade" value={props.priorityLabel} />
          <SummaryRow label="Categoria" value={props.categoryName} />
          <SummaryRow label="Unidade" value={props.unitName} />
          <SummaryRow label="Local" value={props.locationName} />
          <SummaryRow label="Ativo" value={props.assetName} />
          <SummaryRow label="Solicitante" value={props.requesterName} />
          <SummaryRow label="Responsável" value={props.technicianName} />
          <SummaryRow label="Visibilidade" value={props.visibilityLabel} />
          <SummaryRow label="Prazo" value={props.deadlineLabel} />

          <div className="grid grid-cols-2 gap-3">
            <MiniStat icon={Paperclip} label="Anexos" value={props.attachmentCount} />
            <MiniStat icon={Tag} label="Tags" value={props.tagCount} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="px-5 pb-3 pt-5">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Qualidade da abertura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-5 pb-5">
          {props.qualityChecks.map((item) => (
            <QualityItem key={item.text} ok={item.ok} text={item.text} />
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="px-5 pb-3 pt-5">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Clock3 className="h-4 w-4 text-primary" />
            Dicas para atendimento rápido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-5 pb-5">
          <p className="text-xs text-muted-foreground">
            Quanto melhor o contexto da abertura, mais rápido a equipe consegue priorizar, diagnosticar e executar.
          </p>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>• Use um título específico e objetivo.</li>
            <li>• Informe unidade e local exato do atendimento.</li>
            <li>• Vincule o ativo quando existir.</li>
            <li>• Adicione evidências e documentos quando possível.</li>
          </ul>
          <Badge variant="secondary" className="mt-2">Experiência premium de abertura</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
