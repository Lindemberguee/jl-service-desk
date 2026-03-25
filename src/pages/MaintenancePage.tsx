import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hasPermission } from '@/lib/permissions';
import { registerStockMovement } from '@/lib/stockMovementService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Wrench, Plus, Search, Monitor, Cpu, HardDrive, Mouse,
  Keyboard, MemoryStick, Cable, CircuitBoard, Pencil,
  Trash2, Link2, Package, Calendar, AlertTriangle, CheckCircle2,
  Clock, XCircle, Activity, Settings2, Laptop, Info, ArrowDownToLine,
  ShieldAlert, Box, Zap, BarChart3, Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const COMPONENT_TYPES = [
  { value: 'cpu', label: 'Processador (CPU)', icon: Cpu },
  { value: 'ram', label: 'Memória RAM', icon: MemoryStick },
  { value: 'hd', label: 'HD / Disco Rígido', icon: HardDrive },
  { value: 'ssd', label: 'SSD', icon: HardDrive },
  { value: 'monitor', label: 'Monitor', icon: Monitor },
  { value: 'mouse', label: 'Mouse', icon: Mouse },
  { value: 'teclado', label: 'Teclado', icon: Keyboard },
  { value: 'fonte', label: 'Fonte de Alimentação', icon: Cable },
  { value: 'placa_mae', label: 'Placa-Mãe', icon: CircuitBoard },
  { value: 'placa_video', label: 'Placa de Vídeo', icon: Monitor },
  { value: 'notebook', label: 'Notebook', icon: Laptop },
  { value: 'impressora', label: 'Impressora', icon: Settings2 },
  { value: 'outros', label: 'Outros', icon: Package },
];

