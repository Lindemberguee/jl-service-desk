import { Lock, Globe, MoreHorizontal, Star, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
    <div className="rounded-2xl border border-border/70 bg-card p-1.5 shadow-sm overflow-hidden">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {plans.map((plan) => {
          const isActive = plan.id === selectedPlanId;
          return (
            <button
              key={plan.id}
              onClick={() => onSelect(plan.id)}
              className={cn(
                'group relative inline-flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all shrink-0',
                isActive
                  ? 'border-primary/30 bg-primary/5 text-primary shadow-[0_2px_10px_-4px_hsl(var(--primary)/0.2)]'
                  : 'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <span className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-lg transition-colors', 
                isActive ? 'bg-primary/20 text-primary' : 'bg-muted group-hover:bg-muted-foreground/10'
              )}>
                {plan.scope === 'personal' ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
              </span>
              <span className="truncate max-w-[120px]">{plan.name}</span>
              {isActive && (
                <motion.span 
                  layoutId="active-star"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-primary/60"
                >
                  <Star className="h-3.5 w-3.5 fill-current" />
                </motion.span>
              )}
            </button>
          );
        })}

        <div className="flex-1" />

        {(onRename || onDelete) && selectedPlanId ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-10 w-10 rounded-xl p-0 hover:bg-muted/80">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-xl border-border/60 shadow-xl">
              {onRename ? (
                <DropdownMenuItem onClick={onRename} className="rounded-lg gap-2 cursor-pointer py-2">
                  <Pencil className="h-4 w-4" /> 
                  <span>Renomear plano</span>
                </DropdownMenuItem>
              ) : null}
              {onDelete ? (
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive rounded-lg gap-2 cursor-pointer py-2" 
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" /> 
                  <span>Excluir plano</span>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}
