import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Wand2, LayoutGrid, Zap, Crown, ArrowDown, ArrowRight, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface AiFlowGeneratorDialogProps {
  onGenerated: (name: string, nodes: any[], edges: any[]) => void;
}

const EXAMPLES = [
  {
    label: "Abertura de chamado",
    text: "Fluxo de abertura de chamado: usuário abre ticket → triagem automática por categoria → análise de prioridade SLA → atribuição ao técnico especialista → diagnóstico inicial → execução da solução → testes de validação → aprovação do solicitante → encerramento e pesquisa de satisfação",
  },
  {
    label: "Onboarding de funcionário",
    text: "Processo de onboarding: RH recebe aprovação de contratação → coleta de documentos → criação de credenciais de rede e e-mail → solicitação de equipamentos (notebook, monitor, periféricos) → configuração do ambiente → instalação de software padrão → treinamento de segurança → acesso aos sistemas internos → apresentação às equipes → acompanhamento 30/60/90 dias",
  },
  {
    label: "Gestão de incidentes",
    text: "Gestão de incidentes críticos: detecção do incidente (monitoramento/usuário) → classificação de severidade (P1/P2/P3) → se P1: war room + escalonamento imediato → análise de causa raiz → aplicação de workaround → resolução definitiva → documentação post-mortem → atualização da base de conhecimento → revisão de prevenção",
  },
  {
    label: "Deploy de software",
    text: "Pipeline de deploy: commit no repositório → build automático CI → execução de testes unitários → análise de qualidade de código → se falhou: notificação e rollback → se passou: deploy em staging → testes de integração → aprovação do QA → deploy em produção (blue/green) → monitoramento de métricas → validação final",
  },
];

const COMPLEXITY_OPTIONS = [
  { value: 'basic', label: 'Básico', description: '5-10 nós', icon: Zap },
  { value: 'detailed', label: 'Detalhado', description: '10-18 nós', icon: LayoutGrid },
  { value: 'complete', label: 'Completo', description: '15-25 nós', icon: Crown },
];

const LAYOUT_OPTIONS = [
  { value: 'vertical', label: 'Vertical', icon: ArrowDown },
  { value: 'horizontal', label: 'Horizontal', icon: ArrowRight },
];

const STYLE_OPTIONS = [
  { value: 'modern', label: 'Moderno', description: 'Cores vibrantes e ícones' },
  { value: 'corporate', label: 'Corporativo', description: 'Tom sóbrio e formal' },
  { value: 'colorful', label: 'Colorido', description: 'Paleta variada e viva' },
];

export default function AiFlowGeneratorDialog({ onGenerated }: AiFlowGeneratorDialogProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [customName, setCustomName] = useState('');
  const [complexity, setComplexity] = useState('detailed');
  const [layout, setLayout] = useState('vertical');
  const [style, setStyle] = useState('modern');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error('Descreva o fluxo que deseja gerar.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-canvas-flow', {
        body: {
          description: description.trim(),
          complexity,
          layout,
          style,
        },
      });

      if (error) throw error;
      if (!data?.nodes || !data?.edges) throw new Error('Resposta inválida da IA');

      const name = customName.trim() || data.name || 'Fluxo gerado por IA';
      onGenerated(name, data.nodes, data.edges);
      toast.success(`Fluxo "${name}" gerado com ${data.nodes.length} nós e ${data.edges.length} conexões!`);
      setOpen(false);
      setDescription('');
      setCustomName('');
    } catch (err: any) {
      console.error('AI flow generation error:', err);
      const msg = err?.message || err?.context?.body?.error || 'Erro ao gerar fluxo com IA';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5">
          <Sparkles className="h-4 w-4" /> Gerar com IA
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Gerar Fluxo com IA
          </DialogTitle>
          <DialogDescription>
            Descreva o processo em texto livre. A IA criará um diagrama completo com nós tipados, ícones, cores e conexões inteligentes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nome do canvas */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Nome do canvas (opcional)
            </label>
            <Input
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="Ex: Fluxo de Manutenção Preventiva"
              className="h-9 text-sm"
              disabled={loading}
            />
          </div>

          {/* Configurações em grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Complexidade */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Complexidade
              </label>
              <Select value={complexity} onValueChange={setComplexity} disabled={loading}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPLEXITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-1.5">
                        <opt.icon className="h-3.5 w-3.5" />
                        {opt.label}
                        <span className="text-muted-foreground text-[10px]">({opt.description})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Layout */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Direção do layout
              </label>
              <Select value={layout} onValueChange={setLayout} disabled={loading}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAYOUT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-1.5">
                        <opt.icon className="h-3.5 w-3.5" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estilo */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Estilo visual
              </label>
              <Select value={style} onValueChange={setStyle} disabled={loading}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-1.5">
                        <Palette className="h-3.5 w-3.5" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Descreva o fluxo *
            </label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva as etapas, decisões, condições e responsáveis do processo. Quanto mais detalhes, melhor o resultado..."
              className="min-h-[140px] text-sm resize-none"
              disabled={loading}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              {description.length} caracteres · Dica: inclua decisões (se/senão), responsáveis e integrações
            </p>
          </div>

          {/* Exemplos */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-2">Exemplos rápidos:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  className="text-left text-[11px] text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md px-2.5 py-2 transition-colors group"
                  onClick={() => setDescription(ex.text)}
                  disabled={loading}
                >
                  <span className="font-medium text-foreground/80 group-hover:text-foreground block mb-0.5">
                    {ex.label}
                  </span>
                  <span className="line-clamp-2">{ex.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={loading || !description.trim()} className="gap-1.5">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando fluxo...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Gerar Fluxo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
