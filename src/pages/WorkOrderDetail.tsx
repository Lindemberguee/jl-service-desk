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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { statusLabels, statusColors, priorityLabels, priorityColors, hasPermission, roleLabels } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { ArrowLeft, MessageSquare, Clock, CheckSquare, Send, Loader2, CalendarDays, Tag, MapPin, Play, Pause, RotateCcw, Lock, Unlock, UserCheck, Building, Package, FolderOpen, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { SlaIndicator } from '@/components/SlaIndicator';
import { WorkOrderAttachments } from '@/components/WorkOrderAttachments';
import { WorkOrderCosts } from '@/components/WorkOrderCosts';
import { calculateSlaStatus, formatRemainingTime } from '@/lib/sla';
import { useTenantQuery } from '@/hooks/useTenantQuery';

const eventIcons: Record<string, any> = {
  created: Clock, status_changed: Clock, comment_internal: Lock,
  comment_public: MessageSquare, assigned: UserCheck, resolved: CheckSquare,
  closed: CheckSquare, reopened: RotateCcw, attachment_added: Package,
  time_started: Play, time_paused: Pause, time_resumed: Play,
  checklist_updated: CheckSquare,
};

const eventLabels: Record<string, string> = {
  created: 'OS Criada', status_changed: 'Status Alterado', comment_internal: 'Comentário Interno',
  comment_public: 'Comentário Público', assigned: 'Atribuição', resolved: 'Resolvida',
  closed: 'Encerrada', reopened: 'Reaberta', attachment_added: 'Anexo Adicionado',
  time_started: 'Tempo Iniciado', time_paused: 'Tempo Pausado', time_resumed: 'Tempo Retomado',
  checklist_updated: 'Checklist Atualizado',
};

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTenantId, currentRole, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [isPublicComment, setIsPublicComment] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [assignTo, setAssignTo] = useState('');

  // Data queries
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

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles_list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, name, email');
      return data || [];
    },
  });

  const { data: categories = [] } = useTenantQuery<any>('categories', 'categories');
  const { data: units = [] } = useTenantQuery<any>('units', 'units');
  const { data: locations = [] } = useTenantQuery<any>('locations', 'locations');
  const { data: assets = [] } = useTenantQuery<any>('assets', 'assets');
  const { data: customers = [] } = useTenantQuery<any>('customers', 'customers');

  // Mutations
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['work_order', id] });
    qc.invalidateQueries({ queryKey: ['work_order_events', id] });
    qc.invalidateQueries({ queryKey: ['work_orders'] });
  };

  const updateWO = async (updates: Record<string, any>, eventType?: string, eventPayload?: any) => {
    const { error } = await supabase.from('work_orders').update(updates as any).eq('id', id!);
    if (error) throw error;
    if (eventType) {
      await supabase.from('work_order_events').insert({
        tenant_id: currentTenantId!, work_order_id: id!,
        type: eventType as any, actor_user_id: user?.id,
        payload: eventPayload || {},
      });
    }
  };

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
      await updateWO(updates, 'status_changed', { from: wo?.status, to: status });
      await logAudit({
        entity: 'work_order', entityId: id,
        action: 'work_order.status_changed', tenantId: currentTenantId,
        diff: { from: wo?.status, to: status },
      });
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Status atualizado!' }); },
  });

  const assignMutation = useMutation({
    mutationFn: async (assignedToId: string | null) => {
      await updateWO({ assigned_to_id: assignedToId }, 'assigned', {
        assigned_to: assignedToId,
        assigned_by: user?.id,
      });
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Responsável atualizado!' }); setAssignTo(''); },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('work_order_events').insert({
        tenant_id: currentTenantId!, work_order_id: id!,
        type: (isPublicComment ? 'comment_public' : 'comment_internal') as any,
        actor_user_id: user?.id,
        payload: { text: comment },
      });
    },
    onSuccess: () => {
      setComment('');
      qc.invalidateQueries({ queryKey: ['work_order_events', id] });
      toast({ title: 'Comentário adicionado!' });
    },
  });

  // Quick workflow buttons
  const isPaused = ['aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro'].includes(wo?.status || '');
  const isActive = wo?.status === 'em_execucao';
  const isClosed = ['concluida', 'aprovada', 'encerrada'].includes(wo?.status || '');

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
  const canAssign = currentRole && hasPermission(currentRole, 'os:assign');
  const canClose = currentRole && hasPermission(currentRole, 'os:close');
  const sla = calculateSlaStatus(wo);

  const getProfileName = (userId: string | null) => {
    if (!userId) return null;
    return profiles.find((p: any) => p.id === userId)?.name || userId.slice(0, 8);
  };

  const getCategoryName = (catId: string | null) => categories.find((c: any) => c.id === catId)?.name;
  const getUnitName = (unitId: string | null) => units.find((u: any) => u.id === unitId)?.name;
  const getLocationName = (locId: string | null) => locations.find((l: any) => l.id === locId)?.name;
  const getAssetName = (assetId: string | null) => assets.find((a: any) => a.id === assetId)?.name;
  const getCustomerName = (custId: string | null) => customers.find((c: any) => c.id === custId)?.name;

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
            {wo.visibility === 'customer' && (
              <Badge variant="outline" className="text-[11px] bg-info/10 text-info border-info/20 gap-1">
                <Eye className="h-3 w-3" /> Cliente
              </Badge>
            )}
          </div>
          <h1 className="text-lg font-semibold">{wo.title}</h1>
        </div>
      </div>

      {/* Quick workflow buttons */}
      {canUpdate && !isClosed && (
        <div className="flex gap-2 flex-wrap">
          {wo.status === 'aberta' && (
            <Button size="sm" variant="default" className="h-8 gap-1.5 text-xs" onClick={() => statusMutation.mutate('em_execucao')} disabled={statusMutation.isPending}>
              <Play className="h-3.5 w-3.5" /> Iniciar Execução
            </Button>
          )}
          {isActive && (
            <>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => statusMutation.mutate('aguardando_peca')} disabled={statusMutation.isPending}>
                <Pause className="h-3.5 w-3.5" /> Pausar (Peça)
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => statusMutation.mutate('aguardando_solicitante')} disabled={statusMutation.isPending}>
                <Pause className="h-3.5 w-3.5" /> Pausar (Solicitante)
              </Button>
              <Button size="sm" variant="default" className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-700" onClick={() => statusMutation.mutate('concluida')} disabled={statusMutation.isPending}>
                <CheckSquare className="h-3.5 w-3.5" /> Resolver
              </Button>
            </>
          )}
          {isPaused && (
            <Button size="sm" variant="default" className="h-8 gap-1.5 text-xs" onClick={() => statusMutation.mutate('em_execucao')} disabled={statusMutation.isPending}>
              <Play className="h-3.5 w-3.5" /> Retomar
            </Button>
          )}
          {wo.status === 'concluida' && canClose && (
            <Button size="sm" variant="default" className="h-8 gap-1.5 text-xs" onClick={() => statusMutation.mutate('encerrada')} disabled={statusMutation.isPending}>
              <CheckSquare className="h-3.5 w-3.5" /> Encerrar
            </Button>
          )}
          {wo.status === 'reaberta' && (
            <Button size="sm" variant="default" className="h-8 gap-1.5 text-xs" onClick={() => statusMutation.mutate('em_execucao')} disabled={statusMutation.isPending}>
              <Play className="h-3.5 w-3.5" /> Iniciar Execução
            </Button>
          )}
        </div>
      )}
      {isClosed && wo.status !== 'reaberta' && canUpdate && (
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => statusMutation.mutate('reaberta')} disabled={statusMutation.isPending}>
          <RotateCcw className="h-3.5 w-3.5" /> Reabrir OS
        </Button>
      )}

      {/* Content */}
      <Tabs defaultValue="resumo">
        <TabsList className="bg-card border border-border h-9">
          <TabsTrigger value="resumo" className="text-xs h-7">Resumo</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs h-7">Timeline ({events.length})</TabsTrigger>
          <TabsTrigger value="anexos" className="text-xs h-7">Anexos</TabsTrigger>
          <TabsTrigger value="custos" className="text-xs h-7">Custos</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main content - 2 cols */}
            <div className="lg:col-span-2 space-y-4">
              {/* Description */}
              <Card className="border-border shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Descrição</CardTitle>
                </CardHeader>
                <CardContent>
                  {wo.description ? (
                    <p className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">{wo.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Sem descrição.</p>
                  )}
                </CardContent>
              </Card>

              {/* Context: Category, Unit, Location, Asset */}
              <Card className="border-border shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Contexto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <InfoField icon={FolderOpen} label="Categoria" value={getCategoryName(wo.category_id)} />
                    <InfoField icon={Building} label="Unidade" value={getUnitName(wo.unit_id)} />
                    <InfoField icon={MapPin} label="Local" value={getLocationName(wo.location_id)} />
                    <InfoField icon={Package} label="Ativo" value={getAssetName(wo.asset_id)} />
                  </div>
                </CardContent>
              </Card>

              {/* SLA Card */}
              {(wo.response_due_at || wo.resolve_due_at) && (
                <Card className="border-border shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> SLA
                      {isPaused && <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20">Pausado</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {wo.response_due_at && (
                        <div>
                          <p className="text-[11px] uppercase font-medium text-muted-foreground mb-1">Resposta até</p>
                          <p className="text-sm font-medium">{new Date(wo.response_due_at).toLocaleString('pt-BR')}</p>
                          {sla.responseRemainingMs !== null && (
                            <p className={`text-xs mt-0.5 ${sla.responseOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                              {sla.responseOverdue ? '⚠ Atrasada: ' : 'Restante: '}{formatRemainingTime(sla.responseRemainingMs)}
                            </p>
                          )}
                        </div>
                      )}
                      {wo.resolve_due_at && (
                        <div>
                          <p className="text-[11px] uppercase font-medium text-muted-foreground mb-1">Solução até</p>
                          <p className="text-sm font-medium">{new Date(wo.resolve_due_at).toLocaleString('pt-BR')}</p>
                          {sla.resolveRemainingMs !== null && (
                            <p className={`text-xs mt-0.5 ${sla.resolveOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                              {sla.resolveOverdue ? '⚠ Atrasada: ' : 'Restante: '}{formatRemainingTime(sla.resolveRemainingMs)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - 1 col */}
            <div className="space-y-4">
              {/* Requester */}
              <Card className="border-border shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Solicitante</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1.5">
                  {wo.requester_id ? (
                    <>
                      <p className="font-medium">{getCustomerName(wo.requester_id)}</p>
                      {(wo.requester_contact as any)?.phone && <p className="text-xs text-muted-foreground">{(wo.requester_contact as any).phone}</p>}
                      {(wo.requester_contact as any)?.email && <p className="text-xs text-muted-foreground">{(wo.requester_contact as any).email}</p>}
                    </>
                  ) : (wo as any).requester_user_id ? (
                    <>
                      <p className="font-medium">{getProfileName((wo as any).requester_user_id)}</p>
                      {(wo.requester_contact as any)?.phone && <p className="text-xs text-muted-foreground">{(wo.requester_contact as any).phone}</p>}
                      {(wo.requester_contact as any)?.preferred_time && <p className="text-xs text-muted-foreground">Horário: {(wo.requester_contact as any).preferred_time}</p>}
                    </>
                  ) : (
                    <p className="text-muted-foreground text-xs">Não informado</p>
                  )}
                </CardContent>
              </Card>

              {/* Assignment */}
              <Card className="border-border shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Atribuição</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-[11px] uppercase font-medium text-muted-foreground mb-1">Responsável</p>
                    <p className="text-sm font-medium">{getProfileName(wo.assigned_to_id) || '—'}</p>
                  </div>
                  {canAssign && (
                    <div className="flex gap-2">
                      <Select value={assignTo} onValueChange={setAssignTo}>
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Atribuir para..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={user?.id || 'me'}>Para mim</SelectItem>
                          {profiles.filter((p: any) => p.id !== user?.id).map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="h-8 text-xs" disabled={!assignTo || assignMutation.isPending} onClick={() => assignMutation.mutate(assignTo)}>
                        {assignMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status change */}
              {canUpdate && (
                <Card className="border-border shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Alterar Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
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
                    <Button size="sm" className="w-full h-8 text-xs" disabled={!newStatus || statusMutation.isPending} onClick={() => statusMutation.mutate(newStatus)}>
                      {statusMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Aplicar'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Info card */}
              <Card className="border-border shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Informações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <InfoRow label="ID" value={wo.id.slice(0, 8)} mono />
                  <InfoRow label="Visibilidade" value={wo.visibility === 'internal' ? 'Interna' : 'Cliente'} />
                  <InfoRow label="Criada em" value={new Date(wo.created_at).toLocaleString('pt-BR')} />
                  {wo.started_at && <InfoRow label="Iniciada em" value={new Date(wo.started_at).toLocaleString('pt-BR')} />}
                  {wo.resolved_at && <InfoRow label="Resolvida em" value={new Date(wo.resolved_at).toLocaleString('pt-BR')} />}
                  {wo.closed_at && <InfoRow label="Encerrada em" value={new Date(wo.closed_at).toLocaleString('pt-BR')} />}
                  <InfoRow label="Atualizada em" value={new Date(wo.updated_at).toLocaleString('pt-BR')} />
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
              {/* Comment input */}
              <div className="mb-4 pb-4 border-b border-border">
                <div className="flex gap-2 mb-2">
                  <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Escreva um comentário..." rows={2} className="flex-1 text-sm" />
                  <Button size="icon" className="h-[68px] w-9" disabled={!comment.trim() || commentMutation.isPending} onClick={() => commentMutation.mutate()}>
                    {commentMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="public-comment" checked={isPublicComment} onCheckedChange={setIsPublicComment} className="h-4 w-7" />
                  <Label htmlFor="public-comment" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                    {isPublicComment ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {isPublicComment ? 'Visível para o solicitante' : 'Somente equipe interna'}
                  </Label>
                </div>
              </div>

              {/* Events list */}
              <div className="space-y-0">
                {events.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Nenhum evento registrado.</p>
                ) : (
                  events.map((ev: any, idx: number) => {
                    const Icon = eventIcons[ev.type] || Clock;
                    const payload = ev.payload as any;
                    const isInternal = ev.type === 'comment_internal';
                    const isComment = ev.type === 'comment_internal' || ev.type === 'comment_public';
                    const actorName = getProfileName(ev.actor_user_id);

                    return (
                      <div key={ev.id} className="flex gap-3 items-start relative">
                        {/* Vertical line */}
                        {idx < events.length - 1 && (
                          <div className="absolute left-[13px] top-8 bottom-0 w-px bg-border" />
                        )}
                        <div className={`mt-1 h-7 w-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                          isComment ? (isInternal ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30') : 'bg-muted'
                        }`}>
                          <Icon className={`h-3.5 w-3.5 ${
                            isComment ? (isInternal ? 'text-amber-600' : 'text-blue-600') : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0 pb-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {actorName && <span className="text-xs font-semibold">{actorName}</span>}
                            <span className="text-xs text-muted-foreground">
                              {eventLabels[ev.type] || ev.type.replace(/_/g, ' ')}
                            </span>
                            {isInternal && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                                <Lock className="h-2.5 w-2.5 mr-0.5" /> Interno
                              </Badge>
                            )}
                            <span className="text-[11px] text-muted-foreground ml-auto">{new Date(ev.created_at).toLocaleString('pt-BR')}</span>
                          </div>
                          {payload?.text && (
                            <p className={`text-sm mt-1 rounded-md p-2 ${
                              isInternal ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800' : 'bg-muted/50'
                            }`}>{payload.text}</p>
                          )}
                          {payload?.from && payload?.to && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              <Badge variant="outline" className={`text-[10px] mr-1 ${statusColors[payload.from] || ''}`}>{statusLabels[payload.from] || payload.from}</Badge>
                              →
                              <Badge variant="outline" className={`text-[10px] ml-1 ${statusColors[payload.to] || ''}`}>{statusLabels[payload.to] || payload.to}</Badge>
                            </p>
                          )}
                          {payload?.assigned_to && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Atribuído para: <strong>{getProfileName(payload.assigned_to)}</strong>
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
        </TabsContent>

        <TabsContent value="anexos" className="mt-3">
          <WorkOrderAttachments workOrderId={wo.id} resolvedAt={wo.resolved_at} />
        </TabsContent>

        <TabsContent value="custos" className="mt-3">
          <WorkOrderCosts workOrder={wo} canManage={!!canUpdate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoField({ icon: Icon, label, value }: { icon: any; label: string; value: string | undefined | null }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-[11px] uppercase font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{value || '—'}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono text-[11px]' : ''}>{value}</span>
    </div>
  );
}