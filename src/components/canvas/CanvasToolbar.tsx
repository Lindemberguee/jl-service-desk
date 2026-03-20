import { useReactFlow } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Trash2,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Undo2,
  Redo2,
  Lock,
  Download,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
  Lightbulb,
  AlertTriangle,
  CheckSquare,
  Sparkles,
  Grip,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EdgeStyle } from './CustomEdge';

interface CanvasToolbarProps {
  saving: boolean;
  readOnly: boolean;
  edgeStyle: EdgeStyle;
  onEdgeStyleChange: (style: EdgeStyle) => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  showPalette?: boolean;
  onTogglePalette?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onQuickAdd?: (type: string) => void;
}

function Btn({ icon: Icon, label, onClick, disabled, active, className = '' }: any) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          disabled={disabled}
          className={`h-9 w-9 rounded-xl ${active ? 'bg-primary/10 text-primary hover:bg-primary/15' : ''} ${className}`}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 rounded-2xl border border-border/60 bg-background/80 px-1.5 py-1">
      <span className="px-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</span>
      <Separator orientation="vertical" className="h-5" />
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

export default function CanvasToolbar({
  saving,
  readOnly,
  edgeStyle,
  onEdgeStyleChange,
  onDelete,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  showPalette,
  onTogglePalette,
  isFullscreen,
  onToggleFullscreen,
  onQuickAdd,
}: CanvasToolbarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-3xl border border-border/70 bg-card/95 px-3 py-2 shadow-2xl backdrop-blur-md">
      {!readOnly && onTogglePalette && (
        <Group title="painel">
          <Btn
            icon={showPalette ? PanelLeftClose : PanelLeftOpen}
            label={showPalette ? 'Ocultar paleta' : 'Mostrar paleta'}
            onClick={onTogglePalette}
            active={showPalette}
          />
        </Group>
      )}

      <Group title="navegação">
        <Btn icon={ZoomOut} label="Diminuir zoom" onClick={() => zoomOut()} />
        <Btn icon={ZoomIn} label="Aumentar zoom" onClick={() => zoomIn()} />
        <Btn icon={Maximize} label="Ajustar à tela" onClick={() => fitView({ padding: 0.2 })} />
        {onToggleFullscreen && (
          <Btn
            icon={isFullscreen ? Minimize2 : Maximize2}
            label={isFullscreen ? 'Sair tela cheia (F11)' : 'Tela cheia (F11)'}
            onClick={onToggleFullscreen}
          />
        )}
      </Group>

      {!readOnly && (
        <>
          <Group title="histórico">
            <Btn icon={Undo2} label="Desfazer (Ctrl+Z)" onClick={onUndo} disabled={!canUndo} />
            <Btn icon={Redo2} label="Refazer (Ctrl+Y)" onClick={onRedo} disabled={!canRedo} />
          </Group>

          {onQuickAdd && (
            <Group title="blocos">
              <Btn icon={Lightbulb} label="Adicionar ideia" onClick={() => onQuickAdd('idea')} />
              <Btn icon={AlertTriangle} label="Adicionar alerta" onClick={() => onQuickAdd('warning')} />
              <Btn icon={CheckSquare} label="Adicionar tarefa" onClick={() => onQuickAdd('task')} />
              <Btn icon={Sparkles} label="Adicionar marco" onClick={() => onQuickAdd('milestone')} />
            </Group>
          )}

          <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/80 px-2 py-1">
            <span className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">conexão</span>
            <Select value={edgeStyle} onValueChange={(v) => onEdgeStyleChange(v as EdgeStyle)}>
              <SelectTrigger className="h-9 w-[128px] rounded-xl border-border/60 bg-background text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bezier">Curva suave</SelectItem>
                <SelectItem value="smoothstep">Angulada</SelectItem>
                <SelectItem value="straight">Reta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Group title="ações">
            <Btn icon={Trash2} label="Excluir selecionados (Del)" onClick={onDelete} className="text-destructive hover:text-destructive" />
            <Btn icon={Download} label="Exportar como PNG" onClick={onExport} />
          </Group>
        </>
      )}

      <div className="ml-1 flex items-center gap-2 rounded-2xl border border-border/60 bg-background/80 px-2.5 py-1.5">
        <Grip className="h-3.5 w-3.5 text-muted-foreground" />
        {readOnly ? (
          <Badge variant="secondary" className="rounded-full gap-1 text-[10px]">
            <Lock className="h-3 w-3" /> Somente leitura
          </Badge>
        ) : saving ? (
          <Badge variant="outline" className="rounded-full gap-1 text-[10px]">
            <Loader2 className="h-3 w-3 animate-spin" /> Salvando
          </Badge>
        ) : (
          <Badge variant="outline" className="rounded-full gap-1 text-[10px] text-emerald-600 border-emerald-500/20 bg-emerald-500/5">
            <Sparkles className="h-3 w-3" /> Pronto para editar
          </Badge>
        )}
      </div>
    </div>
  );
}
