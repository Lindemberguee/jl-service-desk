import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDisposals, type Disposal } from '@/hooks/useDisposals';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Trash2, Plus, Search, Filter, CheckCircle2, XCircle, Clock,
  Package, Wrench, Upload, Eye, AlertTriangle, Loader2, ChevronsUpDown, Check,
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
  manual: { label: 'Manual', icon: Package },
};

const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${data.session?.access_token}`,
    'Content-Type': 'application/json',
  };
}

export default function DisposalPage() {
  const { currentRole, rolePermissions, currentTenantId } = useAuth();
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
    origin_type: 'estoque' as 'estoque' | 'ativo',
    stock_item_id: null as string | null,
    asset_id: null as string | null,
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
  const [itemPickerOpen, setItemPickerOpen] = useState(false);

  // Fetch stock items
  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock_items_for_disposal', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${BASE_URL}/rest/v1/stock_items?tenant_id=eq.${currentTenantId}&order=name&select=id,name,sku,brand,current_level,unit`,
        { headers }
      );
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!currentTenantId,
  });

  // Fetch assets
  const { data: assets = [] } = useQuery({
    queryKey: ['assets_for_disposal', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${BASE_URL}/rest/v1/assets?tenant_id=eq.${currentTenantId}&order=name&select=id,name,patrimony_code,serial_number,status`,
        { headers }
      );
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!currentTenantId,
  });

  const currentItems = form.origin_type === 'estoque'
    ? stockItems.map((s: any) => ({
        id: s.id,
        label: `${s.name}${s.sku ? ` (${s.sku})` : ''}`,
        sublabel: `${s.brand || ''} — Saldo: ${s.current_level ?? 0} ${s.unit || 'un'}`,
        name: s.name,
        unit: s.unit || 'un',
        maxQty: s.current_level ?? 999,
      }))
    : assets.map((a: any) => ({
        id: a.id,
        label: `${a.name}${a.patrimony_code ? ` (${a.patrimony_code})` : ''}`,
        sublabel: `${a.serial_number || 'Sem S/N'} — ${a.status}`,
        name: a.name,
        unit: 'un',
        maxQty: 1,
      }));

  const selectedItemId = form.origin_type === 'estoque' ? form.stock_item_id : form.asset_id;
  const selectedItem = currentItems.find((i: any) => i.id === selectedItemId);

  const handleSelectItem = (item: any) => {
    if (form.origin_type === 'estoque') {
      setForm(f => ({
        ...f,
        stock_item_id: item.id,
        asset_id: null,
        item_name: item.name,
        unit: item.unit,
        quantity: 1,
      }));
    } else {
      setForm(f => ({
        ...f,
        asset_id: item.id,
        stock_item_id: null,
        item_name: item.name,
        unit: 'un',
        quantity: 1,
      }));
    }
    setItemPickerOpen(false);
  };

  const handleOriginChange = (v: string) => {
    setForm(f => ({
      ...f,
      origin_type: v as 'estoque' | 'ativo',
      stock_item_id: null,
      asset_id: null,
      item_name: '',
      item_description: '',
      quantity: 1,
      unit: 'un',
    }));
  };

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
    if (!selectedItemId) { toast.error('Selecione um item para descarte'); return; }
    if (!form.item_name.trim()) { toast.error('Nome do item é obrigatório'); return; }
    await createDisposal.mutateAsync({
      origin_type: form.origin_type,
      stock_item_id: form.stock_item_id,
      asset_id: form.asset_id,
      item_name: form.item_name,
      item_description: form.item_description,
      quantity: form.quantity,
      unit: form.unit,
      reason: form.reason,
      reason_detail: form.reason_detail,
      category: form.category,
      residual_value: form.residual_value,
      attachments: attachmentUrls.map(url => ({ url })),
    });
    setShowCreate(false);
    resetForm();
  };

  const resetForm = () => {
    setForm({ origin_type: 'estoque', stock_item_id: null, asset_id: null, item_name: '', item_description: '', quantity: 1, unit: 'un', reason: 'outro', reason_detail: '', category: 'Geral', residual_value: 0 });
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
          <p className="text-sm text-muted-foreground">Gestão de itens depreciados, queimados e inservíveis</p>
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
                  const origin = originLabels[d.origin_type] || originLabels.estoque;
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
      <Dialog open={showCreate} onOpenChange={v => { if (!v) resetForm(); setShowCreate(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5" /> Registrar Descarte</DialogTitle>
            <DialogDescription>Selecione o item do estoque ou ativo a ser descartado</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Origin + Reason */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origem *</Label>
                <Select value={form.origin_type} onValueChange={handleOriginChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estoque">
                      <span className="flex items-center gap-2"><Package className="h-3.5 w-3.5" /> Estoque</span>
                    </SelectItem>
                    <SelectItem value="ativo">
                      <span className="flex items-center gap-2"><Wrench className="h-3.5 w-3.5" /> Ativo / Patrimônio</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motivo *</Label>
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

            {/* Item Picker (Combobox) */}
            <div className="space-y-2">
              <Label>{form.origin_type === 'estoque' ? 'Item de Estoque *' : 'Ativo / Patrimônio *'}</Label>
              <Popover open={itemPickerOpen} onOpenChange={setItemPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {selectedItem ? (
                      <span className="truncate">{selectedItem.label}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        {form.origin_type === 'estoque' ? 'Selecionar item de estoque...' : 'Selecionar ativo...'}
                      </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={form.origin_type === 'estoque' ? 'Buscar por nome ou SKU...' : 'Buscar por nome ou patrimônio...'} />
                    <CommandList>
                      <CommandEmpty>Nenhum item encontrado</CommandEmpty>
                      <CommandGroup>
                        {currentItems.map((item: any) => (
                          <CommandItem
                            key={item.id}
                            value={item.label}
                            onSelect={() => handleSelectItem(item)}
                            className="flex items-center gap-3 py-2.5"
                          >
                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center bg-muted shrink-0",
                              form.origin_type === 'estoque' ? 'text-primary' : 'text-amber-500'
                            )}>
                              {form.origin_type === 'estoque' ? <Package className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-sm font-medium truncate">{item.label}</span>
                              <span className="text-xs text-muted-foreground truncate">{item.sublabel}</span>
                            </div>
                            {selectedItemId === item.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedItem && (
                <p className="text-xs text-muted-foreground mt-1">{selectedItem.sublabel}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descrição / Observações</Label>
              <Textarea value={form.item_description} onChange={e => setForm(f => ({ ...f, item_description: e.target.value }))} placeholder="Estado do item, detalhes visuais..." rows={2} />
            </div>

            {/* Qty, Unit, Residual Value */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={1}
                  max={selectedItem?.maxQty || 9999}
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                />
                {form.origin_type === 'estoque' && selectedItem && (
                  <p className="text-[10px] text-muted-foreground">Máx: {selectedItem.maxQty}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} disabled={!!selectedItem} />
              </div>
              <div className="space-y-2">
                <Label>Valor Residual (R$)</Label>
                <Input type="number" min={0} step={0.01} value={form.residual_value} onChange={e => setForm(f => ({ ...f, residual_value: Number(e.target.value) }))} />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ex: Eletrônicos, Móveis..." />
            </div>

            {/* Reason Detail */}
            <div className="space-y-2">
              <Label>Justificativa</Label>
              <Textarea value={form.reason_detail} onChange={e => setForm(f => ({ ...f, reason_detail: e.target.value }))} placeholder="Descreva o motivo do descarte..." rows={2} />
            </div>

            {/* Attachments */}
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
            <Button variant="outline" onClick={() => { resetForm(); setShowCreate(false); }}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createDisposal.isPending || !selectedItemId} className="gap-2">
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
            const origin = originLabels[d.origin_type] || originLabels.estoque;
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
                    <Button variant="outline" className="text-destructive" onClick={() => setShowReject(d.id)}>
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
