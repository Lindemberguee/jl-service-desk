import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/permissions';
import { SlaIndicator } from '@/components/SlaIndicator';
import { calculateSlaStatus, formatRemainingTime } from '@/lib/sla';
import { ArrowLeft, Send, Loader2, Clock, MessageSquare, CheckSquare, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function PortalWorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTenantId, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');

  const { data: wo, isLoading } = useQuery({
    queryKey: ['work_order', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('work_orders').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['work_order_events', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('work_order_events').select('*')
        .eq('work_order_id', id!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      // Filter out internal comments for the requester portal
      return (data || []).filter((e: any) => e.type !== 'comment_internal');
    },
    enabled: !!id,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles_list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, name');
      return data || [];
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('work_order_events').insert({
        tenant_id: currentTenantId!,
        work_order_id: id!,
        type: 'comment_public' as any,
        actor_user_id: user?.id,
        payload: { text: comment },
      });
    },
    onSuccess: () => {
      setComment('');
      qc.invalidateQueries({ queryKey: ['work_order_events', id] });
      toast({ title: 'Comentário enviado!' });
    },
  });

  const getProfileName = (userId: string | null) => {
    if (!userId) return null;
    return profiles.find((p: any) => p.id === userId)?.name || 'Equipe';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!wo) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Solicitação não encontrada.</p>
        <Button variant="link" onClick={() => navigate('/portal')}>Voltar</Button>
      </div>
    );
  }

  const sla = calculateSlaStatus(wo);
  const isClosed = ['concluida', 'aprovada', 'encerrada'].includes(wo.status);

  const eventIcons: Record<string, any> = {
    created: Clock, status_changed: Clock, comment_public: MessageSquare,
    resolved: CheckSquare, closed: CheckSquare, reopened: Clock,
    assigned: Clock, attachment_added: Clock,
    time_started: Clock, time_paused: Clock, time_resumed: Clock,
  };
  const eventLabels: Record<string, string> = {
    created: 'Solicitação criada', status_changed: 'Status atualizado',
    comment_public: 'Comentário', resolved: 'Resolvida',
    closed: 'Encerrada', reopened: 'Reaberta', assigned: 'Atribuída',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5" onClick={() => navigate('/portal')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-mono text-muted-foreground">{wo.code}</span>
            <Badge variant="outline" className={`text-[11px] ${priorityColors[wo.priority]}`}>
              {priorityLabels[wo.priority]}
            </Badge>
            <Badge variant="outline" className={`text-[11px] ${statusColors[wo.status]}`}>
              {statusLabels[wo.status]}
            </Badge>
            <SlaIndicator workOrder={wo} compact />
          </div>
          <h1 className="text-lg font-semibold">{wo.title}</h1>
        </div>
      </div>

      {/* Status progress */}
      <Card className="border-border shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {['aberta', 'em_execucao', 'concluida', 'encerrada'].map((step, idx, arr) => {
              const stepOrder = arr.indexOf(wo.status);
              const thisOrder = idx;
              const isActive = wo.status === step;
              const isDone = stepOrder > thisOrder || isClosed;
              return (
                <div key={step} className="flex items-center gap-1 shrink-0">
                  <div className={`h-7 px-3 rounded-full text-[11px] font-medium flex items-center ${
                    isActive ? 'bg-primary text-primary-foreground' :
                    isDone ? 'bg-primary/10 text-primary' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {statusLabels[step]}
                  </div>
                  {idx < arr.length - 1 && <div className={`w-4 h-0.5 ${isDone ? 'bg-primary' : 'bg-border'}`} />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Descrição</CardTitle>
        </CardHeader>
        <CardContent>
          {wo.description ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{wo.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Sem descrição.</p>
          )}
        </CardContent>
      </Card>

      {/* SLA info if available */}
      {(wo.response_due_at || wo.resolve_due_at) && (
        <Card className="border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Prazo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {wo.resolve_due_at && (
                <div>
                  <p className="text-[11px] uppercase font-medium text-muted-foreground mb-1">Previsão de solução</p>
                  <p className="text-sm font-medium">{new Date(wo.resolve_due_at).toLocaleString('pt-BR')}</p>
                  {sla.resolveRemainingMs !== null && !isClosed && (
                    <p className={`text-xs mt-0.5 ${sla.resolveOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                      {sla.resolveOverdue ? '⚠ Atrasada' : `Restante: ${formatRemainingTime(sla.resolveRemainingMs)}`}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="border-border shadow-none">
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Criada em</span>
              <p className="font-medium">{new Date(wo.created_at).toLocaleString('pt-BR')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Última atualização</span>
              <p className="font-medium">{new Date(wo.updated_at).toLocaleString('pt-BR')}</p>
            </div>
            {wo.resolved_at && (
              <div>
                <span className="text-muted-foreground">Resolvida em</span>
                <p className="font-medium">{new Date(wo.resolved_at).toLocaleString('pt-BR')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline / Comments */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Atualizações</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Comment input */}
          {!isClosed && (
            <div className="mb-4 pb-4 border-b border-border">
              <div className="flex gap-2">
                <Textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Envie uma mensagem para a equipe..."
                  rows={2}
                  className="flex-1 text-sm"
                />
                <Button
                  size="icon"
                  className="h-[68px] w-9"
                  disabled={!comment.trim() || commentMutation.isPending}
                  onClick={() => commentMutation.mutate()}
                >
                  {commentMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          )}

          {/* Events */}
          <div className="space-y-0">
            {events.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">Nenhuma atualização ainda.</p>
            ) : (
              events.map((ev: any, idx: number) => {
                const Icon = eventIcons[ev.type] || Clock;
                const payload = ev.payload as any;
                const isComment = ev.type === 'comment_public';
                const actorName = getProfileName(ev.actor_user_id);

                return (
                  <div key={ev.id} className="flex gap-3 items-start relative">
                    {idx < events.length - 1 && (
                      <div className="absolute left-[13px] top-8 bottom-0 w-px bg-border" />
                    )}
                    <div className={`mt-1 h-7 w-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                      isComment ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-muted'
                    }`}>
                      <Icon className={`h-3.5 w-3.5 ${isComment ? 'text-blue-600' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {actorName && <span className="text-xs font-semibold">{actorName}</span>}
                        <span className="text-xs text-muted-foreground">
                          {eventLabels[ev.type] || ev.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-muted-foreground ml-auto">
                          {new Date(ev.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {payload?.text && (
                        <p className="text-sm mt-1 bg-muted/50 rounded-md p-2">{payload.text}</p>
                      )}
                      {payload?.from && payload?.to && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          <Badge variant="outline" className={`text-[10px] mr-1 ${statusColors[payload.from] || ''}`}>
                            {statusLabels[payload.from] || payload.from}
                          </Badge>
                          →
                          <Badge variant="outline" className={`text-[10px] ml-1 ${statusColors[payload.to] || ''}`}>
                            {statusLabels[payload.to] || payload.to}
                          </Badge>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}