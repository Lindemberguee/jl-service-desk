import { useState, useMemo } from 'react';
import { useDisposals, type Disposal } from '@/hooks/useDisposals';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  Trash2, Plus, Search, Filter, CheckCircle2, XCircle, Clock,
  Package, Wrench, FileText, Upload, Eye, AlertTriangle, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const reasonLabels: Record<string, string> = {
  queimado: 'Queimado',
  obsoleto: 'Obsoleto',
  vencido: 'Vencido',
  defeituoso: 'Defeituoso',
  depreciado: 'Depreciado',
  extravio: 'Extravio',
  outro: 'Outro',
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pendente: { label: 'Pendente', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Clock },
  aprovado: { label: 'Aprovado', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: CheckCircle2 },
  rejeitado: { label: 'Rejeitado', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
  efetivado: { label: 'Efetivado', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2 },
};

const originLabels: Record<string, { label: string; icon: React.ElementType }> = {
  estoque: { label: 'Estoque', icon: Package },
  ativo: { label: 'Ativo', icon: Wrench },
  manual: { label: 'Manual', icon: FileText },
};

export default function DisposalPage() {
  const { currentRole, rolePermissions } = useAuth();
  const { disposals, isLoading, createDisposal, approveDisposal, rejectDisposal, deleteDisposal } = useDisposals();
  const canManage = currentRole ? hasPermission(currentRole, 'disposal:manage', undefined, rolePermissions) : false;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Disposal | null>(null);
  const [showReject, setShowReject] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  // Form state
  const [form, setForm] = useState({
    origin_type: 'manual' as 'estoque' | 'ativo' | 'manual',
    item_name: '',
    item_description: '',
    quantity: 1,
    unit: 'un',
    reason: 'outro',
    reason_detail: '',
    category: 'Geral',
    residual_value: 0,
  });
  const [uploading, setUploading] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);

  const filtered = useMemo(() => {
    let list = disposals;
    if (statusFilter !== 'todos') list = list.filter(d => d.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(d => d.item_name.toLowerCase().includes(q) || d.reason_detail?.toLowerCase().includes(q));
    }
    return list;
  }, [disposals, search, statusFilter]);

  const stats = useMemo(() => ({
    total: disposals.length,
    pendentes: disposals.filter(d => d.status === 'pendente').length,
    efetivados: disposals.filter(d => d.status === 'efetivado').length,
    valorTotal: disposals.filter(d => d.status === 'efetivado').reduce((s, d) => s + (d.residual_value || 0), 0),
  }), [disposals]);

  const handleCreate = async () => {
    if (!form.item_name.trim()) { toast.error('Nome do item é obrigatório'); return; }
    await createDisposal.mutateAsync({
      ...form,
      attachments: attachmentUrls.map(url => ({ url })),
    });
    setShowCreate(false);
    setForm({ origin_type: 'manual', item_name: '', item_description: '', quantity: 1, unit: 'un', reason: 'outro', reason_detail: '', category: 'Geral', residual_value: 0 });
    setAttachmentUrls([]);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = `${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('disposal-attachments').upload(path, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('disposal-attachments').getPublicUrl(path);
        setAttachmentUrls(prev => [...prev, urlData.publicUrl]);
      }
      toast.success('Arquivo(s) enviado(s)');
    } catch (err: any) {
      toast.error(err.message || 'Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async (d: Disposal) => {
    const createMovement = d.origin_type === 'estoque' && !!d.stock_item_id;
    await approveDisposal.mutateAsync({ id: d.id, createStockMovement: createMovement });
    setShowDetail(null);
  };

  const handleReject = async () => {
    if (!showReject) return;
    await rejectDisposal.mutateAsync({ id: showReject, note: rejectNote });
    setShowReject(null);
    setRejectNote('');
    setShowDetail(null);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Descarte</h1>
          <p className="text-sm text-muted-foreground">Gestão de itens depreciados, queimados e inserníveis</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Descarte
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Trash2, color: 'text-foreground' },
          { label: 'Pendentes', value: stats.pendentes, icon: Clock, color: 'text-amber-500' },
          { label: 'Efetivados', value: stats.efetivados, icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Valor Residual', value: `R$ ${stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: AlertTriangle, color: 'text-orange-500' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center bg-muted", s.color)}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por item..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="aprovado">Aprovados</SelectItem>
            <SelectItem value="efetivado">Efetivados</SelectItem>
            <SelectItem value="rejeitado">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead>Valor Residual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Nenhum descarte encontrado</TableCell></TableRow>
                ) : filtered.map(d => {
                  const sc = statusConfig[d.status];
                  const origin = originLabels[d.origin_type];
                  const OriginIcon = origin.icon;
                  const StatusIcon = sc.icon;
                  return (
                    <TableRow key={d.id} className="cursor-pointer hover:bg-accent/30" onClick={() => setShowDetail(d)}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm truncate max-w-[200px]">{d.item_name}</span>
                          {d.item_description && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{d.item_description}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1 text-xs">
                          <OriginIcon className="h-3 w-3" /> {origin.label}
                        </Badge>
                      </TableCell>
                      <TableCell><span className="text-sm">{reasonLabels[d.reason] || d.reason}</span></TableCell>
                      <TableCell className="text-center">{d.quantity} {d.unit}</TableCell>
                      <TableCell>R$ {(d.residual_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("gap-1 text-xs", sc.color)}>
                          <StatusIcon className="h-3 w-3" /> {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(d.created_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); setShowDetail(d); }}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Detalhes</TooltipContent>
                            </Tooltip>
                            {canManage && d.status === 'pendente' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={e => { e.stopPropagation(); deleteDisposal.mutate(d.id); }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5" /> Registrar Descarte</DialogTitle>
            <DialogDescription>Preencha os dados do item a ser descartado</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origem</Label>
                <Select value={form.origin_type} onValueChange={v => setForm(f => ({ ...f, origin_type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estoque">Estoque</SelectItem>
                    <SelectItem value="ativo">Ativo/Patrimônio</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select value={form.reason} onValueChange={v => setForm(f => ({ ...f, reason: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(reasonLabels).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome do Item *</Label>
              <Input value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} placeholder="Ex: Monitor LG 22''" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.item_description} onChange={e => setForm(f => ({ ...f, item_description: e.target.value }))} placeholder="Detalhes adicionais..." rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Valor Residual (R$)</Label>
                <Input type="number" min={0} step={0.01} value={form.residual_value} onChange={e => setForm(f => ({ ...f, residual_value: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ex: Eletrônicos, Móveis..." />
            </div>
            <div className="space-y-2">
              <Label>Detalhes / Justificativa</Label>
              <Textarea value={form.reason_detail} onChange={e => setForm(f => ({ ...f, reason_detail: e.target.value }))} placeholder="Descreva o motivo do descarte..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Fotos / Laudos</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4" /> Enviar Arquivo
                    <input type="file" className="hidden" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleUpload} />
                  </label>
                </Button>
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                {attachmentUrls.length > 0 && <span className="text-xs text-muted-foreground">{attachmentUrls.length} arquivo(s)</span>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createDisposal.isPending} className="gap-2">
              {createDisposal.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg">
          {showDetail && (() => {
            const d = showDetail;
            const sc = statusConfig[d.status];
            const StatusIcon = sc.icon;
            const origin = originLabels[d.origin_type];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5" /> {d.item_name}
                  </DialogTitle>
                  <DialogDescription>Detalhes do descarte</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={cn("gap-1", sc.color)}>
                      <StatusIcon className="h-3 w-3" /> {sc.label}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <origin.icon className="h-3 w-3" /> {origin.label}
                    </Badge>
                    <Badge variant="outline">{reasonLabels[d.reason]}</Badge>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Quantidade:</span> <strong>{d.quantity} {d.unit}</strong></div>
                    <div><span className="text-muted-foreground">Categoria:</span> <strong>{d.category}</strong></div>
                    <div><span className="text-muted-foreground">Valor Residual:</span> <strong>R$ {(d.residual_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                    <div><span className="text-muted-foreground">Data:</span> <strong>{format(new Date(d.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</strong></div>
                  </div>
                  {d.item_description && (
                    <div className="text-sm"><span className="text-muted-foreground">Descrição:</span><p className="mt-1">{d.item_description}</p></div>
                  )}
                  {d.reason_detail && (
                    <div className="text-sm"><span className="text-muted-foreground">Justificativa:</span><p className="mt-1">{d.reason_detail}</p></div>
                  )}
                  {d.rejection_note && (
                    <div className="text-sm p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                      <span className="text-destructive font-medium">Motivo da rejeição:</span>
                      <p className="mt-1">{d.rejection_note}</p>
                    </div>
                  )}
                  {Array.isArray(d.attachments) && d.attachments.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Anexos:</span>
                      <div className="flex gap-2 flex-wrap">
                        {d.attachments.map((a: any, i: number) => (
                          <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                            Arquivo {i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {canManage && d.status === 'pendente' && (
                  <DialogFooter className="gap-2">
                    <Button variant="outline" className="text-destructive" onClick={() => { setShowReject(d.id); }}>
                      <XCircle className="h-4 w-4 mr-2" /> Rejeitar
                    </Button>
                    <Button className="gap-2" onClick={() => handleApprove(d)} disabled={approveDisposal.isPending}>
                      {approveDisposal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Aprovar {d.origin_type === 'estoque' ? '& Baixar Estoque' : ''}
                    </Button>
                  </DialogFooter>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!showReject} onOpenChange={() => setShowReject(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rejeitar Descarte</DialogTitle>
            <DialogDescription>Informe o motivo da rejeição</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Motivo..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectDisposal.isPending}>Rejeitar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
