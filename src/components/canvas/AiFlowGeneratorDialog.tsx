import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AiFlowGeneratorDialogProps {
  onGenerated: (name: string, nodes: any[], edges: any[]) => void;
}

const EXAMPLES = [
  "Fluxo de abertura de chamado: usuário abre ticket → triagem → atribuição técnico → execução → validação → encerramento",
  "Processo de onboarding de funcionário: documentação → criação de acessos → configuração de equipamento → treinamento → acompanhamento",
  "Fluxo de compras: solicitação → análise gerente → cotação fornecedores → aprovação diretoria → ordem de compra → recebimento → conferência",
];

export default function AiFlowGeneratorDialog({ onGenerated }: AiFlowGeneratorDialogProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error('Descreva o fluxo que deseja gerar.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-canvas-flow', {
        body: { description: description.trim() },
      });

      if (error) throw error;
      if (!data?.nodes || !data?.edges) throw new Error('Resposta inválida da IA');

      const name = customName.trim() || data.name || 'Fluxo gerado por IA';
      onGenerated(name, data.nodes, data.edges);
      toast.success(`Fluxo "${name}" gerado com ${data.nodes.length} nós!`);
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Gerar Fluxo com IA
          </DialogTitle>
          <DialogDescription>
            Descreva o processo ou fluxo desejado em texto livre. A IA criará automaticamente um diagrama completo com nós tipados, ícones, cores e conexões.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Descreva o fluxo *
            </label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva as etapas, decisões, condições e responsáveis do processo..."
              className="min-h-[120px] text-sm resize-none"
              disabled={loading}
            />
          </div>

          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Exemplos rápidos:</p>
            <div className="flex flex-col gap-1.5">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  className="text-left text-[11px] text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md px-2.5 py-1.5 transition-colors line-clamp-1"
                  onClick={() => setDescription(ex)}
                  disabled={loading}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={loading || !description.trim()} className="gap-1.5">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando...
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
