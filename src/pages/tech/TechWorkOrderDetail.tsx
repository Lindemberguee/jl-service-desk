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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/permissions';
import { calculateSlaStatus, formatRemainingTime } from '@/lib/sla';
import { SlaIndicator } from '@/components/SlaIndicator';
import { WorkOrderAttachments } from '@/components/WorkOrderAttachments';
import { WorkOrderCosts } from '@/components/WorkOrderCosts';
// Lookup data fetched based on WO's tenant_id
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Play, Pause, CheckSquare, RotateCcw, Send, Lock, Unlock,
  Clock, MessageSquare, AlertTriangle, UserCheck, MapPin, Building, Package,
  FolderOpen, Phone, Mail, Timer, Eye, EyeOff, Tag, Star
} from 'lucide-react';

const eventLabels: Record<string, string> = {
  created: 'OS Criada', status_changed: 'Status Alterado', comment_internal: 'Comentário Interno',
  comment_public: 'Comentário Público', assigned: 'Atribuição', resolved: 'Resolvida',
  closed: 'Encerrada', reopened: 'Reaberta', attachment_added: 'Anexo Adicionado',
  time_started: 'Tempo Iniciado', time_paused: 'Tempo Pausado', time_resumed: 'Tempo Retomado',
  checklist_updated: 'Checklist Atualizado',
};