const MAINTENANCE_TYPES: Record<string, { label: string; color: string }> = {
  preventiva: { label: 'Preventiva', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  corretiva: { label: 'Corretiva', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  preditiva: { label: 'Preditiva', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  instalacao: { label: 'Instalação', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  substituicao: { label: 'Substituição', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
};

const MAINTENANCE_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  agendada: { label: 'Agendada', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Calendar },
  em_andamento: { label: 'Em Andamento', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Activity },
  concluida: { label: 'Concluída', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2 },
  cancelada: { label: 'Cancelada', color: 'bg-muted text-muted-foreground', icon: XCircle },
  atrasada: { label: 'Atrasada', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertTriangle },
};

const COMPONENT_STATUS: Record<string, { label: string; color: string }> = {
  ativo: { label: 'Ativo', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  defeito: { label: 'Defeito', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  substituido: { label: 'Substituído', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  descartado: { label: 'Descartado', color: 'bg-muted text-muted-foreground' },
};

const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function getHeaders() {
  const { data } = await supabase.auth.getSession();
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${data.session?.access_token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: number; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className="border-border/60 shadow-sm hover:border-border transition-colors group overflow-hidden relative h-full">
        <CardContent className="p-4 relative">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-border/50 bg-muted/60 p-2.5 shrink-0">
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-tight text-foreground">{value}</p>
              <p className="text-[11px] font-medium text-muted-foreground truncate uppercase tracking-[0.12em]">{label}</p>
              {sub && <p className="text-[10px] text-muted-foreground/60 truncate">{sub}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function MaintenancePage() {
  const { currentTenantId, currentRole, rolePermissions, user } = useAuth();
  const qc = useQueryClient();
  const canManage = currentRole ? hasPermission(currentRole, 'manutencao:manage', undefined, rolePermissions) : false;

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [tab, setTab] = useState('manutencoes');

  const [maintenanceDialog, setMaintenanceDialog] = useState(false);
  const [componentDialog, setComponentDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState<string | null>(null);
  const [componentDetailTarget, setComponentDetailTarget] = useState<any>(null);
  const [editingMaintenance, setEditingMaintenance] = useState<any>(null);
  const [editingComponent, setEditingComponent] = useState<any>(null);

  const [mForm, setMForm] = useState({ asset_id: '', type: 'corretiva', status: 'agendada', title: '', description: '', scheduled_at: '', observations: '', cost: '', technician_id: '' });
  const [cForm, setCForm] = useState({ asset_id: '', component_type: 'cpu', brand: '', model: '', serial_number: '', stock_item_id: '', status: 'ativo', notes: '' });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const h = await getHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/assets?tenant_id=eq.${currentTenantId}&select=id,name,patrimony_code,status,serial_number&order=name`, { headers: h });
      return res.ok ? res.json() : [];
    },
    enabled: !!currentTenantId,
  });

  const { data: maintenances = [], isLoading: loadingM } = useQuery({
    queryKey: ['maintenance_records', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const h = await getHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/asset_maintenance_records?tenant_id=eq.${currentTenantId}&select=*&order=created_at.desc`, { headers: h });
      return res.ok ? res.json() : [];
    },
    enabled: !!currentTenantId,
  });

  const { data: components = [], isLoading: loadingC } = useQuery({
    queryKey: ['asset_components', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const h = await getHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/asset_components?tenant_id=eq.${currentTenantId}&select=*&order=created_at.desc`, { headers: h });
      return res.ok ? res.json() : [];
    },
    enabled: !!currentTenantId,
  });

  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock_items_for_link', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const h = await getHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/stock_items?tenant_id=eq.${currentTenantId}&select=id,name,sku,current_level,brand,model,component_type,patrimony_code,serial_number,description&order=name`, { headers: h });
      return res.ok ? res.json() : [];
    },
    enabled: !!currentTenantId,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles_maintenance'],
    queryFn: async () => {
      const h = await getHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/profiles?select=id,name&is_active=eq.true`, { headers: h });
      return res.ok ? res.json() : [];
    },
  });

  const assetMap = useMemo(() => Object.fromEntries(assets.map((a: any) => [a.id, a])), [assets]);
  const profileMap = useMemo(() => Object.fromEntries(profiles.map((p: any) => [p.id, p])), [profiles]);
  const stockMap = useMemo(() => Object.fromEntries(stockItems.map((s: any) => [s.id, s])), [stockItems]);

  const filteredMaintenances = useMemo(() => maintenances.filter((m: any) => {
    const asset = assetMap[m.asset_id];
    const matchSearch = !debouncedSearch || m.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) || asset?.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || asset?.patrimony_code?.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchStatus = filterStatus === 'all' || m.status === filterStatus;
    const matchType = filterType === 'all' || m.type === filterType;
    return matchSearch && matchStatus && matchType;
  }), [maintenances, debouncedSearch, filterStatus, filterType, assetMap]);

  const filteredComponents = useMemo(() => components.filter((c: any) => {
    const asset = assetMap[c.asset_id];
    return !debouncedSearch || c.brand?.toLowerCase().includes(debouncedSearch.toLowerCase()) || c.model?.toLowerCase().includes(debouncedSearch.toLowerCase()) || c.serial_number?.toLowerCase().includes(debouncedSearch.toLowerCase()) || asset?.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || COMPONENT_TYPES.find(t => t.value === c.component_type)?.label.toLowerCase().includes(debouncedSearch.toLowerCase());
  }), [components, debouncedSearch, assetMap]);

  const saveMaintenance = useMutation({
    mutationFn: async (data: any) => {
      const h = await getHeaders();
      const body = { ...data, tenant_id: currentTenantId, created_by: user?.id };
      if (editingMaintenance) {
        const res = await fetch(`${BASE_URL}/rest/v1/asset_maintenance_records?id=eq.${editingMaintenance.id}`, { method: 'PATCH', headers: h, body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Erro ao atualizar');
      } else {
        const res = await fetch(`${BASE_URL}/rest/v1/asset_maintenance_records`, { method: 'POST', headers: h, body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Erro ao criar');
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance_records'] }); setMaintenanceDialog(false); setEditingMaintenance(null); resetMForm(); toast.success(editingMaintenance ? 'Manutenção atualizada!' : 'Manutenção registrada com sucesso!'); },
    onError: () => toast.error('Erro ao salvar manutenção'),
  });

  const deleteMaintenance = useMutation({
    mutationFn: async (id: string) => {
      const h = await getHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/asset_maintenance_records?id=eq.${id}`, { method: 'DELETE', headers: h });
      if (!res.ok) throw new Error('Erro');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance_records'] }); toast.success('Manutenção removida!'); },
    onError: () => toast.error('Erro ao remover'),
  });

  const saveComponent = useMutation({
    mutationFn: async (data: any) => {
      const h = await getHeaders();
      const body = { ...data, tenant_id: currentTenantId };
      const isNew = !editingComponent;
      if (isNew && body.stock_item_id) {
        const stockItem = stockItems.find((s: any) => s.id === body.stock_item_id);
        if (!stockItem || stockItem.current_level < 1) throw new Error('STOCK_EMPTY');
      }
      if (editingComponent) {
        const res = await fetch(`${BASE_URL}/rest/v1/asset_components?id=eq.${editingComponent.id}`, { method: 'PATCH', headers: h, body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Erro ao atualizar');
      } else {
        const res = await fetch(`${BASE_URL}/rest/v1/asset_components`, { method: 'POST', headers: h, body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Erro ao criar');
        if (body.stock_item_id && currentTenantId) {
          await registerStockMovement({ tenantId: currentTenantId, stockItemId: body.stock_item_id, type: 'out', qty: 1, userId: user?.id, reference: `Componente instalado em ativo (${assetMap[body.asset_id]?.name || 'N/A'})` });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset_components'] });
      qc.invalidateQueries({ queryKey: ['stock_items_for_link'] });
      qc.invalidateQueries({ queryKey: ['stock_items'] });
      qc.invalidateQueries({ queryKey: ['stock_movements'] });
      setComponentDialog(false); setEditingComponent(null); resetCForm();
      toast.success(editingComponent ? 'Componente atualizado!' : 'Componente registrado e estoque atualizado automaticamente!', { description: !editingComponent ? '1 unidade foi retirada do estoque.' : undefined });
    },
    onError: (err: any) => {
      if (err.message === 'STOCK_EMPTY' || err.message === 'INSUFFICIENT_STOCK') toast.error('Estoque insuficiente!', { description: 'O item selecionado não possui quantidade disponível. Cadastre entrada no estoque primeiro.' });
      else toast.error('Erro ao salvar componente');
    },
  });

  const deleteComponent = useMutation({
    mutationFn: async (id: string) => {
      const h = await getHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/asset_components?id=eq.${id}`, { method: 'DELETE', headers: h });
      if (!res.ok) throw new Error('Erro');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['asset_components'] }); toast.success('Componente removido!'); },
    onError: () => toast.error('Erro ao remover'),
  });

  function resetMForm() { setMForm({ asset_id: '', type: 'corretiva', status: 'agendada', title: '', description: '', scheduled_at: '', observations: '', cost: '', technician_id: '' }); }
  function resetCForm() { setCForm({ asset_id: '', component_type: 'cpu', brand: '', model: '', serial_number: '', stock_item_id: '', status: 'ativo', notes: '' }); }

  function openEditMaintenance(m: any) {
    setEditingMaintenance(m);
    setMForm({ asset_id: m.asset_id, type: m.type, status: m.status, title: m.title, description: m.description || '', scheduled_at: m.scheduled_at?.slice(0, 16) || '', observations: m.observations || '', cost: m.cost ? String(m.cost) : '', technician_id: m.technician_id || '' });
    setMaintenanceDialog(true);
  }

  function openEditComponent(c: any) {
    setEditingComponent(c);
    setCForm({ asset_id: c.asset_id, component_type: c.component_type, brand: c.brand || '', model: c.model || '', serial_number: c.serial_number || '', stock_item_id: c.stock_item_id || '', status: c.status, notes: c.notes || '' });
    setComponentDialog(true);
  }

  const getComponentIcon = (type: string) => COMPONENT_TYPES.find(t => t.value === type)?.icon || Package;

  const stats = useMemo(() => ({
    total: maintenances.length,
    agendadas: maintenances.filter((m: any) => m.status === 'agendada').length,
    em_andamento: maintenances.filter((m: any) => m.status === 'em_andamento').length,
    concluidas: maintenances.filter((m: any) => m.status === 'concluida').length,
    componentes: components.length,
    defeitos: components.filter((c: any) => c.status === 'defeito').length,
    custoTotal: maintenances.reduce((acc: number, m: any) => acc + (Number(m.cost) || 0), 0),
  }), [maintenances, components]);

  const selectedStockItem = cForm.stock_item_id ? stockItems.find((s: any) => s.id === cForm.stock_item_id) : null;
  const availableStock = stockItems.filter((s: any) => s.current_level > 0);
  const activeFilters = (search ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0) + (filterType !== 'all' ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/30 p-6 shadow-sm">
        <div className="absolute inset-y-0 right-0 w-56 bg-primary/5 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Wrench className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Operação técnica e ciclo de reparo</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">Controle de Manutenção</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Gerencie manutenções preventivas e corretivas de equipamentos com vínculo direto a peças de estoque e histórico operacional mais claro.</p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            {stats.custoTotal > 0 && (
              <div className="text-left sm:text-right">
                <p className="text-xs text-muted-foreground">Custo total em manutenções</p>
                <p className="text-xl font-bold text-foreground">R$ {stats.custoTotal.toFixed(2)}</p>
              </div>
            )}
            <div className="rounded-xl border border-border/60 bg-card/70 px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Consumo de peças integrado ao estoque</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Manutenções" value={stats.total} icon={BarChart3} color="text-primary" />
        <StatCard label="Agendadas" value={stats.agendadas} icon={Calendar} color="text-blue-500" sub="Aguardando execução" />
        <StatCard label="Em Andamento" value={stats.em_andamento} icon={Activity} color="text-amber-500" sub="Em execução agora" />
        <StatCard label="Concluídas" value={stats.concluidas} icon={CheckCircle2} color="text-green-500" />
        <StatCard label="Peças Instaladas" value={stats.componentes} icon={CircuitBoard} color="text-purple-500" sub="Componentes registrados" />
        <StatCard label="Com Defeito" value={stats.defeitos} icon={ShieldAlert} color="text-destructive" sub="Necessitam atenção" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="h-10 bg-card border border-border">
            <TabsTrigger value="manutencoes" className="h-8 gap-1.5 data-[state=active]:bg-background"><Wrench className="h-3.5 w-3.5" /> Manutenções</TabsTrigger>
            <TabsTrigger value="componentes" className="h-8 gap-1.5 data-[state=active]:bg-background"><CircuitBoard className="h-3.5 w-3.5" /> Peças / Componentes</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, ativo, patrimônio..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64 h-10" />
            </div>
            {tab === 'manutencoes' && (
              <>
                <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-40 h-10"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos Status</SelectItem>{Object.entries(MAINTENANCE_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select>
                <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-40 h-10"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos Tipos</SelectItem>{Object.entries(MAINTENANCE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select>
              </>
            )}
            {activeFilters > 0 && <Button variant="ghost" size="sm" className="h-10 gap-1.5" onClick={() => { setSearch(''); setFilterStatus('all'); setFilterType('all'); }}><CheckCircle2 className="h-3.5 w-3.5" /> Limpar</Button>}
            {canManage && (
              <Button onClick={() => { if (tab === 'manutencoes') { resetMForm(); setEditingMaintenance(null); setMaintenanceDialog(true); } else { resetCForm(); setEditingComponent(null); setComponentDialog(true); } }} size="sm" className="h-10 gap-1.5">
                <Plus className="h-4 w-4" /> {tab === 'manutencoes' ? 'Nova Manutenção' : 'Instalar Peça'}
              </Button>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{tab === 'manutencoes' ? filteredMaintenances.length : filteredComponents.length} registro(s) exibido(s)</span>
          <span>{activeFilters > 0 ? `${activeFilters} filtro(s) ativo(s)` : 'Visão completa'}</span>
        </div>

        <TabsContent value="manutencoes" className="mt-4">
          <Card className="border-border/60 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Título</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Data Agendada</TableHead>
                    <TableHead>Custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {loadingM ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground"><div className="flex flex-col items-center gap-2"><Activity className="h-6 w-6 animate-spin" /><span>Carregando manutenções...</span></div></TableCell></TableRow>
                    ) : filteredMaintenances.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-14"><div className="flex flex-col items-center gap-2 text-muted-foreground"><Wrench className="h-8 w-8 opacity-25" /><p className="font-medium text-foreground">Nenhuma manutenção encontrada</p><p className="text-xs">Registre a primeira manutenção para começar o controle.</p></div></TableCell></TableRow>
                    ) : filteredMaintenances.map((m: any, idx: number) => {
                      const asset = assetMap[m.asset_id];
                      const tech = m.technician_id ? profileMap[m.technician_id] : null;
                      const statusInfo = MAINTENANCE_STATUS[m.status] || MAINTENANCE_STATUS.agendada;
                      const typeInfo = MAINTENANCE_TYPES[m.type] || MAINTENANCE_TYPES.corretiva;
                      const StatusIcon = statusInfo.icon;
                      return (
                        <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }} className="group border-b border-border/40 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setDetailDialog(m.id)}>
                          <TableCell className="font-medium"><div className="flex items-center gap-2"><div className="w-1 h-8 rounded-full" style={{ backgroundColor: typeInfo.color.includes('blue') ? 'hsl(var(--primary))' : typeInfo.color.includes('orange') ? '#f97316' : typeInfo.color.includes('purple') ? '#a855f7' : typeInfo.color.includes('green') ? '#22c55e' : '#f59e0b' }} />{m.title}</div></TableCell>
                          <TableCell><div className="flex flex-col"><span className="text-sm">{asset?.name || '—'}</span>{asset?.patrimony_code && <span className="text-[11px] text-muted-foreground font-mono">{asset.patrimony_code}</span>}</div></TableCell>
                          <TableCell><Badge variant="outline" className={typeInfo.color}>{typeInfo.label}</Badge></TableCell>
                          <TableCell><Badge variant="outline" className={`${statusInfo.color} gap-1`}><StatusIcon className="h-3 w-3" />{statusInfo.label}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{tech?.name || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{m.scheduled_at ? format(new Date(m.scheduled_at), 'dd/MM/yy HH:mm', { locale: ptBR }) : '—'}</TableCell>
                          <TableCell className="text-sm font-medium">{m.cost && Number(m.cost) > 0 ? `R$ ${Number(m.cost).toFixed(2)}` : '—'}</TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="componentes" className="mt-4">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10 text-sm">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Como funciona?</p>
                <p className="text-muted-foreground mt-0.5">Cada peça/componente instalado em um ativo <strong>deve estar cadastrado no estoque</strong>. Ao registrar uma instalação, o sistema deduz automaticamente 1 unidade do item de estoque selecionado. Se não houver estoque suficiente, será necessário <strong>cadastrar a entrada primeiro</strong> no módulo de Estoque.</p>
              </div>
            </div>
          </motion.div>

          <Card className="border-border/60 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-muted/30"><TableHead>Peça</TableHead><TableHead>Ativo Vinculado</TableHead><TableHead>Marca / Modelo</TableHead><TableHead>Nº Série</TableHead><TableHead>Item de Estoque</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {loadingC ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground"><div className="flex flex-col items-center gap-2"><Activity className="h-6 w-6 animate-spin" /><span>Carregando peças...</span></div></TableCell></TableRow>
                    ) : filteredComponents.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-14"><div className="flex flex-col items-center gap-2 text-muted-foreground"><CircuitBoard className="h-8 w-8 opacity-25" /><p className="font-medium text-foreground">Nenhuma peça registrada</p><p className="text-xs">Instale a primeira peça em um ativo para rastrear seus componentes.</p></div></TableCell></TableRow>
                    ) : filteredComponents.map((c: any, idx: number) => {
                      const asset = assetMap[c.asset_id];
                      const stock = c.stock_item_id ? stockMap[c.stock_item_id] : null;
                      const statusInfo = COMPONENT_STATUS[c.status] || COMPONENT_STATUS.ativo;
                      const CompIcon = getComponentIcon(c.component_type);
                      const typeLabel = COMPONENT_TYPES.find(t => t.value === c.component_type)?.label || c.component_type;
                      return (
                        <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }} className="group border-b border-border/40 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setComponentDetailTarget(c)}>
                          <TableCell><div className="flex items-center gap-2.5"><div className="p-1.5 rounded-md bg-muted/50 border border-border/40"><CompIcon className="h-4 w-4 text-muted-foreground" /></div><span className="font-medium text-sm">{typeLabel}</span></div></TableCell>
                          <TableCell><div className="flex flex-col"><span className="text-sm">{asset?.name || '—'}</span>{asset?.patrimony_code && <span className="text-[10px] text-muted-foreground font-mono">{asset.patrimony_code}</span>}</div></TableCell>
                          <TableCell className="text-sm">{c.brand || c.model ? <span>{c.brand || ''} {c.model ? <span className="text-muted-foreground">{c.model}</span> : ''}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">{c.serial_number || '—'}</TableCell>
                          <TableCell>{stock ? <Badge variant="outline" className="gap-1 bg-primary/5 text-primary border-primary/20"><Package className="h-3 w-3" />{stock.name}</Badge> : <span className="text-muted-foreground text-xs">Sem vínculo</span>}</TableCell>
                          <TableCell><Badge variant="outline" className={statusInfo.color}>{statusInfo.label}</Badge></TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={maintenanceDialog} onOpenChange={v => { if (!v) { setMaintenanceDialog(false); setEditingMaintenance(null); } }}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" />{editingMaintenance ? 'Editar Manutenção' : 'Registrar Nova Manutenção'}</DialogTitle><DialogDescription>{editingMaintenance ? 'Atualize os dados desta manutenção.' : 'Registre uma manutenção preventiva, corretiva ou preditiva vinculada a um ativo.'}</DialogDescription></DialogHeader><div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto pr-1"><div className="grid gap-2"><Label>Ativo *</Label><Select value={mForm.asset_id} onValueChange={v => setMForm(p => ({ ...p, asset_id: v }))}><SelectTrigger><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger><SelectContent>{assets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} {a.patrimony_code ? `(${a.patrimony_code})` : ''}</SelectItem>)}</SelectContent></Select>{assets.length === 0 && <p className="text-xs text-amber-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Nenhum ativo cadastrado. Cadastre primeiro em Ativos.</p>}</div><div className="grid gap-2"><Label>Título da Manutenção *</Label><Input value={mForm.title} onChange={e => setMForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Troca de fonte queimada, Limpeza preventiva" /></div><div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label>Tipo</Label><Select value={mForm.type} onValueChange={v => setMForm(p => ({ ...p, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(MAINTENANCE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Status</Label><Select value={mForm.status} onValueChange={v => setMForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(MAINTENANCE_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div></div><div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label>Data Agendada</Label><Input type="datetime-local" value={mForm.scheduled_at} onChange={e => setMForm(p => ({ ...p, scheduled_at: e.target.value }))} /></div><div className="grid gap-2"><Label>Custo (R$)</Label><CurrencyInput value={mForm.cost} onValueChange={v => setMForm(p => ({ ...p, cost: v }))} /></div></div><div className="grid gap-2"><Label>Técnico Responsável</Label><Select value={mForm.technician_id || 'none'} onValueChange={v => setMForm(p => ({ ...p, technician_id: v === 'none' ? '' : v }))}><SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger><SelectContent><SelectItem value="none">Nenhum</SelectItem>{profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Descrição</Label><Textarea value={mForm.description} onChange={e => setMForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Descreva o que será feito nesta manutenção..." /></div><div className="grid gap-2"><Label>Observações</Label><Textarea value={mForm.observations} onChange={e => setMForm(p => ({ ...p, observations: e.target.value }))} rows={2} placeholder="Informações adicionais..." /></div></div><DialogFooter><Button variant="outline" onClick={() => setMaintenanceDialog(false)}>Cancelar</Button><Button disabled={!mForm.asset_id || !mForm.title || saveMaintenance.isPending} onClick={() => saveMaintenance.mutate({ asset_id: mForm.asset_id, type: mForm.type, status: mForm.status, title: mForm.title, description: mForm.description || null, scheduled_at: mForm.scheduled_at || null, observations: mForm.observations || null, cost: mForm.cost ? Number(mForm.cost) : 0, technician_id: mForm.technician_id || null })}>{saveMaintenance.isPending ? 'Salvando...' : 'Salvar'}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={componentDialog} onOpenChange={v => { if (!v) { setComponentDialog(false); setEditingComponent(null); } }}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle className="flex items-center gap-2"><CircuitBoard className="h-5 w-5 text-primary" />{editingComponent ? 'Editar Peça' : 'Instalar Peça / Componente'}</DialogTitle><DialogDescription>{editingComponent ? 'Atualize os dados desta peça instalada.' : 'Registre a instalação de um componente em um ativo. A peça deve existir no estoque — 1 unidade será deduzida automaticamente.'}</DialogDescription></DialogHeader><div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto pr-1"><div className="grid gap-2"><Label>Ativo de destino *</Label><Select value={cForm.asset_id} onValueChange={v => setCForm(p => ({ ...p, asset_id: v }))}><SelectTrigger><SelectValue placeholder="Em qual equipamento será instalado?" /></SelectTrigger><SelectContent>{assets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} {a.patrimony_code ? `(${a.patrimony_code})` : ''}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label>Tipo de Peça *</Label><Select value={cForm.component_type} onValueChange={v => setCForm(p => ({ ...p, component_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COMPONENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Status</Label><Select value={cForm.status} onValueChange={v => setCForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(COMPONENT_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div></div><div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label>Marca</Label><Input value={cForm.brand} onChange={e => setCForm(p => ({ ...p, brand: e.target.value }))} placeholder="Ex: Intel, Kingston" /></div><div className="grid gap-2"><Label>Modelo</Label><Input value={cForm.model} onChange={e => setCForm(p => ({ ...p, model: e.target.value }))} placeholder="Ex: i7-12700, 16GB DDR4" /></div></div><div className="grid gap-2"><Label>Nº de Série</Label><Input value={cForm.serial_number} onChange={e => setCForm(p => ({ ...p, serial_number: e.target.value }))} placeholder="Número de série do componente" /></div><div className="grid gap-2"><Label className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-primary" />Item de Estoque *{!editingComponent && <Tooltip><TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent className="max-w-xs">Obrigatório: selecione o item de estoque correspondente. 1 unidade será deduzida automaticamente ao salvar.</TooltipContent></Tooltip>}</Label><Select value={cForm.stock_item_id || 'none'} onValueChange={v => { const selectedId = v === 'none' ? '' : v; setCForm(p => ({ ...p, stock_item_id: selectedId })); if (selectedId) { const si = stockItems.find((s: any) => s.id === selectedId); if (si) { setCForm(p => ({ ...p, stock_item_id: selectedId, brand: si.brand || p.brand, model: si.model || p.model, component_type: si.component_type || p.component_type, serial_number: si.serial_number || p.serial_number })); } } }}><SelectTrigger className={!cForm.stock_item_id && !editingComponent ? 'border-amber-500/50' : ''}><SelectValue placeholder="Selecione o item de estoque" /></SelectTrigger><SelectContent>{editingComponent && <SelectItem value="none">Sem vínculo</SelectItem>}{availableStock.length === 0 && !editingComponent ? <div className="p-3 text-center text-sm text-muted-foreground"><Package className="h-5 w-5 mx-auto mb-1 opacity-40" /><p>Nenhum item em estoque</p><p className="text-xs">Cadastre itens no módulo de Estoque primeiro.</p></div> : (editingComponent ? stockItems : availableStock).map((s: any) => <SelectItem key={s.id} value={s.id}><div className="flex items-center gap-2"><span>{s.name}</span>{s.brand && <span className="text-muted-foreground text-[10px]">{s.brand}</span>}{s.sku && <span className="text-muted-foreground text-[10px]">({s.sku})</span>}<Badge variant="outline" className="ml-auto text-[10px] h-5">Qtd: {s.current_level}</Badge></div></SelectItem>)}</SelectContent></Select>{!editingComponent && selectedStockItem && <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/10 text-xs"><ArrowDownToLine className="h-3.5 w-3.5 text-primary" /><span>Estoque atual: <strong>{selectedStockItem.current_level}</strong> → Após salvar: <strong>{selectedStockItem.current_level - 1}</strong><span className="text-muted-foreground ml-1">(−1 unidade)</span></span></motion.div>}{!editingComponent && !cForm.stock_item_id && <p className="text-xs text-amber-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Obrigatório — selecione um item do estoque para continuar.</p>}</div><div className="grid gap-2"><Label>Observações</Label><Textarea value={cForm.notes} onChange={e => setCForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Informações adicionais sobre a instalação..." /></div></div><DialogFooter><Button variant="outline" onClick={() => setComponentDialog(false)}>Cancelar</Button><Button disabled={!cForm.asset_id || (!editingComponent && !cForm.stock_item_id) || saveComponent.isPending} onClick={() => saveComponent.mutate({ asset_id: cForm.asset_id, component_type: cForm.component_type, brand: cForm.brand || null, model: cForm.model || null, serial_number: cForm.serial_number || null, stock_item_id: cForm.stock_item_id || null, status: cForm.status, notes: cForm.notes || null })}>{saveComponent.isPending ? 'Salvando...' : editingComponent ? 'Salvar' : 'Instalar e Deduzir Estoque'}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-lg">{(() => { const m = maintenances.find((x: any) => x.id === detailDialog); if (!m) return null; const asset = assetMap[m.asset_id]; const tech = m.technician_id ? profileMap[m.technician_id] : null; const statusInfo = MAINTENANCE_STATUS[m.status] || MAINTENANCE_STATUS.agendada; const typeInfo = MAINTENANCE_TYPES[m.type] || MAINTENANCE_TYPES.corretiva; const StatusIcon = statusInfo.icon; const assetComponents = components.filter((c: any) => c.asset_id === m.asset_id); return (<><DialogHeader><DialogTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" />{m.title}</DialogTitle><DialogDescription>Detalhes da manutenção</DialogDescription></DialogHeader><div className="space-y-4"><div className="flex gap-2 flex-wrap"><Badge variant="outline" className={typeInfo.color}>{typeInfo.label}</Badge><Badge variant="outline" className={`${statusInfo.color} gap-1`}><StatusIcon className="h-3 w-3" />{statusInfo.label}</Badge></div><Separator /><div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm"><div><span className="text-muted-foreground block text-xs">Ativo</span> <strong>{asset?.name || '—'}</strong></div><div><span className="text-muted-foreground block text-xs">Patrimônio</span> {asset?.patrimony_code || '—'}</div><div><span className="text-muted-foreground block text-xs">Técnico</span> {tech?.name || '—'}</div><div><span className="text-muted-foreground block text-xs">Custo</span> {m.cost && Number(m.cost) > 0 ? `R$ ${Number(m.cost).toFixed(2)}` : '—'}</div><div><span className="text-muted-foreground block text-xs">Agendada</span> {m.scheduled_at ? format(new Date(m.scheduled_at), 'dd/MM/yy HH:mm') : '—'}</div><div><span className="text-muted-foreground block text-xs">Concluída</span> {m.completed_at ? format(new Date(m.completed_at), 'dd/MM/yy HH:mm') : '—'}</div></div>{m.description && <div><p className="text-xs text-muted-foreground mb-1">Descrição</p><p className="text-sm bg-muted/30 p-2.5 rounded-md">{m.description}</p></div>}{m.observations && <div><p className="text-xs text-muted-foreground mb-1">Observações</p><p className="text-sm bg-muted/30 p-2.5 rounded-md">{m.observations}</p></div>}{assetComponents.length > 0 && <div><Separator className="mb-3" /><p className="text-sm font-medium mb-2 flex items-center gap-1.5"><CircuitBoard className="h-4 w-4 text-primary" /> Peças deste Ativo ({assetComponents.length})</p><div className="space-y-1.5">{assetComponents.map((c: any) => { const CompIcon = getComponentIcon(c.component_type); const cStatus = COMPONENT_STATUS[c.status] || COMPONENT_STATUS.ativo; const stock = c.stock_item_id ? stockMap[c.stock_item_id] : null; return (<div key={c.id} className="flex items-center gap-2 p-2.5 rounded-md bg-muted/30 border border-border/30 text-sm"><div className="p-1 rounded bg-background border border-border/40"><CompIcon className="h-3.5 w-3.5 text-muted-foreground" /></div><div className="flex-1 min-w-0"><span className="font-medium">{COMPONENT_TYPES.find(t => t.value === c.component_type)?.label}</span>{c.brand && <span className="text-muted-foreground ml-1">— {c.brand} {c.model}</span>}{stock && <span className="text-xs text-primary ml-2">({stock.name})</span>}</div><Badge variant="outline" className={`text-[10px] shrink-0 ${cStatus.color}`}>{cStatus.label}</Badge></div>); })}</div></div>}</div>{canManage && <DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setDetailDialog(null); openEditMaintenance(m); }}><Pencil className="h-3.5 w-3.5" /> Editar</Button><Button variant="destructive" size="sm" className="gap-1.5" onClick={() => { if (confirm('Remover esta manutenção?')) { deleteMaintenance.mutate(m.id); setDetailDialog(null); } }}><Trash2 className="h-3.5 w-3.5" /> Excluir</Button></DialogFooter>}</>); })()}</DialogContent>
      </Dialog>

      <Dialog open={!!componentDetailTarget} onOpenChange={() => setComponentDetailTarget(null)}>
        <DialogContent className="max-w-lg">{(() => { const c = componentDetailTarget; if (!c) return null; const asset = assetMap[c.asset_id]; const stock = c.stock_item_id ? stockMap[c.stock_item_id] : null; const statusInfo = COMPONENT_STATUS[c.status] || COMPONENT_STATUS.ativo; const CompIcon = getComponentIcon(c.component_type); const typeLabel = COMPONENT_TYPES.find(t => t.value === c.component_type)?.label || c.component_type; return (<><DialogHeader><DialogTitle className="flex items-center gap-2"><CompIcon className="h-5 w-5 text-primary" />{typeLabel}</DialogTitle><DialogDescription>Detalhes do componente instalado</DialogDescription></DialogHeader><div className="space-y-4"><Badge variant="outline" className={statusInfo.color}>{statusInfo.label}</Badge><Separator /><div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm"><div><span className="text-muted-foreground block text-xs">Ativo</span> <strong>{asset?.name || '—'}</strong></div><div><span className="text-muted-foreground block text-xs">Patrimônio</span> {asset?.patrimony_code || '—'}</div><div><span className="text-muted-foreground block text-xs">Marca</span> {c.brand || '—'}</div><div><span className="text-muted-foreground block text-xs">Modelo</span> {c.model || '—'}</div><div><span className="text-muted-foreground block text-xs">Nº Série</span> <span className="font-mono">{c.serial_number || '—'}</span></div><div><span className="text-muted-foreground block text-xs">Item de Estoque</span> {stock ? <Badge variant="outline" className="gap-1 bg-primary/5 text-primary border-primary/20 mt-0.5"><Package className="h-3 w-3" />{stock.name}</Badge> : '—'}</div><div><span className="text-muted-foreground block text-xs">Instalado em</span> {c.installed_at ? format(new Date(c.installed_at), 'dd/MM/yy') : c.created_at ? format(new Date(c.created_at), 'dd/MM/yy') : '—'}</div></div>{c.notes && <div><p className="text-xs text-muted-foreground mb-1">Observações</p><p className="text-sm bg-muted/30 p-2.5 rounded-md">{c.notes}</p></div>}</div>{canManage && <DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setComponentDetailTarget(null); openEditComponent(c); }}><Pencil className="h-3.5 w-3.5" /> Editar</Button><Button variant="destructive" size="sm" className="gap-1.5" onClick={() => { if (confirm('Remover esta peça?')) { deleteComponent.mutate(c.id); setComponentDetailTarget(null); } }}><Trash2 className="h-3.5 w-3.5" /> Excluir</Button></DialogFooter>}</>); })()}</DialogContent>
      </Dialog>
    </div>
  );
}
