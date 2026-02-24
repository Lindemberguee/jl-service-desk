import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/permissions';
import { SlaIndicator } from '@/components/SlaIndicator';
import { calculateSlaStatus, formatRemainingTime } from '@/lib/sla';
import {
  ArrowLeft, Send, Loader2, Clock, MessageSquare, CheckSquare, AlertTriangle,
  Paperclip, Download, Star, RefreshCw, ThumbsUp, X, FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef } from 'react';

export default function PortalWorkOrderDetail() {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      return (data || []).filter((e: any) => e.type !== 'comment_internal');
    },
    enabled: !!id,
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ['work_order_attachments', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('work_order_attachments').select('*')
        .eq('work_order_id', id!).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
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
      toast({ title: 'Mensagem enviada!' });
    },
  });

  const approveAndCloseMutation = useMutation({
    mutationFn: async () => {
      // Add rating event
      if (rating > 0) {
        await supabase.from('work_order_events').insert({
          tenant_id: currentTenantId!,
          work_order_id: id!,
          type: 'closed' as any,
          actor_user_id: user?.id,
          payload: { rating, comment: ratingComment, action: 'approved_by_requester' },
        });
      }
      // Update status to encerrada
      await supabase.from('work_orders').update({
        status: 'encerrada' as any,
        closed_at: new Date().toISOString(),
      }).eq('id', id!);
    },
    onSuccess: () => {
      setShowRating(false);
      qc.invalidateQueries({ queryKey: ['work_order', id] });
      qc.invalidateQueries({ queryKey: ['work_order_events', id] });
      toast({ title: 'Solicitação encerrada com sucesso!' });
    },
  });

  const reopenMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('work_order_events').insert({
        tenant_id: currentTenantId!,
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
      toast({ title: 'Solicitação reaberta.' });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !id) return;
    const file = e.target.files[0];
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_SIZE) {
      toast({ title: 'Arquivo muito grande', description: `Limite de 10 MB. O arquivo tem ${(file.size / 1048576).toFixed(1)} MB.`, variant: 'destructive' });
      return;
    }
    const path = `${currentTenantId}/${id}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from('work-order-attachments').upload(path, file);
    if (uploadErr) {
      toast({ title: 'Erro no upload', description: uploadErr.message, variant: 'destructive' });
      return;
    }
    await supabase.from('work_order_attachments').insert({
      tenant_id: currentTenantId!,
      work_order_id: id,
      file_name: file.name,
      storage_key: path,
      mime_type: file.type,
      size: file.size,
      uploaded_by: user?.id,
    });
    qc.invalidateQueries({ queryKey: ['work_order_attachments', id] });
    toast({ title: 'Anexo enviado!' });
  };

  const downloadAttachment = async (att: any) => {
    if (!att.storage_key) return;
    const { data } = await supabase.storage.from('work-order-attachments').createSignedUrl(att.storage_key, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

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
  const isConcluida = wo.status === 'concluida';
  const isClosed = ['aprovada', 'encerrada'].includes(wo.status);
  const canApprove = isConcluida;
  const canReopen = isConcluida || isClosed;
  const canInteract = !isClosed;
  const showCosts = (wo.total_cost || 0) > 0;

  const eventIcons: Record<string, any> = {
    created: Clock, status_changed: Clock, comment_public: MessageSquare,
    resolved: CheckSquare, closed: CheckSquare, reopened: RefreshCw,
    assigned: Clock, attachment_added: Paperclip,
  };
  const eventLabels: Record<string, string> = {
    created: 'Solicitação criada', status_changed: 'Status atualizado',
    comment_public: 'Mensagem', resolved: 'Resolvida',
    closed: 'Encerrada', reopened: 'Reaberta', assigned: 'Atribuída',
    attachment_added: 'Anexo adicionado',
  };

  // Progress bar steps
  const progressSteps = ['aberta', 'em_execucao', 'concluida', 'encerrada'];
  const currentStepIndex = progressSteps.indexOf(wo.status);

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
            {progressSteps.map((step, idx, arr) => {
              const isActive = wo.status === step;
              const isDone = currentStepIndex > idx || isClosed;
              // Handle intermediate statuses
              const isIntermediate = !progressSteps.includes(wo.status) && idx === 0;
              return (
                <div key={step} className="flex items-center gap-1 shrink-0">
                  <div className={`h-7 px-3 rounded-full text-[11px] font-medium flex items-center ${
                    isActive || isIntermediate ? 'bg-primary text-primary-foreground' :
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
          {/* Show actual status if intermediate */}
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
            <Button size="sm" className="gap-1.5" onClick={() => setShowRating(true)}>
              <ThumbsUp className="h-3.5 w-3.5" /> Aprovar e Encerrar
            </Button>
          )}
          {canReopen && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowReopen(true)}>
              <RefreshCw className="h-3.5 w-3.5" /> Reabrir
            </Button>
          )}
        </div>
      )}

      {/* Description */}
      {wo.description && (
        <Card className="border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{wo.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Info grid */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Informações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Criada em</span>
              <p className="font-medium">{new Date(wo.created_at).toLocaleString('pt-BR')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Última atualização</span>
              <p className="font-medium">{new Date(wo.updated_at).toLocaleString('pt-BR')}</p>
            </div>
            {category && (
              <div>
                <span className="text-muted-foreground">Categoria</span>
                <p className="font-medium">{category.name}</p>
              </div>
            )}
            {unit && (
              <div>
                <span className="text-muted-foreground">Unidade</span>
                <p className="font-medium">{unit.name}</p>
              </div>
            )}
            {location && (
              <div>
                <span className="text-muted-foreground">Sala / Espaço</span>
                <p className="font-medium">{location.name}</p>
              </div>
            )}
            {asset && (
              <div>
                <span className="text-muted-foreground">Equipamento</span>
                <p className="font-medium">{(asset as any).name}{(asset as any).patrimony_code ? ` (${(asset as any).patrimony_code})` : ''}</p>
              </div>
            )}
            {wo.assigned_to_id && (
              <div>
                <span className="text-muted-foreground">Responsável</span>
                <p className="font-medium">{getProfileName(wo.assigned_to_id) || 'Atribuído'}</p>
              </div>
            )}
            {wo.resolved_at && (
              <div>
                <span className="text-muted-foreground">Resolvida em</span>
                <p className="font-medium">{new Date(wo.resolved_at).toLocaleString('pt-BR')}</p>
              </div>
            )}
            {wo.tags && wo.tags.length > 0 && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Tags</span>
                <div className="flex gap-1 flex-wrap mt-1">
                  {wo.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] h-5">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SLA */}
      {(wo.response_due_at || wo.resolve_due_at) && (
        <Card className="border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Prazos (SLA)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {wo.response_due_at && (
                <div>
                  <p className="text-[11px] uppercase font-medium text-muted-foreground mb-1">Resposta até</p>
                  <p className="text-sm font-medium">{new Date(wo.response_due_at).toLocaleString('pt-BR')}</p>
                  {sla.responseRemainingMs !== null && !isClosed && (
                    <p className={`text-xs mt-0.5 ${sla.responseOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                      {sla.responseOverdue ? '⚠ Atrasada' : formatRemainingTime(sla.responseRemainingMs)}
                    </p>
                  )}
                </div>
              )}
              {wo.resolve_due_at && (
                <div>
                  <p className="text-[11px] uppercase font-medium text-muted-foreground mb-1">Solução até</p>
                  <p className="text-sm font-medium">{new Date(wo.resolve_due_at).toLocaleString('pt-BR')}</p>
                  {sla.resolveRemainingMs !== null && !isClosed && (
                    <p className={`text-xs mt-0.5 ${sla.resolveOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                      {sla.resolveOverdue ? '⚠ Atrasada' : formatRemainingTime(sla.resolveRemainingMs)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Costs (if enabled) */}
      {showCosts && (
        <Card className="border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Custos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-xs text-center">
              <div>
                <p className="text-muted-foreground">Mão de obra</p>
                <p className="text-sm font-bold">R$ {Number(wo.labor_cost || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Materiais</p>
                <p className="text-sm font-bold">R$ {Number(wo.parts_cost || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="text-sm font-bold text-primary">R$ {Number(wo.total_cost || 0).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Anexos ({attachments.length})</CardTitle>
          {canInteract && (
            <>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} />
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-3 w-3" /> Anexar
              </Button>
            </>
          )}
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum anexo.</p>
          ) : (
            <div className="space-y-2">
              {attachments.map((att: any) => (
                <div key={att.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{att.file_name}</span>
                  <span className="text-muted-foreground shrink-0">{att.size ? `${(att.size / 1024).toFixed(0)}KB` : ''}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => downloadAttachment(att)}>
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline / Comments */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Atualizações</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Comment input */}
          {canInteract && (
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
            <DialogTitle>Reabrir Solicitação</DialogTitle>
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