export default function TechWorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTenantId, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [comment, setComment] = useState('');
  const [isPublicComment, setIsPublicComment] = useState(false);

  // Timer state
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Data
  const { data: wo, isLoading } = useQuery({
    queryKey: ['work_order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select('*, requester:customers!work_orders_requester_id_fkey(name, phone, email)')
        .eq('id', id!)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch requester profile name when requester_user_id is set
  const { data: requesterProfile } = useQuery({
    queryKey: ['requester_profile', wo?.requester_user_id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('name, email').eq('id', wo!.requester_user_id!).single();
      return data;
    },
    enabled: !!wo?.requester_user_id,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['work_order_events', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('work_order_events').select('*').eq('work_order_id', id!).order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles_list'],
    queryFn: async () => { const { data } = await supabase.from('profiles').select('id, name, email'); return data || []; },
  });

  const { data: checklist = [], refetch: refetchChecklist } = useQuery({
    queryKey: ['wo_checklist', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('work_order_checklist_items').select('*').eq('work_order_id', id!).order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const woTenantId = wo?.tenant_id;

  const { data: tenantSettings } = useQuery({
    queryKey: ['tenant_settings', woTenantId],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('show_ratings_to_techs').eq('id', woTenantId!).single();
      return data;
    },
    enabled: !!woTenantId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', woTenantId],
    queryFn: async () => { const { data } = await supabase.from('categories').select('*').eq('tenant_id', woTenantId!); return data || []; },
    enabled: !!woTenantId,
  });
  const { data: units = [] } = useQuery({
    queryKey: ['units', woTenantId],
    queryFn: async () => { const { data } = await supabase.from('units').select('*').eq('tenant_id', woTenantId!); return data || []; },
    enabled: !!woTenantId,
  });
  const { data: locations = [] } = useQuery({
    queryKey: ['locations', woTenantId],
    queryFn: async () => { const { data } = await supabase.from('locations').select('*').eq('tenant_id', woTenantId!); return data || []; },
    enabled: !!woTenantId,
  });
  const { data: assets = [] } = useQuery({
    queryKey: ['assets', woTenantId],
    queryFn: async () => { const { data } = await supabase.from('assets').select('*').eq('tenant_id', woTenantId!); return data || []; },
    enabled: !!woTenantId,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', woTenantId],
    queryFn: async () => { const { data } = await supabase.from('customers').select('*').eq('tenant_id', woTenantId!); return data || []; },
    enabled: !!woTenantId,
  });

  // Timer logic
  useEffect(() => {
    if (wo?.status === 'em_execucao' && wo?.started_at) {
      const startMs = new Date(wo.started_at).getTime();
      const pausedMs = wo.total_paused_ms || 0;

      const tick = () => {
        const now = Date.now();
        setElapsedSec(Math.floor((now - startMs - pausedMs) / 1000));
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    } else if (wo?.started_at) {
      // Paused or resolved — show frozen time
      const startMs = new Date(wo.started_at).getTime();
      const endMs = wo.resolved_at ? new Date(wo.resolved_at).getTime() : (wo.paused_at ? new Date(wo.paused_at).getTime() : Date.now());
      const pausedMs = wo.total_paused_ms || 0;
      setElapsedSec(Math.floor((endMs - startMs - pausedMs) / 1000));
    }
  }, [wo?.status, wo?.started_at, wo?.total_paused_ms, wo?.paused_at, wo?.resolved_at]);

  const formatTimer = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Mutations
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['work_order', id] });
    qc.invalidateQueries({ queryKey: ['work_order_events', id] });
    qc.invalidateQueries({ queryKey: ['work_orders'] });
  };

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const updates: any = { status };
      if (status === 'em_execucao' && !wo?.started_at) updates.started_at = new Date().toISOString();
      if (status === 'concluida') updates.resolved_at = new Date().toISOString();
      if (status === 'encerrada') updates.closed_at = new Date().toISOString();
      const PAUSE = ['aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro'];
      if (PAUSE.includes(status) && !wo?.paused_at) updates.paused_at = new Date().toISOString();
      if (!PAUSE.includes(status) && wo?.paused_at) {
        updates.total_paused_ms = (wo.total_paused_ms || 0) + (Date.now() - new Date(wo.paused_at).getTime());
        updates.paused_at = null;
      }
      const { error } = await supabase.from('work_orders').update(updates as any).eq('id', id!);
      if (error) throw error;
      await supabase.from('work_order_events').insert({
        tenant_id: currentTenantId!, work_order_id: id!,
        type: 'status_changed' as any, actor_user_id: user?.id,
        payload: { from: wo?.status, to: status },
      });
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Status atualizado!' }); },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('work_order_events').insert({
        tenant_id: currentTenantId!, work_order_id: id!,
        type: (isPublicComment ? 'comment_public' : 'comment_internal') as any,
        actor_user_id: user?.id, payload: { text: comment },
      });
    },
    onSuccess: () => {
      setComment('');
      qc.invalidateQueries({ queryKey: ['work_order_events', id] });
      toast({ title: 'Comentário adicionado!' });
    },
  });

  const checkMutation = useMutation({
    mutationFn: async ({ itemId, checked }: { itemId: string; checked: boolean }) => {
      const { error } = await supabase.from('work_order_checklist_items').update({
        is_checked: checked,
        checked_at: checked ? new Date().toISOString() : null,
        checked_by: checked ? user?.id : null,
      }).eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => refetchChecklist(),
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  if (!wo) return <div className="text-center py-16 text-muted-foreground"><p>OS não encontrada.</p><Button variant="link" onClick={() => navigate('/tech/os')}>Voltar</Button></div>;

  const isPaused = ['aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro'].includes(wo.status);
  const isRunning = wo.status === 'em_execucao';
  const isClosed = ['concluida', 'aprovada', 'encerrada'].includes(wo.status);
  const sla = calculateSlaStatus(wo);

  const getName = (uid: string | null) => profiles.find((p: any) => p.id === uid)?.name || '—';
  const getCat = (cid: string | null) => categories.find((c: any) => c.id === cid)?.name;
  const getUnit = (uid: string | null) => units.find((u: any) => u.id === uid)?.name;
  const getLoc = (lid: string | null) => locations.find((l: any) => l.id === lid)?.name;
  const getAssetDisplay = (aid: string | null) => {
    const a = assets.find((a: any) => a.id === aid);
    if (!a) return undefined;
    return `${a.name}${a.patrimony_code ? ` — Pat. ${a.patrimony_code}` : ''}`;
  };
  const getCust = (cid: string | null) => customers.find((c: any) => c.id === cid)?.name;

  const requesterJoinedRaw = (wo as any).requester;
  const requesterJoined = Array.isArray(requesterJoinedRaw) ? requesterJoinedRaw[0] : requesterJoinedRaw;
  const requesterName =
    requesterJoined?.name ||
    getCust(wo.requester_id) ||
    requesterProfile?.name ||
    profiles.find((p: any) => p.id === wo.requester_user_id)?.name ||
    (wo.requester_contact as any)?.name ||
    (wo.requester_contact as any)?.email ||
    'Não informado';
  const requesterPhone = requesterJoined?.phone || (wo.requester_contact as any)?.phone;
  const requesterEmail = requesterJoined?.email || (wo.requester_contact as any)?.email;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5" onClick={() => navigate('/tech/os')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-mono text-muted-foreground">{wo.code}</span>
            <Badge variant="outline" className={`text-[11px] ${priorityColors[wo.priority]}`}>{priorityLabels[wo.priority]}</Badge>
            <Badge variant="outline" className={`text-[11px] ${statusColors[wo.status]}`}>{statusLabels[wo.status]}</Badge>
            <SlaIndicator workOrder={wo} compact />
            {wo.visibility === 'customer' && (
              <Badge variant="outline" className="text-[11px] bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1">
                <Eye className="h-3 w-3" /> Cliente
              </Badge>
            )}
          </div>
          <h1 className="text-lg font-semibold">{wo.title}</h1>
        </div>
      </div>

      {/* Timer Card - prominent for technician */}
      {wo.started_at && (
        <Card className={`border-border shadow-none ${isRunning ? 'border-l-2 border-l-primary' : ''}`}>
          <CardContent className="p-3 flex items-center gap-4">
            <Timer className={`h-5 w-5 ${isRunning ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-medium">Tempo Trabalhado</p>
              <p className={`text-2xl font-mono font-bold ${isRunning ? 'text-primary' : 'text-foreground'}`}>{formatTimer(elapsedSec)}</p>
            </div>
            <div className="flex-1" />
            {isRunning && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 animate-pulse">● Em execução</Badge>}
            {isPaused && <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-500 border-yellow-500/20">⏸ Pausado</Badge>}
          </CardContent>
        </Card>
      )}

      {/* Workflow Buttons - BIG for mobile */}
      {!isClosed && (
        <div className="flex gap-2 flex-wrap">
          {['aberta', 'reaberta'].includes(wo.status) && (
            <Button className="h-11 gap-2 text-sm flex-1 sm:flex-none" onClick={() => statusMutation.mutate('em_execucao')} disabled={statusMutation.isPending}>
              <Play className="h-4 w-4" /> Iniciar Atendimento
            </Button>
          )}
          {isRunning && (
            <>
              <Button variant="outline" className="h-11 gap-2 text-sm flex-1 sm:flex-none" onClick={() => statusMutation.mutate('aguardando_peca')} disabled={statusMutation.isPending}>
                <Pause className="h-4 w-4" /> Pausar (Peça)
              </Button>
              <Button variant="outline" className="h-11 gap-2 text-sm flex-1 sm:flex-none" onClick={() => statusMutation.mutate('aguardando_solicitante')} disabled={statusMutation.isPending}>
                <Pause className="h-4 w-4" /> Pausar (Solicitante)
              </Button>
              <Button className="h-11 gap-2 text-sm bg-green-600 hover:bg-green-700 flex-1 sm:flex-none" onClick={() => statusMutation.mutate('concluida')} disabled={statusMutation.isPending}>
                <CheckSquare className="h-4 w-4" /> Resolver
              </Button>
            </>
          )}
          {isPaused && (
            <Button className="h-11 gap-2 text-sm flex-1 sm:flex-none" onClick={() => statusMutation.mutate('em_execucao')} disabled={statusMutation.isPending}>
              <Play className="h-4 w-4" /> Retomar
            </Button>
          )}
        </div>
      )}
      {isClosed && wo.status !== 'reaberta' && (
        <Button variant="outline" className="h-11 gap-2 text-sm" onClick={() => statusMutation.mutate('reaberta')} disabled={statusMutation.isPending}>
          <RotateCcw className="h-4 w-4" /> Reabrir OS
        </Button>
      )}

      {/* Tabs */}
      <Tabs defaultValue="resumo">
        <TabsList className="bg-card border border-border h-9 flex-wrap">
          <TabsTrigger value="resumo" className="text-xs h-7">Resumo</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs h-7">Timeline ({events.length})</TabsTrigger>
          {checklist.length > 0 && <TabsTrigger value="checklist" className="text-xs h-7">Checklist ({checklist.length})</TabsTrigger>}
          <TabsTrigger value="anexos" className="text-xs h-7">Anexos</TabsTrigger>
          <TabsTrigger value="custos" className="text-xs h-7">Custos</TabsTrigger>
        </TabsList>

        {/* === RESUMO === */}
        <TabsContent value="resumo" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-border shadow-none">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Descrição</CardTitle></CardHeader>
                <CardContent>
                  {wo.description ? <p className="text-sm whitespace-pre-wrap leading-relaxed">{wo.description}</p> : <p className="text-sm text-muted-foreground italic">Sem descrição.</p>}
                </CardContent>
              </Card>
              <Card className="border-border shadow-none">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Contexto</CardTitle></CardHeader>
                <CardContent>
                   <div className="grid grid-cols-2 gap-3 text-sm">
                    <Field icon={FolderOpen} label="Categoria" value={getCat(wo.category_id)} />
                    <Field icon={Building} label="Unidade (Prédio / Campus)" value={getUnit(wo.unit_id)} />
                    <Field icon={MapPin} label="Sala / Espaço" value={getLoc(wo.location_id)} />
                    <Field icon={Package} label="Equipamento / Ativo" value={getAssetDisplay(wo.asset_id)} />
                  </div>
                </CardContent>
              </Card>
              {/* SLA */}
              {(wo.response_due_at || wo.resolve_due_at) && (
                <Card className="border-border shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> SLA
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

            {/* Sidebar */}
            <div className="space-y-4">
              <Card className="border-border shadow-none">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Solicitante</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1.5">
                  <p className="font-medium">{requesterName}</p>
                  {requesterPhone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />{requesterPhone}
                    </p>
                  )}
                  {requesterEmail && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />{requesterEmail}
                    </p>
                  )}
                  {(wo.requester_contact as any)?.preferred_time && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Horário: {(wo.requester_contact as any).preferred_time}</p>}
                </CardContent>
              </Card>
              <Card className="border-border shadow-none">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Responsável</CardTitle></CardHeader>
                <CardContent className="text-sm">
                  <p className="font-medium flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    {wo.assigned_to_id ? getName(wo.assigned_to_id) : 'Não atribuído'}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border shadow-none">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Informações</CardTitle></CardHeader>
                <CardContent className="text-xs space-y-1.5 text-muted-foreground">
                  <p>Visibilidade: <span className="text-foreground font-medium">{wo.visibility === 'internal' ? 'Interna' : 'Cliente'}</span></p>
                  <p>Criada: {new Date(wo.created_at).toLocaleString('pt-BR')}</p>
                  {wo.started_at && <p>Iniciada: {new Date(wo.started_at).toLocaleString('pt-BR')}</p>}
                  {wo.resolved_at && <p>Resolvida: {new Date(wo.resolved_at).toLocaleString('pt-BR')}</p>}
                  {wo.closed_at && <p>Encerrada: {new Date(wo.closed_at).toLocaleString('pt-BR')}</p>}
                  <p>Atualizada: {new Date(wo.updated_at).toLocaleString('pt-BR')}</p>
                  {wo.tags && wo.tags.length > 0 && (
                    <div className="flex items-start gap-1.5 pt-1">
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

        {/* === TIMELINE === */}
        <TabsContent value="timeline" className="mt-3 space-y-4">
          {/* Comment form */}
          <Card className="border-border shadow-none">
            <CardContent className="p-3 space-y-3">
              <Textarea placeholder="Escreva um comentário..." value={comment} onChange={e => setComment(e.target.value)} className="min-h-[80px] text-sm" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch id="public-switch" checked={isPublicComment} onCheckedChange={setIsPublicComment} />
                  <Label htmlFor="public-switch" className="text-xs flex items-center gap-1 cursor-pointer">
                    {isPublicComment ? <><Eye className="h-3 w-3" /> Público (solicitante vê)</> : <><EyeOff className="h-3 w-3" /> Interno</>}
                  </Label>
                </div>
                <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => commentMutation.mutate()} disabled={!comment.trim() || commentMutation.isPending}>
                  <Send className="h-3.5 w-3.5" /> Enviar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Events */}
          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento registrado.</p>
            ) : (
              [...events].reverse().map((ev: any) => {
                const isComment = ev.type === 'comment_internal' || ev.type === 'comment_public';
                const isInternal = ev.type === 'comment_internal';
                const hasRating = !!(ev.payload as any)?.rating;

                // Hide ratings from tech panel unless tenant setting allows it
                if (hasRating && !tenantSettings?.show_ratings_to_techs) return null;

                return (
                  <div key={ev.id} className={`border rounded-md p-3 text-sm ${isInternal ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {isInternal ? <Lock className="h-3 w-3 text-yellow-500" /> : ev.type === 'comment_public' ? <MessageSquare className="h-3 w-3 text-primary" /> : <Clock className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-xs font-medium">{eventLabels[ev.type] || ev.type}</span>
                      <span className="text-[11px] text-muted-foreground ml-auto">{getName(ev.actor_user_id)} • {new Date(ev.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    {isComment && (ev.payload as any)?.text && (
                      <p className="text-sm whitespace-pre-wrap mt-1">{(ev.payload as any).text}</p>
                    )}
                    {ev.type === 'status_changed' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {statusLabels[(ev.payload as any)?.from] || (ev.payload as any)?.from} → {statusLabels[(ev.payload as any)?.to] || (ev.payload as any)?.to}
                      </p>
                    )}
                    {hasRating && tenantSettings?.show_ratings_to_techs && (
                      <div className="flex items-center gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s <= (ev.payload as any).rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                        ))}
                        {(ev.payload as any)?.comment && <span className="text-xs text-muted-foreground ml-2">"{(ev.payload as any).comment}"</span>}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* === CHECKLIST === */}
        {checklist.length > 0 && (
          <TabsContent value="checklist" className="mt-3">
            <Card className="border-border shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Checklist ({checklist.filter((i: any) => i.is_checked).length}/{checklist.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {checklist.map((item: any) => (
                  <div key={item.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50">
                    <Checkbox
                      checked={item.is_checked}
                      onCheckedChange={(checked) => checkMutation.mutate({ itemId: item.id, checked: !!checked })}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${item.is_checked ? 'line-through text-muted-foreground' : ''}`}>{item.label}</p>
                      {item.observation && <p className="text-xs text-muted-foreground mt-0.5">{item.observation}</p>}
                      {item.checked_at && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          ✓ {getName(item.checked_by)} em {new Date(item.checked_at).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* === ANEXOS === */}
        <TabsContent value="anexos" className="mt-3">
          <WorkOrderAttachments workOrderId={id!} resolvedAt={wo.resolved_at} />
        </TabsContent>

        {/* === CUSTOS === */}
        <TabsContent value="custos" className="mt-3">
          <WorkOrderCosts workOrder={wo} canManage={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
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
