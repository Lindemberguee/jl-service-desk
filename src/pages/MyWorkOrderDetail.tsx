import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/permissions';
import { SlaIndicator } from '@/components/SlaIndicator';
import { WorkOrderAttachments } from '@/components/WorkOrderAttachments';
import { calculateSlaStatus, formatRemainingTime } from '@/lib/sla';
import {
  ArrowLeft, Send, Loader2, Clock, MessageSquare, CheckSquare, AlertTriangle,
  Star, RefreshCw, ThumbsUp, FolderOpen, Building, MapPin, Package, UserCheck,
  Link, ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

/**
 * Reuses the same requester detail view (timeline, comments, approve/reopen)
 * but within the main admin layout, navigating back to /minhas-os.
 */
export default function MyWorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTenantId, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [showReopen, setShowReopen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const { data: wo, isLoading } = useQuery({
    queryKey: ['work_order', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('work_orders').select('*').eq('id', id!).is('deleted_at', null).maybeSingle();
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
      // Only show public events (same as portal)
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

  const woTenantId = wo?.tenant_id;

  const { data: category } = useQuery({
    queryKey: ['category', wo?.category_id],
    queryFn: async () => {
      if (!wo?.category_id) return null;
      const { data } = await supabase.from('categories').select('name').eq('id', wo.category_id).single();
      return data;
    },
    enabled: !!wo?.category_id,
  });

  const { data: unit } = useQuery({
    queryKey: ['unit', wo?.unit_id],
    queryFn: async () => {
      if (!wo?.unit_id) return null;
      const { data } = await supabase.from('units').select('name').eq('id', wo.unit_id).single();
      return data;
    },
    enabled: !!wo?.unit_id,
  });

  const { data: location } = useQuery({
    queryKey: ['location', wo?.location_id],
    queryFn: async () => {
      if (!wo?.location_id) return null;
      const { data } = await supabase.from('locations').select('name').eq('id', wo.location_id).single();
      return data;
    },
    enabled: !!wo?.location_id,
  });

  const { data: asset } = useQuery({
    queryKey: ['asset', wo?.asset_id],
    queryFn: async () => {
      if (!wo?.asset_id) return null;
      const { data } = await supabase.from('assets').select('name, patrimony_code').eq('id', wo.asset_id).single();
      return data;
    },
    enabled: !!wo?.asset_id,
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('work_order_events').insert({
        tenant_id: woTenantId || currentTenantId!,
        work_order_id: id!,
        type: 'comment_public' as any,
        actor_user_id: user?.id,
        payload: { text: comment },
      });
    },
    onSuccess: () => {
      setComment('');
      qc.invalidateQueries({ queryKey: ['work_order_events', id] });
      toast({ title: 'Mensagem enviada!' });
    },
  });

  const approveAndCloseMutation = useMutation({
    mutationFn: async () => {
      if (rating > 0) {
        await supabase.from('work_order_events').insert({
          tenant_id: woTenantId || currentTenantId!,
          work_order_id: id!,
          type: 'closed' as any,
          actor_user_id: user?.id,
          payload: { rating, comment: ratingComment, action: 'approved_by_requester' },
        });
      }
      await supabase.from('work_orders').update({
        status: 'encerrada' as any,
        closed_at: new Date().toISOString(),
      }).eq('id', id!);
    },
    onSuccess: () => {
      setShowRating(false);
      qc.invalidateQueries({ queryKey: ['work_order', id] });
      qc.invalidateQueries({ queryKey: ['work_order_events', id] });
      toast({ title: 'OS encerrada com sucesso!' });
    },
  });

  const reopenMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('work_order_events').insert({
        tenant_id: woTenantId || currentTenantId!,
        work_order_id: id!,
        type: 'reopened' as any,
        actor_user_id: user?.id,
        payload: { reason: reopenReason },
      });
      await supabase.from('work_orders').update({
        status: 'reaberta' as any,
        closed_at: null,
        resolved_at: null,
      }).eq('id', id!);
    },
    onSuccess: () => {
      setShowReopen(false);
      setReopenReason('');
      qc.invalidateQueries({ queryKey: ['work_order', id] });
      qc.invalidateQueries({ queryKey: ['work_order_events', id] });
      toast({ title: 'OS reaberta.' });
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
        <p>Ordem de serviço não encontrada.</p>
        <Button variant="link" onClick={() => navigate('/minhas-os')}>Voltar</Button>
      </div>
    );
  }

  const sla = calculateSlaStatus(wo);
  const isConcluida = wo.status === 'concluida';
  const isClosed = ['aprovada', 'encerrada'].includes(wo.status);
  const canApprove = isConcluida;
  const canReopen = isConcluida || isClosed;
  const canInteract = !isClosed;
  const showCosts = (wo.total_cost || 0) > 0;

  const eventIcons: Record<string, any> = {
    created: Clock, status_changed: Clock, comment_public: MessageSquare,
    resolved: CheckSquare, closed: CheckSquare, reopened: RefreshCw,
    assigned: UserCheck, attachment_added: Package,
  };
  const eventLabels: Record<string, string> = {
    created: 'OS criada', status_changed: 'Status atualizado',
    comment_public: 'Mensagem', resolved: 'Resolvida',
    closed: 'Encerrada', reopened: 'Reaberta', assigned: 'Atribuída',
    attachment_added: 'Anexo adicionado',
  };

  const progressSteps = ['aberta', 'em_execucao', 'concluida', 'encerrada'];
  const currentStepIndex = progressSteps.indexOf(wo.status);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 mt-0.5 rounded-xl" onClick={() => navigate('/minhas-os')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">{wo.code}</span>
            <Badge variant="outline" className={`text-[11px] ${priorityColors[wo.priority]}`}>
              {priorityLabels[wo.priority]}
            </Badge>
            <Badge variant="outline" className={`text-[11px] ${statusColors[wo.status]}`}>
              {statusLabels[wo.status]}
            </Badge>
            <SlaIndicator workOrder={wo} compact />
          </div>
          <h1 className="text-lg font-bold tracking-tight">{wo.title}</h1>
        </div>
      </div>

      {/* Status progress */}
      <Card className="border-border/50 shadow-none bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {progressSteps.map((step, idx, arr) => {
              const isActiveStep = wo.status === step;
              const isDone = currentStepIndex > idx || isClosed;
              const isIntermediate = !progressSteps.includes(wo.status) && idx === 0;
              return (
                <div key={step} className="flex items-center gap-1.5 shrink-0">
                  <div className={`h-8 px-3.5 rounded-full text-[11px] font-semibold flex items-center transition-all duration-300 ${
                    isActiveStep || isIntermediate
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : isDone
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted/60 text-muted-foreground'
                  }`}>
                    {isDone && !isActiveStep && <CheckSquare className="h-3 w-3 mr-1.5" />}
                    {statusLabels[step]}
                  </div>
                  {idx < arr.length - 1 && (
                    <div className={`w-6 h-0.5 rounded-full transition-colors ${isDone ? 'bg-primary/40' : 'bg-border'}`} />
                  )}
                </div>
              );
            })}
          </div>
          {!progressSteps.includes(wo.status) && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Status atual: <Badge variant="outline" className={`text-[10px] ${statusColors[wo.status]}`}>{statusLabels[wo.status]}</Badge>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Action bar */}
      {(canApprove || canReopen) && (
        <div className="flex gap-2 flex-wrap">
          {canApprove && (
            <Button className="gap-2 h-11 flex-1 sm:flex-none shadow-md" onClick={() => setShowRating(true)}>
              <ThumbsUp className="h-4 w-4" /> Aprovar e Encerrar
            </Button>
          )}
          {canReopen && (
            <Button variant="outline" className="gap-2 h-11 flex-1 sm:flex-none" onClick={() => setShowReopen(true)}>
              <RefreshCw className="h-4 w-4" /> Reabrir
            </Button>
          )}
        </div>
      )}

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {wo.description && (
            <Card className="border-border/50 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{wo.description}</p>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/50 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Contexto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {category && <InfoField icon={FolderOpen} label="Categoria" value={category.name} />}
                {unit && <InfoField icon={Building} label="Unidade" value={unit.name} />}
                {location && <InfoField icon={MapPin} label="Sala / Espaço" value={location.name} />}
                {asset && <InfoField icon={Package} label="Equipamento" value={`${(asset as any).name}${(asset as any).patrimony_code ? ` — Pat. ${(asset as any).patrimony_code}` : ''}`} />}
                {wo.assigned_to_id && <InfoField icon={UserCheck} label="Responsável" value={getProfileName(wo.assigned_to_id) || 'Atribuído'} />}
              </div>
              {wo.external_link && (
                <div className="mt-4 flex items-center gap-2 bg-muted/40 rounded-lg p-3">
                  <Link className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase font-medium text-muted-foreground">Link de Referência</p>
                    <a
                      href={wo.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline flex items-center gap-1 truncate"
                    >
                      {wo.external_link}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                </div>
              )}
              {wo.technical_note && (
                <div className="mt-4 bg-muted/40 rounded-lg p-3 space-y-2">
                  <p className="text-[11px] uppercase font-medium text-muted-foreground">Nota Técnica</p>
                  <p className="text-sm whitespace-pre-wrap">{wo.technical_note}</p>
                  <div className="flex gap-4">
                    {(wo.resolution_quality ?? 0) > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-muted-foreground mr-1">Qualidade:</span>
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s <= (wo.resolution_quality ?? 0) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                        ))}
                      </div>
                    )}
                    {(wo.resolution_time_rating ?? 0) > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-muted-foreground mr-1">Tempo:</span>
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s <= (wo.resolution_time_rating ?? 0) ? 'text-blue-500 fill-blue-500' : 'text-muted-foreground'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <WorkOrderAttachments workOrderId={id!} resolvedAt={wo.resolved_at} />

          {/* Timeline */}
          <Card className="border-border/50 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Atualizações</CardTitle>
            </CardHeader>
            <CardContent>
              {canInteract && (
                <div className="mb-4 pb-4 border-b border-border">
                  <div className="flex gap-2">
                    <Textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Envie uma mensagem para a equipe..."
                      rows={2}
                      className="flex-1 text-sm rounded-xl"
                    />
                    <Button
                      size="icon"
                      className="h-[68px] w-10 rounded-xl"
                      disabled={!comment.trim() || commentMutation.isPending}
                      onClick={() => commentMutation.mutate()}
                    >
                      {commentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

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
                          isComment ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                          <Icon className={`h-3.5 w-3.5 ${isComment ? 'text-primary' : 'text-muted-foreground'}`} />
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
                            <p className="text-sm mt-1 bg-muted/50 rounded-xl p-3">{payload.text}</p>
                          )}
                          {payload?.from && payload?.to && (
                            <div className="flex items-center gap-1 mt-1 text-[11px]">
                              <Badge variant="outline" className={`text-[10px] ${statusColors[payload.from] || ''}`}>
                                {statusLabels[payload.from] || payload.from}
                              </Badge>
                              <span>→</span>
                              <Badge variant="outline" className={`text-[10px] ${statusColors[payload.to] || ''}`}>
                                {statusLabels[payload.to] || payload.to}
                              </Badge>
                            </div>
                          )}
                          {payload?.rating && (
                            <div className="flex items-center gap-1 mt-1">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className={`h-3.5 w-3.5 ${s <= payload.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                              ))}
                            </div>
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

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="border-border/50 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <InfoRow label="Criada em" value={new Date(wo.created_at).toLocaleString('pt-BR')} />
              <InfoRow label="Atualizada" value={new Date(wo.updated_at).toLocaleString('pt-BR')} />
              {wo.started_at && <InfoRow label="Iniciada" value={new Date(wo.started_at).toLocaleString('pt-BR')} />}
              {wo.resolved_at && <InfoRow label="Resolvida" value={new Date(wo.resolved_at).toLocaleString('pt-BR')} />}
              {wo.closed_at && <InfoRow label="Encerrada" value={new Date(wo.closed_at).toLocaleString('pt-BR')} />}
              {wo.tags && wo.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap pt-1">
                  {wo.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] h-5">{tag}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {(wo.response_due_at || wo.resolve_due_at) && (
            <Card className="border-border/50 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" /> Prazos (SLA)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {wo.response_due_at && (
                  <div>
                    <p className="text-[11px] uppercase font-medium text-muted-foreground mb-0.5">Resposta até</p>
                    <p className="text-xs font-medium">{new Date(wo.response_due_at).toLocaleString('pt-BR')}</p>
                    {sla.responseRemainingMs !== null && !isClosed && (
                      <p className={`text-[11px] mt-0.5 ${sla.responseOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                        {sla.responseOverdue ? '⚠ Atrasada' : formatRemainingTime(sla.responseRemainingMs)}
                      </p>
                    )}
                  </div>
                )}
                {wo.resolve_due_at && (
                  <div>
                    <p className="text-[11px] uppercase font-medium text-muted-foreground mb-0.5">Solução até</p>
                    <p className="text-xs font-medium">{new Date(wo.resolve_due_at).toLocaleString('pt-BR')}</p>
                    {sla.resolveRemainingMs !== null && !isClosed && (
                      <p className={`text-[11px] mt-0.5 ${sla.resolveOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                        {sla.resolveOverdue ? '⚠ Atrasada' : formatRemainingTime(sla.resolveRemainingMs)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {showCosts && (
            <Card className="border-border/50 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Custos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 text-xs">
                  <InfoRow label="Serviços de terceiros" value={`R$ ${Number(wo.labor_cost || 0).toFixed(2)}`} />
                  <InfoRow label="Materiais" value={`R$ ${Number(wo.parts_cost || 0).toFixed(2)}`} />
                  <div className="flex justify-between pt-1 border-t border-border">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-primary">R$ {Number(wo.total_cost || 0).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Rating Dialog */}
      <Dialog open={showRating} onOpenChange={setShowRating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Avaliar e Encerrar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium mb-2 block">Como foi o atendimento?</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setRating(s)} className="p-1">
                    <Star className={`h-7 w-7 transition-colors ${s <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground hover:text-yellow-300'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Comentário (opcional)</Label>
              <Textarea
                value={ratingComment}
                onChange={e => setRatingComment(e.target.value)}
                placeholder="Conte como foi a experiência..."
                rows={3}
                className="text-sm mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowRating(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => approveAndCloseMutation.mutate()} disabled={approveAndCloseMutation.isPending}>
              {approveAndCloseMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Encerrar OS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Dialog */}
      <Dialog open={showReopen} onOpenChange={setShowReopen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reabrir OS</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs font-medium">Motivo da reabertura *</Label>
            <Textarea
              value={reopenReason}
              onChange={e => setReopenReason(e.target.value)}
              placeholder="Explique por que o problema não foi resolvido..."
              rows={3}
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowReopen(false)}>Cancelar</Button>
            <Button size="sm" disabled={!reopenReason.trim() || reopenMutation.isPending} onClick={() => reopenMutation.mutate()}>
              {reopenMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Reabrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoField({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || '—'}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
