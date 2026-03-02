import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Plus, X } from 'lucide-react';
import { useModuleCategories } from '@/hooks/useModuleCategories';

interface Props {
  module: 'library' | 'vault' | 'knowledge';
  label: string;
}

export function CategoryManager({ module, label }: Props) {
  const { categories, addCategory, removeCategory } = useModuleCategories(module);
  const [newCat, setNewCat] = useState('');
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    if (!newCat.trim()) return;
    addCategory.mutate(newCat.trim());
    setNewCat('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Gerenciar categorias">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Categorias — {label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nova categoria..."
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={addCategory.isPending} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <Badge key={cat} variant="secondary" className="gap-1 pr-1">
                {cat}
                <button
                  onClick={() => removeCategory.mutate(cat)}
                  className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
