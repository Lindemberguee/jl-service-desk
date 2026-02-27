import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Calendar, Users, Target, Clock, CheckCircle2, Play, Pause, AlertTriangle,
  Timer, Trash2, BarChart3, ExternalLink, Plus, X, LinkIcon, MapPin, Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { OkrKeyResult, OkrObjective } from '@/hooks/useOkrs';

interface ActivityLink {
  label: string;
  url: string;
}

const activityStatuses: Record<string, { label: string; color: string; icon: React.ElementType; bgClass: string }> = {
  a_iniciar: { label: 'A Iniciar', color: 'text-sky-500', icon: Clock, bgClass: 'bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400' },
  em_andamento: { label: 'Em Andamento', color: 'text-amber-500', icon: Play, bgClass: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' },
  no_prazo: { label: 'No Prazo', color: 'text-emerald-500', icon: CheckCircle2, bgClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
  atrasado: { label: 'Atrasado', color: 'text-destructive', icon: AlertTriangle, bgClass: 'bg-destructive/10 border-destructive/20 text-destructive' },
  finalizado: { label: 'Finalizado', color: 'text-primary', icon: CheckCircle2, bgClass: 'bg-primary/10 border-primary/20 text-primary' },
  finalizado_com_atraso: { label: 'Finalizado c/ Atraso', color: 'text-orange-500', icon: Timer, bgClass: 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400' },
  pausado: { label: 'Pausado', color: 'text-muted-foreground', icon: Pause, bgClass: 'bg-muted border-border text-muted-foreground' },
  cancelado: { label: 'Cancelado', color: 'text-muted-foreground', icon: Trash2, bgClass: 'bg-muted border-border text-muted-foreground' },
};

interface Props {
  activity: OkrKeyResult | null;
  objective: OkrObjective | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateLinks?: (activityId: string, links: ActivityLink[]) => void;
  canManage?: boolean;
}

export function ActivityDetailDialog({ activity, objective, open, onOpenChange, onUpdateLinks, canManage }: Props) {
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [showAddLink, setShowAddLink] = useState(false);

  if (!activity) return null;

  const status = activityStatuses[activity.activity_status] || activityStatuses.a_iniciar;
  const StatusIcon = status.icon;
  const links: ActivityLink[] = Array.isArray((activity as any).links) ? (activity as any).links : [];

  const progressPct = activity.target_value > activity.start_value
    ? Math.min(Math.max(((activity.current_value - activity.start_value) / (activity.target_value - activity.start_value)) * 100, 0), 100)
    : 0;

  const daysInfo = (() => {
    if (!activity.end_date) return null;
    const end = parseISO(activity.end_date);
    const today = new Date();
    const days = differenceInDays(end, today);
    if (activity.activity_status === 'finalizado' || activity.activity_status === 'finalizado_com_atraso') {
      if (activity.delivery_date) {
        const deliveryDiff = differenceInDays(parseISO(activity.delivery_date), end);
        return deliveryDiff > 0
          ? { text: `Entregue com ${deliveryDiff}d de atraso`, urgent: true }
          : { text: `Entregue ${Math.abs(deliveryDiff)}d antes do prazo`, urgent: false };
      }
      return { text: 'Finalizado', urgent: false };
    }
    if (days < 0) return { text: `${Math.abs(days)} dias em atraso`, urgent: true };
    if (days === 0) return { text: 'Vence hoje', urgent: true };
    return { text: `${days} dias restantes`, urgent: days <= 7 };
  })();

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return;
    const label = newLinkLabel.trim() || newLinkUrl.trim();
    const updatedLinks = [...links, { label, url: newLinkUrl.trim() }];
    onUpdateLinks?.(activity.id, updatedLinks);
    setNewLinkLabel('');
    setNewLinkUrl('');
    setShowAddLink(false);
  };

  const handleRemoveLink = (index: number) => {
    const updatedLinks = links.filter((_, i) => i !== index);
    onUpdateLinks?.(activity.id, updatedLinks);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
        {/* Header with gradient accent */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
          <div className="relative space-y-3">
            <div className="flex items-start justify-between gap-4">
              <DialogHeader className="flex-1 space-y-1 text-left">
                <DialogTitle className="text-base font-semibold leading-snug pr-4">
                  {activity.title}
                </DialogTitle>
                {objective && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Target className="h-3 w-3 shrink-0" />
                    {objective.title}
                  </p>
                )}
              </DialogHeader>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn('text-[10px] gap-1 font-semibold', status.bgClass)}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
              {daysInfo && (
                <Badge variant="outline" className={cn(
                  'text-[10px] gap-1',
                  daysInfo.urgent ? 'border-destructive/40 text-destructive' : 'border-emerald-500/40 text-emerald-500'
                )}>
                  <Timer className="h-3 w-3" />
                  {daysInfo.text}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Content */}
        <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Progresso</span>
              <span className="font-bold text-sm">{Math.round(progressPct)}%</span>
            </div>
            <Progress value={progressPct} className="h-2.5" />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Inicial: {activity.start_value} {activity.unit}</span>
              <span>Atual: {activity.current_value} {activity.unit}</span>
              <span>Meta: {activity.target_value} {activity.unit}</span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoItem icon={Users} label="Responsável" value={activity.responsible_name || '—'} />
            <InfoItem icon={Building2} label="Equipe de Apoio" value={activity.support_team || '—'} />
            <InfoItem icon={MapPin} label="Área" value={activity.area || '—'} />
            <InfoItem icon={BarChart3} label="Confiança" value={`${activity.confidence_level ?? 70}%`} />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-3">
            <DateItem label="Início" date={activity.start_date} />
            <DateItem label="Prazo Final" date={activity.end_date} urgent={daysInfo?.urgent} />
            <DateItem label="Entrega" date={activity.delivery_date} />
          </div>

          {activity.description && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Descrição</p>
                <p className="text-sm leading-relaxed">{activity.description}</p>
              </div>
            </>
          )}

          {/* Links Section */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <LinkIcon className="h-3 w-3" />
                Links & Arquivos
              </p>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1"
                  onClick={() => setShowAddLink(!showAddLink)}
                >
                  <Plus className="h-3 w-3" />
                  Adicionar
                </Button>
              )}
            </div>

            {showAddLink && (
              <div className="flex items-end gap-2 p-3 rounded-lg border border-dashed bg-muted/30">
                <div className="flex-1 space-y-1.5">
                  <Input
                    placeholder="Título (opcional)"
                    value={newLinkLabel}
                    onChange={e => setNewLinkLabel(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <Input
                    placeholder="https://..."
                    value={newLinkUrl}
                    onChange={e => setNewLinkUrl(e.target.value)}
                    className="h-7 text-xs"
                    onKeyDown={e => e.key === 'Enter' && handleAddLink()}
                  />
                </div>
                <Button size="sm" className="h-7 text-xs" onClick={handleAddLink}>
                  Salvar
                </Button>
              </div>
            )}

            {links.length > 0 ? (
              <div className="space-y-1.5">
                {links.map((link, i) => (
                  <div key={i} className="group flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate flex-1"
                    >
                      {link.label}
                    </a>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={() => handleRemoveLink(i)}
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground/60 text-center py-2">
                Nenhum link adicionado
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function DateItem({ label, date, urgent }: { label: string; date: string | null; urgent?: boolean }) {
  return (
    <div className={cn(
      "p-2.5 rounded-lg text-center",
      urgent ? 'bg-destructive/5 ring-1 ring-destructive/20' : 'bg-muted/30'
    )}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={cn("text-xs font-medium mt-0.5", urgent && 'text-destructive')}>
        {date ? (
          <>
            <Calendar className="h-3 w-3 inline mr-1" />
            {format(parseISO(date), 'dd/MM/yyyy')}
          </>
        ) : '—'}
      </p>
    </div>
  );
}
