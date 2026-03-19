import { Lock, Globe, MoreHorizontal, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface PlanLike {
  id: string;
  name: string;
  scope: 'personal' | 'team';
}

interface Props {
  plans: PlanLike[];
  selectedPlanId?: string | null;
  onSelect: (id: string) => void;
  onRename?: () => void;
  onDelete?: () => void;
}

export function PlannerWorkspaceTabs({ plans, selectedPlanId, onSelect, onRename, onDelete }: Props) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-2 shadow-sm">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {plans.map((plan) => {
          const isActive = plan.id === selectedPlanId;
          return (
            <button
              key={plan.id}
              onClick={() => onSelect(plan.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground'
              )}
            >
              <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-lg', isActive ? 'bg-primary/15' : 'bg-muted')}>
                {plan.scope === 'personal' ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
              </span>
              <span>{plan.name}</span>
              {isActive ? <Star className="h-3.5 w-3.5" /> : null}
            </button>
          );
        })}

        {(onRename || onDelete) && selectedPlanId ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-9 w-9 rounded-xl p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl">
              {onRename ? <DropdownMenuItem onClick={onRename}>Renomear</DropdownMenuItem> : null}
              {onDelete ? <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>Excluir</DropdownMenuItem> : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}
