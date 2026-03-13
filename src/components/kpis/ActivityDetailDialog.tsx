import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar, Users, Target, Clock, CheckCircle2, Play, Pause, AlertTriangle,
  Timer, Trash2, BarChart3, ExternalLink, Plus, X, LinkIcon, MapPin, Building2,
  ChevronDown, ChevronUp
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
  objective: OkrObjective | null;
  activities: OkrKeyResult[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateLinks?: (activityId: string, links: ActivityLink[]) => void;
  canManage?: boolean;
}

export function ActivityDetailDialog({ objective, activities, open, onOpenChange, onUpdateLinks, canManage }: Props) {
  if (!objective) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 max-h-[85vh]">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
          <div className="relative space-y-3">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-base font-semibold leading-snug">
                {objective.title}
              </DialogTitle>
              {objective.description && (
                <p className="text-xs text-muted-foreground">{objective.description}</p>
              )}
            </DialogHeader>

            <div className="flex items-center gap-3 flex-wrap">
              {objective.indicator && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <BarChart3 className="h-3 w-3" />
                  {objective.indicator}
                </Badge>
              )}
              {objective.target_label && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Target className="h-3 w-3" />
                  Meta: {objective.target_label}
                </Badge>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <Progress value={objective.progress} className="h-1.5 w-20" />
                <span className="text-xs font-bold tabular-nums">{Math.round(objective.progress)}%</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Activities */}
        <ScrollArea className="max-h-[60vh]">
          <div className="px-6 py-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Atividades ({activities.length})
            </p>

            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade cadastrada</p>
            ) : (
              activities.map(activity => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onUpdateLinks={onUpdateLinks}
                  canManage={canManage}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/* ── Activity Card ── */

function ActivityCard({ activity, onUpdateLinks, canManage }: {
  activity: OkrKeyResult;
  onUpdateLinks?: (id: string, links: ActivityLink[]) => void;
  canManage?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const status = activityStatuses[activity.activity_status] || activityStatuses.a_iniciar;
  const StatusIcon = status.icon;
  const links: ActivityLink[] = Array.isArray(activity.links) ? activity.links : [];

  const progressPct = activity.target_value > activity.start_value
    ? Math.min(Math.max(((activity.current_value - activity.start_value) / (activity.target_value - activity.start_value)) * 100, 0), 100)
    : 0;

  const daysInfo = (() => {
    if (!activity.end_date) return null;
    const end = parseISO(activity.end_date);
    const today = new Date();
    const days = differenceInDays(end, today);
    if (['finalizado', 'finalizado_com_atraso'].includes(activity.activity_status)) {
      if (activity.delivery_date) {
        const deliveryDiff = differenceInDays(parseISO(activity.delivery_date), end);
        return deliveryDiff > 0
          ? { text: `Entregue com ${deliveryDiff}d de atraso`, urgent: true }
          : { text: `Entregue ${Math.abs(deliveryDiff)}d antes do prazo`, urgent: false };
      }
      return { text: 'Finalizado', urgent: false };
    }
    if (days < 0) return { text: `${Math.abs(days)}d em atraso`, urgent: true };
    if (days === 0) return { text: 'Vence hoje', urgent: true };
    return { text: `${days}d restantes`, urgent: days <= 7 };
  })();

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return;
    const label = newLinkLabel.trim() || newLinkUrl.trim();
    onUpdateLinks?.(activity.id, [...links, { label, url: newLinkUrl.trim() }]);
    setNewLinkLabel('');
    setNewLinkUrl('');
    setShowAddLink(false);
  };

  const handleRemoveLink = (index: number) => {
    onUpdateLinks?.(activity.id, links.filter((_, i) => i !== index));
  };

  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 overflow-hidden">
      {/* Card Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{activity.title}</p>
          {activity.description && !expanded && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{activity.description}</p>
          )}
        </div>
        <Badge variant="outline" className={cn('text-[10px] gap-1 font-semibold shrink-0', status.bgClass)}>
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </Badge>
        {daysInfo && (
          <Badge variant="outline" className={cn(
            'text-[10px] gap-1 shrink-0',
            daysInfo.urgent ? 'border-destructive/40 text-destructive' : 'border-emerald-500/40 text-emerald-500'
          )}>
            <Timer className="h-3 w-3" />
            {daysInfo.text}
          </Badge>
        )}
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/40">
          {/* Description */}
          {activity.description && (
            <p className="text-xs text-muted-foreground pt-3 leading-relaxed">{activity.description}</p>
          )}

          {/* Progress */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-bold">{Math.round(progressPct)}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Inicial: {activity.start_value} {activity.unit}</span>
              <span>Atual: {activity.current_value} {activity.unit}</span>
              <span>Meta: {activity.target_value} {activity.unit}</span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <InfoItem icon={Users} label="Responsável" value={activity.responsible_name || '—'} />
            <InfoItem icon={Building2} label="Equipe de Apoio" value={activity.support_team || '—'} />
            <InfoItem icon={MapPin} label="Área" value={activity.area || '—'} />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-2">
            <DateItem label="Início" date={activity.start_date} />
            <DateItem label="Prazo Final" date={activity.end_date} urgent={daysInfo?.urgent} />
            <DateItem label="Entrega" date={activity.delivery_date} />
          </div>

          {/* Links */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <LinkIcon className="h-3 w-3" />
                Links
              </p>
              {canManage && (
                <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-1 px-1.5" onClick={() => setShowAddLink(!showAddLink)}>
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>

            {showAddLink && (
              <div className="flex items-end gap-2 p-2.5 rounded-lg border border-dashed bg-muted/30">
                <div className="flex-1 space-y-1">
                  <Input placeholder="Título (opcional)" value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)} className="h-6 text-[11px]" />
                  <Input placeholder="https://..." value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} className="h-6 text-[11px]" onKeyDown={e => e.key === 'Enter' && handleAddLink()} />
                </div>
                <Button size="sm" className="h-6 text-[10px]" onClick={handleAddLink}>Salvar</Button>
              </div>
            )}

            {links.length > 0 ? (
              <div className="space-y-1">
                {links.map((link, i) => (
                  <div key={i} className="group flex items-center gap-2 px-2.5 py-1.5 rounded-md border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <ExternalLink className="h-3 w-3 text-primary shrink-0" />
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline truncate flex-1">
                      {link.label}
                    </a>
                    {canManage && (
                      <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => handleRemoveLink(i)}>
                        <X className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : !showAddLink && (
              <p className="text-[10px] text-muted-foreground/60 text-center py-1">Nenhum link</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-[11px] font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function DateItem({ label, date, urgent }: { label: string; date: string | null; urgent?: boolean }) {
  return (
    <div className={cn("p-2 rounded-lg text-center", urgent ? 'bg-destructive/5 ring-1 ring-destructive/20' : 'bg-muted/30')}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={cn("text-[11px] font-medium mt-0.5", urgent && 'text-destructive')}>
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
