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
import { statusLabels, statusColors, priorityLabels, priorityColors, hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { ArrowLeft, MessageSquare, Clock, CheckSquare, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { motion } from 'framer-motion';
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
      // SLA pause tracking
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
        entity: 'work_order',
        entityId: id,
        action: 'work_order.status_changed',
        tenantId: currentTenantId,
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
      <div className="space-y-4 max-w-4xl mx-auto">
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
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/os')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono text-muted-foreground">{wo.code}</span>
            <Badge variant="outline" className={priorityColors[wo.priority]}>{priorityLabels[wo.priority]}</Badge>
            <Badge variant="outline" className={statusColors[wo.status]}>{statusLabels[wo.status]}</Badge>
            <SlaIndicator workOrder={wo} compact />
          </div>
          <h1 className="text-xl font-bold truncate">{wo.title}</h1>
        </div>
      </div>

      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
          <TabsTrigger value="custos">Custos</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Detalhes</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Criada em</span><span>{new Date(wo.created_at).toLocaleString('pt-BR')}</span></div>
                {wo.started_at && <div className="flex justify-between"><span className="text-muted-foreground">Iniciada em</span><span>{new Date(wo.started_at).toLocaleString('pt-BR')}</span></div>}
                {wo.resolved_at && <div className="flex justify-between"><span className="text-muted-foreground">Resolvida em</span><span>{new Date(wo.resolved_at).toLocaleString('pt-BR')}</span></div>}
                {(wo.response_due_at || wo.resolve_due_at) && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground block mb-2">SLA</span>
                    <SlaIndicator workOrder={wo} />
                  </div>
                )}
                {wo.description && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground block mb-1">Descrição</span>
                    <p className="whitespace-pre-wrap">{wo.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {canUpdate && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Ações</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Alterar Status</label>
                    <div className="flex gap-2">
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Novo status" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" disabled={!newStatus || statusMutation.isPending} onClick={() => statusMutation.mutate(newStatus)}>
                        {statusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {events.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum evento registrado.</p>
                ) : (
                  events.map((ev: any, i: number) => {
                    const Icon = eventIcons[ev.type] || Clock;
                    const payload = ev.payload as any;
                    return (
                      <motion.div key={ev.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex gap-3 items-start">
                        <div className="mt-1 h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium capitalize">{ev.type.replace(/_/g, ' ')}</span>
                            <span className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString('pt-BR')}</span>
                          </div>
                          {payload?.text && <p className="text-sm mt-1 text-muted-foreground">{payload.text}</p>}
                          {payload?.from && payload?.to && (
                            <p className="text-xs text-muted-foreground mt-1">{statusLabels[payload.from] || payload.from} → {statusLabels[payload.to] || payload.to}</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div className="border-t pt-4 mt-4">
                  <div className="flex gap-2">
                    <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Adicionar comentário..." rows={2} className="flex-1" />
                    <Button size="icon" disabled={!comment.trim() || commentMutation.isPending} onClick={() => commentMutation.mutate()}>
                      {commentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anexos">
          <WorkOrderAttachments workOrderId={wo.id} />
        </TabsContent>

        <TabsContent value="custos">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-sm text-muted-foreground">Mão de Obra</p><p className="text-xl font-bold">R$ {Number(wo.labor_cost || 0).toFixed(2)}</p></div>
                <div><p className="text-sm text-muted-foreground">Peças</p><p className="text-xl font-bold">R$ {Number(wo.parts_cost || 0).toFixed(2)}</p></div>
                <div><p className="text-sm text-muted-foreground">Total</p><p className="text-xl font-bold text-primary">R$ {Number(wo.total_cost || 0).toFixed(2)}</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
