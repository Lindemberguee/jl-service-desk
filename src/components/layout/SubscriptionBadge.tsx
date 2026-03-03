import { Crown, Calendar, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const planLabels: Record<string, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
  custom: 'Custom',
};

const planStyles: Record<string, string> = {
  starter: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
  professional: 'from-violet-500/20 to-purple-600/10 border-violet-500/30 text-violet-400',
  enterprise: 'from-amber-500/20 to-yellow-600/10 border-amber-500/30 text-amber-400',
  custom: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/30 text-emerald-400',
};

export function SubscriptionBadge() {
  const { subscription, currentRole } = useAuth();

  if (!subscription || currentRole === 'super_admin') return null;

  const plan = subscription.plan || 'starter';
  const label = planLabels[plan] || plan;
  const style = planStyles[plan] || planStyles.starter;

  // Calculate expiry info
  const expiryDate = subscription.status === 'trial'
    ? subscription.trial_ends_at
    : subscription.current_period_end;

  const isIndefinite = expiryDate && new Date(expiryDate).getFullYear() >= 2090;

  let daysLeft: number | null = null;
  let expiryLabel = '';
  let isUrgent = false;

  if (expiryDate && !isIndefinite) {
    const end = new Date(expiryDate);
    daysLeft = Math.ceil((end.getTime() - Date.now()) / 86400000);
    expiryLabel = format(end, "dd MMM yyyy", { locale: ptBR });
    isUrgent = daysLeft <= 7 && daysLeft > 0;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-gradient-to-r text-[11px] font-semibold tracking-wide cursor-default transition-all ${style}`}
        >
          <Crown className="h-3 w-3" />
          <span>{label}</span>
          {isUrgent && <AlertTriangle className="h-3 w-3 text-warning animate-pulse" />}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs space-y-1 max-w-[200px]">
        <p className="font-semibold">Plano {label}</p>
        {subscription.status === 'trial' && (
          <p className="text-warning-foreground">🧪 Período de teste</p>
        )}
        {isIndefinite ? (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Contrato indeterminado</span>
          </div>
        ) : expiryDate ? (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {daysLeft !== null && daysLeft <= 0
                ? 'Expirado'
                : `Vence em ${expiryLabel}`}
            </span>
          </div>
        ) : null}
        {daysLeft !== null && daysLeft > 0 && !isIndefinite && (
          <p className={`text-[10px] ${isUrgent ? 'text-warning' : 'text-muted-foreground'}`}>
            {daysLeft} dia{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
