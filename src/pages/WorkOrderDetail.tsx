import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { statusLabels, statusColors, priorityLabels, priorityColors, hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { ArrowLeft, MessageSquare, Clock, CheckSquare, Send, Loader2, CalendarDays, Tag, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { SlaIndicator } from '@/components/SlaIndicator';
import { WorkOrderAttachments } from '@/components/WorkOrderAttachments';

const eventIcons: Record<string, any> = {
  created: Clock, status_changed: Clock, comment_internal: MessageSquare,
  comment_public: MessageSquare, assigned: Clock, resolved: CheckSquare,
  closed: CheckSquare, reopened: Clock,
};

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTenantId, currentRole, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [newStatus, setNewStatus] = useState('');

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
        .eq('work_order_id', id!).order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const updates: any = { status };
      if (status === 'em_execucao' && !wo?.started_at) updates.started_at = new Date().toISOString();
      if (status === 'concluida') updates.resolved_at = new Date().toISOString();
      if (status === 'encerrada') updates.closed_at = new Date().toISOString();
      const PAUSE_STATUSES = ['aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro'];
      if (PAUSE_STATUSES.includes(status) && !wo?.paused_at) {
        updates.paused_at = new Date().toISOString();
      }
      if (!PAUSE_STATUSES.includes(status) && wo?.paused_at) {
        const pausedMs = Date.now() - new Date(wo.paused_at).getTime();
        updates.total_paused_ms = (wo.total_paused_ms || 0) + pausedMs;
        updates.paused_at = null;
      }
      const { error } = await supabase.from('work_orders').update(updates).eq('id', id!);
      if (error) throw error;
      await supabase.from('work_order_events').insert({
        tenant_id: currentTenantId!, work_order_id: id!,
        type: 'status_changed' as any, actor_user_id: user?.id,
        payload: { from: wo?.status, to: status },
      });
      await logAudit({
        entity: 'work_order', entityId: id,
        action: 'work_order.status_changed', tenantId: currentTenantId,
        diff: { from: wo?.status, to: status },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work_order', id] });
      qc.invalidateQueries({ queryKey: ['work_order_events', id] });
      toast({ title: 'Status atualizado!' });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('work_order_events').insert({
        tenant_id: currentTenantId!, work_order_id: id!,
        type: 'comment_internal' as any, actor_user_id: user?.id,
        payload: { text: comment },
      });
    },
    onSuccess: () => {
      setComment('');
      qc.invalidateQueries({ queryKey: ['work_order_events', id] });
      toast({ title: 'Comentário adicionado!' });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!wo) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Ordem de serviço não encontrada.</p>
        <Button variant="link" onClick={() => navigate('/os')}>Voltar</Button>
      </div>
    );
  }

  const canUpdate = currentRole && hasPermission(currentRole, 'os:update');

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5" onClick={() => navigate('/os')}>
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

      {/* Content */}
      <Tabs defaultValue="resumo">
        <TabsList className="bg-card border border-border h-9">
          <TabsTrigger value="resumo" className="text-xs h-7">Resumo</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs h-7">Timeline</TabsTrigger>
          <TabsTrigger value="anexos" className="text-xs h-7">Anexos</TabsTrigger>
          <TabsTrigger value="custos" className="text-xs h-7">Custos</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Details - 2 cols */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-border shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Detalhes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <DetailRow icon={CalendarDays} label="Criada em" value={new Date(wo.created_at).toLocaleString('pt-BR')} />
                  {wo.started_at && <DetailRow icon={Clock} label="Iniciada em" value={new Date(wo.started_at).toLocaleString('pt-BR')} />}
                  {wo.resolved_at && <DetailRow icon={CheckSquare} label="Resolvida em" value={new Date(wo.resolved_at).toLocaleString('pt-BR')} />}

                  {(wo.response_due_at || wo.resolve_due_at) && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">SLA</span>
                        <div className="mt-2"><SlaIndicator workOrder={wo} /></div>
                      </div>
                    </>
                  )}

                  {wo.description && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</span>
                        <p className="mt-1.5 whitespace-pre-wrap text-foreground leading-relaxed">{wo.description}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Actions sidebar */}
            <div className="space-y-4">
              {canUpdate && (
                <Card className="border-border shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Ações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Alterar Status</label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Novo status" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="w-full h-8 text-xs mt-1" disabled={!newStatus || statusMutation.isPending} onClick={() => statusMutation.mutate(newStatus)}>
                        {statusMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Aplicar'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Informações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID</span>
                    <span className="font-mono text-[11px]">{wo.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Visibilidade</span>
                    <span>{wo.visibility === 'internal' ? 'Interna' : 'Cliente'}</span>
                  </div>
                  {wo.tags && wo.tags.length > 0 && (
                    <div className="flex items-start gap-1.5 pt-1">
                      <Tag className="h-3 w-3 mt-0.5 text-muted-foreground" />
                      <div className="flex gap-1 flex-wrap">
                        {wo.tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] h-5">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-3">
          <Card className="border-border shadow-none">
            <CardContent className="pt-5">
              <div className="space-y-3">
                {events.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Nenhum evento registrado.</p>
                ) : (
                  events.map((ev: any) => {
                    const Icon = eventIcons[ev.type] || Clock;
                    const payload = ev.payload as any;
                    return (
                      <div key={ev.id} className="flex gap-3 items-start py-2 border-b border-border last:border-0">
                        <div className="mt-0.5 h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium capitalize">{ev.type.replace(/_/g, ' ')}</span>
                            <span className="text-[11px] text-muted-foreground">{new Date(ev.created_at).toLocaleString('pt-BR')}</span>
                          </div>
                          {payload?.text && <p className="text-xs mt-0.5 text-muted-foreground">{payload.text}</p>}
                          {payload?.from && payload?.to && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {statusLabels[payload.from] || payload.from} → {statusLabels[payload.to] || payload.to}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div className="pt-3 mt-2">
                  <div className="flex gap-2">
                    <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Adicionar comentário..." rows={2} className="flex-1 text-sm" />
                    <Button size="icon" className="h-[68px] w-9" disabled={!comment.trim() || commentMutation.isPending} onClick={() => commentMutation.mutate()}>
                      {commentMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anexos" className="mt-3">
          <WorkOrderAttachments workOrderId={wo.id} />
        </TabsContent>

        <TabsContent value="custos" className="mt-3">
          <Card className="border-border shadow-none">
            <CardContent className="pt-5">
              <div className="grid grid-cols-3 gap-4 text-center">
                <CostBlock label="Mão de Obra" value={wo.labor_cost} />
                <CostBlock label="Peças" value={wo.parts_cost} />
                <CostBlock label="Total" value={wo.total_cost} highlight />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

function CostBlock({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-semibold ${highlight ? 'text-primary' : ''}`}>
        R$ {Number(value || 0).toFixed(2)}
      </p>
    </div>
  );
}
