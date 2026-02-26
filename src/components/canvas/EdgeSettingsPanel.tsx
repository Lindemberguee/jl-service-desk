import { useCallback, useEffect, useState, useRef } from 'react';
import { useReactFlow, type Edge } from '@xyflow/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { EdgeStyle, CustomEdgeData } from './CustomEdge';
import { Sparkles, Paintbrush } from 'lucide-react';

const PRESET_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
  '#ffffff', '#94a3b8',
];

interface EdgeSettingsPanelProps {
  selectedEdgeId: string | null;
  position: { x: number; y: number } | null;
}

export default function EdgeSettingsPanel({ selectedEdgeId, position }: EdgeSettingsPanelProps) {
  const { getEdge, setEdges } = useReactFlow();
  const [open, setOpen] = useState(false);
  const [localLabel, setLocalLabel] = useState('');
  const labelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const edge = selectedEdgeId ? getEdge(selectedEdgeId) : null;
  const data = (edge?.data || {}) as CustomEdgeData;

  useEffect(() => {
    if (selectedEdgeId && position) {
      setOpen(true);
      setLocalLabel(((getEdge(selectedEdgeId)?.data as CustomEdgeData)?.label) || '');
    } else {
      setOpen(false);
    }
  }, [selectedEdgeId, position, getEdge]);

  const updateEdgeData = useCallback((updates: Partial<CustomEdgeData>) => {
    if (!selectedEdgeId) return;
    setEdges((edges) =>
      edges.map((e) => {
        if (e.id !== selectedEdgeId) return e;
        const newData = { ...(e.data as CustomEdgeData), ...updates };
        return {
          ...e,
          data: newData,
          ...(updates.color ? {
            markerEnd: {
              ...(typeof e.markerEnd === 'object' ? e.markerEnd : {}),
              type: 'arrowclosed' as const,
              color: updates.color,
              width: 16,
              height: 16,
            },
          } : {}),
        };
      })
    );
  }, [selectedEdgeId, setEdges]);

  if (!open || !position || !edge) return null;

  return (
    <div
      className="fixed z-50"
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl p-3 w-[240px] space-y-3 animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <Paintbrush className="h-3.5 w-3.5" />
          Personalizar conexão
        </div>

        {/* Color */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Cor</Label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
                  data.color === c ? 'border-foreground scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c, boxShadow: data.color === c ? `0 0 8px ${c}` : undefined }}
                onClick={() => updateEdgeData({ color: c })}
              />
            ))}
          </div>
          <Input
            type="color"
            value={data.color || '#3b82f6'}
            onChange={(e) => updateEdgeData({ color: e.target.value })}
            className="h-7 w-full cursor-pointer"
          />
        </div>

        {/* Stroke width */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Espessura: {data.strokeWidth || 2}px
          </Label>
          <Slider
            value={[data.strokeWidth || 2]}
            onValueChange={([v]) => updateEdgeData({ strokeWidth: v })}
            min={1}
            max={6}
            step={0.5}
            className="w-full"
          />
        </div>

        {/* Edge style */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Estilo</Label>
          <Select
            value={data.edgeStyle || 'bezier'}
            onValueChange={(v) => updateEdgeData({ edgeStyle: v as EdgeStyle })}
          >
            <SelectTrigger className="h-7 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bezier">Curva suave</SelectItem>
              <SelectItem value="smoothstep">Angulada</SelectItem>
              <SelectItem value="straight">Reta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Animation */}
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Animação</Label>
          <Switch
            checked={data.animated !== false}
            onCheckedChange={(v) => updateEdgeData({ animated: v })}
          />
        </div>

        {/* Neon glow */}
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Neon
          </Label>
          <Switch
            checked={data.neon === true}
            onCheckedChange={(v) => updateEdgeData({ neon: v })}
          />
        </div>

        {/* Label */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Rótulo</Label>
          <Input
            value={localLabel}
            onChange={(e) => {
              const val = e.target.value;
              setLocalLabel(val);
              if (labelTimeoutRef.current) clearTimeout(labelTimeoutRef.current);
              labelTimeoutRef.current = setTimeout(() => updateEdgeData({ label: val }), 400);
            }}
            onBlur={() => updateEdgeData({ label: localLabel })}
            placeholder="Texto na conexão..."
            className="h-7 text-xs"
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-[10px] text-muted-foreground"
          onClick={() => setOpen(false)}
        >
          Fechar
        </Button>
      </div>
    </div>
  );
}
