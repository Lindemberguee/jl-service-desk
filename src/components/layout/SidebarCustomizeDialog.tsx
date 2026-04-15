import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface MenuItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

interface Section {
  label: string;
  items: MenuItem[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sections: Section[];
  hiddenPaths: string[];
  onSave: (paths: string[]) => void;
  isSaving?: boolean;
}

export function SidebarCustomizeDialog({ open, onOpenChange, sections, hiddenPaths, onSave, isSaving }: Props) {
  const [local, setLocal] = useState<Set<string>>(new Set(hiddenPaths));

  useEffect(() => {
    if (open) setLocal(new Set(hiddenPaths));
  }, [open, hiddenPaths]);

  const toggle = (path: string) => {
    setLocal(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  const handleSave = () => {
    onSave(Array.from(local));
    toast.success('Menu personalizado salvo');
    onOpenChange(false);
  };

  const totalItems = sections.reduce((n, s) => n + s.items.length, 0);
  const visibleCount = totalItems - local.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Personalizar Menu</DialogTitle>
          <DialogDescription>
            Desmarque os itens que deseja ocultar do menu lateral. {visibleCount} de {totalItems} visíveis.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-3 -mr-3">
          <div className="space-y-4">
            {sections.map((section, idx) => (
              <div key={section.label}>
                {idx > 0 && <Separator className="mb-3" />}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{section.label}</p>
                <div className="space-y-2">
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const hidden = local.has(item.path);
                    return (
                      <label
                        key={item.path}
                        className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={!hidden}
                          onCheckedChange={() => toggle(item.path)}
                        />
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <Label className="cursor-pointer text-sm font-normal">{item.label}</Label>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => { setLocal(new Set()); }}>
            Mostrar todos
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
