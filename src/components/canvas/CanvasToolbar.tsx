import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Save, Trash2, Loader2, ZoomIn, ZoomOut, Maximize,
  MousePointer2, Undo2, Redo2, Lock, Download,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EdgeStyle } from './CustomEdge';

interface CanvasToolbarProps {
  saving: boolean;
  readOnly: boolean;
  hasChanges: boolean;
  edgeStyle: EdgeStyle;
  onEdgeStyleChange: (style: EdgeStyle) => void;
  onSave: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
}

function Btn({ icon: Icon, label, onClick, disabled, className = '' }: any) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={onClick} disabled={disabled} className={`h-8 w-8 ${className}`}>
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

export default function CanvasToolbar({
  saving, readOnly, hasChanges, edgeStyle, onEdgeStyleChange,
  onSave, onDelete, onUndo, onRedo, canUndo, canRedo, onExport,
}: CanvasToolbarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="flex items-center gap-1 bg-card/95 backdrop-blur-md border border-border rounded-xl px-3 py-1.5 shadow-xl">
      <Btn icon={ZoomOut} label="Diminuir zoom" onClick={() => zoomOut()} />
      <Btn icon={ZoomIn} label="Aumentar zoom" onClick={() => zoomIn()} />
      <Btn icon={Maximize} label="Ajustar à tela" onClick={() => fitView({ padding: 0.2 })} />

      {!readOnly && (
        <>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Btn icon={Undo2} label="Desfazer (Ctrl+Z)" onClick={onUndo} disabled={!canUndo} />
          <Btn icon={Redo2} label="Refazer (Ctrl+Y)" onClick={onRedo} disabled={!canRedo} />

          <Separator orientation="vertical" className="h-5 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Select value={edgeStyle} onValueChange={(v) => onEdgeStyleChange(v as EdgeStyle)}>
                  <SelectTrigger className="h-7 w-[110px] text-[11px] border-border/50">
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

          <Separator orientation="vertical" className="h-5 mx-1" />
          <Btn icon={Trash2} label="Excluir selecionados (Del)" onClick={onDelete} className="text-destructive hover:text-destructive" />
          <Separator orientation="vertical" className="h-5 mx-1" />

          <Btn icon={Download} label="Exportar como PNG" onClick={onExport} />

          <Separator orientation="vertical" className="h-5 mx-1" />
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground border-warning/30 bg-warning/10">
                Alterado
              </Badge>
            )}
            <Button size="sm" onClick={onSave} disabled={saving} className="h-7 text-xs gap-1.5 px-3 rounded-lg">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar
            </Button>
          </div>
        </>
      )}

      {readOnly && (
        <>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span className="text-[10px]">Somente leitura</span>
          </div>
        </>
      )}
    </div>
  );
}
