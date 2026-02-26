import { useReactFlow } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Save, Trash2, Loader2, ZoomIn, ZoomOut, Maximize,
  Undo2, Redo2, Lock, Download, PanelLeftClose, PanelLeftOpen,
  Maximize2, Minimize2, Lightbulb, AlertTriangle, CheckSquare,
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
          className={`h-8 w-8 ${active ? 'bg-accent text-accent-foreground' : ''} ${className}`}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

export default function CanvasToolbar({
  saving, readOnly, edgeStyle, onEdgeStyleChange,
  onDelete, onUndo, onRedo, canUndo, canRedo, onExport,
  showPalette, onTogglePalette, isFullscreen, onToggleFullscreen, onQuickAdd,
}: CanvasToolbarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="flex items-center gap-1 bg-card/95 backdrop-blur-md border border-border rounded-xl px-2 py-1.5 shadow-xl">
      {/* Palette toggle */}
      {!readOnly && onTogglePalette && (
        <>
          <Btn
            icon={showPalette ? PanelLeftClose : PanelLeftOpen}
            label={showPalette ? 'Ocultar paleta' : 'Mostrar paleta'}
            onClick={onTogglePalette}
            active={showPalette}
          />
          <Separator orientation="vertical" className="h-5 mx-0.5" />
        </>
      )}

      <Btn icon={ZoomOut} label="Diminuir zoom" onClick={() => zoomOut()} />
      <Btn icon={ZoomIn} label="Aumentar zoom" onClick={() => zoomIn()} />
      <Btn icon={Maximize} label="Ajustar à tela" onClick={() => fitView({ padding: 0.2 })} />

      {/* Fullscreen */}
      {onToggleFullscreen && (
        <Btn
          icon={isFullscreen ? Minimize2 : Maximize2}
          label={isFullscreen ? 'Sair tela cheia (F11)' : 'Tela cheia (F11)'}
          onClick={onToggleFullscreen}
        />
      )}

      {!readOnly && (
        <>
          <Separator orientation="vertical" className="h-5 mx-0.5" />
          <Btn icon={Undo2} label="Desfazer (Ctrl+Z)" onClick={onUndo} disabled={!canUndo} />
          <Btn icon={Redo2} label="Refazer (Ctrl+Y)" onClick={onRedo} disabled={!canRedo} />

          {onQuickAdd && (
            <>
              <Separator orientation="vertical" className="h-5 mx-0.5" />
              <Btn icon={Lightbulb} label="Adicionar Ideia" onClick={() => onQuickAdd('idea')} />
              <Btn icon={AlertTriangle} label="Adicionar Alerta" onClick={() => onQuickAdd('warning')} />
              <Btn icon={CheckSquare} label="Adicionar Tarefa" onClick={() => onQuickAdd('task')} />
            </>
          )}

          <Separator orientation="vertical" className="h-5 mx-0.5" />

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Select value={edgeStyle} onValueChange={(v) => onEdgeStyleChange(v as EdgeStyle)}>
                  <SelectTrigger className="h-7 w-[100px] text-[11px] border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bezier">Curva suave</SelectItem>
                    <SelectItem value="smoothstep">Angulada</SelectItem>
                    <SelectItem value="straight">Reta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Estilo da conexão</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-5 mx-0.5" />
          <Btn icon={Trash2} label="Excluir selecionados (Del)" onClick={onDelete} className="text-destructive hover:text-destructive" />
          <Btn icon={Download} label="Exportar como PNG" onClick={onExport} />

          {saving && (
            <div className="flex items-center gap-1.5 text-muted-foreground ml-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-[10px]">Salvando...</span>
            </div>
          )}
        </>
      )}

      {readOnly && (
        <>
          <Separator orientation="vertical" className="h-5 mx-0.5" />
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span className="text-[10px]">Somente leitura</span>
          </div>
        </>
      )}
    </div>
  );
}
