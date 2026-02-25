import { NODE_PRESETS } from './CanvasNode';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator,
  ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Copy, Clipboard, Trash2, Plus } from 'lucide-react';

interface CanvasContextMenuProps {
  children: React.ReactNode;
  onAddNode: (type: string, position: { x: number; y: number }) => void;
  onDeleteSelected: () => void;
  onDuplicate: () => void;
  onSelectAll: () => void;
  position: React.MutableRefObject<{ x: number; y: number }>;
}

export default function CanvasContextMenu({
  children, onAddNode, onDeleteSelected, onDuplicate, onSelectAll, position,
}: CanvasContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2">
            <Plus className="h-3.5 w-3.5" /> Adicionar nó
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            {NODE_PRESETS.map(p => {
              const Icon = p.icon;
              return (
                <ContextMenuItem
                  key={p.type}
                  className="gap-2"
                  onClick={() => onAddNode(p.type, position.current)}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: p.color }} />
                  {p.label}
                </ContextMenuItem>
              );
            })}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem className="gap-2" onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5" /> Duplicar selecionados
        </ContextMenuItem>
        <ContextMenuItem className="gap-2" onClick={onSelectAll}>
          <Clipboard className="h-3.5 w-3.5" /> Selecionar todos
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="gap-2 text-destructive" onClick={onDeleteSelected}>
          <Trash2 className="h-3.5 w-3.5" /> Excluir selecionados
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
