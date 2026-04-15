import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantQuery, useTenantInsert } from '@/hooks/useTenantQuery';
import { logAudit } from '@/lib/audit';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Mail, Phone, FileText, Settings2, MapPin, Wrench, User, Eye, Tag, X, Plus, AlertCircle, Link, Paperclip, Upload, Trash2, Building2, Calendar, Loader2 } from 'lucide-react';
import { WorkOrderCreateHeader } from '../components/WorkOrderCreateHeader';
import { WorkOrderCreateSection } from '../components/WorkOrderCreateSection';
import { WorkOrderCreateSidebar } from '../components/WorkOrderCreateSidebar';

function priorityLabel(priority: string) {
  if (priority === 'baixa') return '🟢 Baixa';
  if (priority === 'media') return '🔵 Média';
  if (priority === 'alta') return '🟠 Alta';
  if (priority === 'critica') return '🔴 Crítica';
  return priority;
}

export default function WorkOrderCreateProductPage() {
  const { currentTenantId, user, profile, currentRole, memberships, switchTenant } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('media');
  const [categoryId, setCategoryId] = useState<string>('');
  const [unitId, setUnitId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [assetId, setAssetId] = useState<string>('');
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [requesterId, setRequesterId] = useState<string>('');
  const [visibility, setVisibility] = useState<string>('internal');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [externalLink, setExternalLink] = useState('');
  const [deadlineAt, setDeadlineAt] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const MAX_SIZE_BYTES = 10 * 1024 * 1024;
  const ALLOWED_MIME_TYPES = [
    'image/png', 'image/jpeg', 'image/jpg',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];

  const isFileAllowed = (file: File) => {
    if (ALLOWED_MIME_TYPES.includes(file.type)) return true;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    return ALLOWED_EXTENSIONS.includes(ext);
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const valid: File[] = [];
    for (const file of Array.from(files)) {
      if (!isFileAllowed(file)) {
        toast({ title: 'Tipo não permitido', description: `${file.name}: apenas imagens (PNG/JPG), PDF, Word e Excel.`, variant: 'destructive' });
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast({ title: 'Arquivo muito grande', description: `${file.name} excede o limite de 10 MB.`, variant: 'destructive' });
        continue;
      }
      valid.push(file);
    }
    setPendingFiles(prev => [...prev, ...valid]);
    e.target.value = '';
  };

  const removePendingFile = (index: number) => setPendingFiles(prev => prev.filter((_, i) => i !== index));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  useEffect(() => {
    if (!requesterId && profile?.email && !contactEmail) setContactEmail(profile.email);
  }, [profile?.email]);

  const { data: categories = [] } = useTenantQuery<any>('categories', 'categories');
  const { data: units = [] } = useTenantQuery<any>('units', 'units');
  const { data: assets = [] } = useTenantQuery<any>('assets', 'assets');
  const { data: allLocations = [] } = useTenantQuery<any>('locations', 'locations');

  const { data: solicitantes = [] } = useQuery({
    queryKey: ['solicitantes', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const { data, error } = await supabase
        .from('user_memberships')
        .select('user_id, role, profiles!user_memberships_user_id_profiles_fkey(name, email)')
        .eq('tenant_id', currentTenantId)
        .eq('is_active', true)
        .eq('role', 'solicitante');
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!currentTenantId,
  });

  const canAssign = currentRole && !['analista', 'solicitante', 'leitura'].includes(currentRole);

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const { data, error } = await supabase
        .from('user_memberships')
        .select('user_id, role, profiles!user_memberships_user_id_profiles_fkey(name, email)')
        .eq('tenant_id', currentTenantId)
        .eq('is_active', true)
        .in('role', ['tecnico', 'analista', 'coordenador', 'admin', 'super_admin']);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!currentTenantId && !!canAssign,
  });

  const filteredLocations = useMemo(() => unitId ? allLocations.filter((l: any) => l.unit_id === unitId) : allLocations, [allLocations, unitId]);
  const filteredAssets = useMemo(() => {
    const filtered = unitId ? assets.filter((a: any) => a.unit_id === unitId) : assets;
    return [...filtered].sort((a: any, b: any) => {
      if (a.status === 'ativo' && b.status !== 'ativo') return -1;
      if (a.status !== 'ativo' && b.status === 'ativo') return 1;
      return 0;
    });
  }, [assets, unitId]);

  useEffect(() => {
    if (requesterId) {
      const solicitante = solicitantes.find((s: any) => s.user_id === requesterId);
      if (solicitante) {
        setContactEmail(solicitante.profiles?.email || '');
        setContactPhone('');
      }
    } else {
      setContactEmail(profile?.email || '');
      setContactPhone('');
    }
  }, [requesterId, solicitantes, profile?.email]);

  useEffect(() => {
    setLocationId('');
    setAssetId('');
  }, [unitId]);

  const insertMutation = useTenantInsert('work_orders', ['work_orders']);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) setTags(prev => [...prev, trimmed]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));
  const isValid = title.trim().length >= 3;

  const selectedCategory = categories.find((c: any) => c.id === categoryId);
  const selectedUnit = units.find((u: any) => u.id === unitId);
  const selectedLocation = allLocations.find((l: any) => l.id === locationId);
  const selectedAsset = assets.find((a: any) => a.id === assetId);
  const selectedTechnician = technicians.find((t: any) => t.user_id === assignedToId);
  const selectedRequester = solicitantes.find((s: any) => s.user_id === requesterId);

  const completionSteps = [!!title.trim(), !!priority, !!categoryId, !!unitId, !!(requesterId || user?.id)].filter(Boolean).length;
  const completionPercent = Math.round((completionSteps / 5) * 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!isValid) {
      toast({ title: 'Preencha os campos obrigatórios', description: 'O título deve ter pelo menos 3 caracteres.', variant: 'destructive' });
      return;
    }
    try {
      const requesterContact: Record<string, string> = {};
      if (contactPhone) requesterContact.phone = contactPhone;
      if (contactEmail) requesterContact.email = contactEmail;
      const effectiveRequesterUserId = requesterId || user?.id || null;

      const result = await insertMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        category_id: categoryId || null,
        unit_id: unitId || null,
        location_id: locationId || null,
        asset_id: assetId || null,
        assigned_to_id: assignedToId || null,
        requester_id: null,
        requester_user_id: effectiveRequesterUserId,
        visibility,
        tags: tags.length > 0 ? tags : null,
        code: '',
        external_link: externalLink.trim() || null,
        deadline_at: deadlineAt ? new Date(deadlineAt).toISOString() : null,
        requester_contact: Object.keys(requesterContact).length > 0 ? requesterContact : null,
      });

      await logAudit({ entity: 'work_order', entityId: result?.id, action: 'work_order.created', tenantId: currentTenantId, diff: { title, priority, category_id: categoryId || null } });

      if (result?.id && pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          try {
            const ext = file.name.split('.').pop();
            const storagePath = `${currentTenantId}/${result.id}/${crypto.randomUUID()}.${ext}`;
            const { error: uploadError } = await supabase.storage.from('work-order-attachments').upload(storagePath, file);
            if (uploadError) throw uploadError;
            const { data: signedData } = await supabase.storage.from('work-order-attachments').createSignedUrl(storagePath, 3600);
            await supabase.from('work_order_attachments').insert({
              tenant_id: currentTenantId!, work_order_id: result.id, file_name: file.name, mime_type: file.type, size: file.size, storage_key: storagePath, url: signedData?.signedUrl || '', uploaded_by: user?.id || null,
            });
          } catch (err) {
            console.error('Erro ao enviar anexo:', err);
          }
        }
      }

      if (result?.id && categoryId) {
        try {
          const { data: templates } = await supabase.from('checklist_templates').select('items').eq('tenant_id', currentTenantId!).eq('category_id', categoryId);
          if (templates && templates.length > 0) {
            const items = (templates[0].items as any[]) || [];
            if (items.length > 0) {
              const checklistRows = items.map((label: any, idx: number) => ({
                tenant_id: currentTenantId!, work_order_id: result.id, label: typeof label === 'string' ? label : label.label || label.text || String(label), sort_order: idx, is_checked: false,
              }));
              await supabase.from('work_order_checklist_items').insert(checklistRows as any);
            }
          }
        } catch (err) {
          console.error('Erro ao aplicar checklist:', err);
        }
      }

      toast({ title: 'OS criada com sucesso!' });
      navigate('/os');
    } catch (err: any) {
      toast({ title: 'Erro ao criar OS', description: err.message, variant: 'destructive' });
    }
  };

  const clearableSelect = (value: string, onChange: (v: string) => void, placeholder: string, children: React.ReactNode, disabled?: boolean) => (
    <div className="relative">
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-10 text-sm"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
      {value && !disabled && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); }} className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Limpar seleção">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pb-8 pt-2 lg:px-6">
      <WorkOrderCreateHeader completionPercent={completionPercent} onBack={() => navigate(-1)} />

      {memberships.length > 1 && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 shadow-sm">
          <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary"><Building2 className="h-4 w-4" /></div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Departamento de destino</p>
                <p className="text-sm font-semibold text-foreground">{memberships.find((m) => m.tenant_id === currentTenantId)?.tenant_name || 'Selecione'}</p>
              </div>
            </div>
            <Select value={currentTenantId || ''} onValueChange={(val) => { switchTenant(val); setUnitId(''); setLocationId(''); setAssetId(''); setCategoryId(''); setAssignedToId(''); setRequesterId(''); }}>
              <SelectTrigger className="h-10 w-full text-sm lg:w-[260px]"><SelectValue placeholder="Trocar departamento" /></SelectTrigger>
              <SelectContent>
                {memberships.map((m) => <SelectItem key={m.tenant_id} value={m.tenant_id}>{m.tenant_name || m.tenant_slug || m.tenant_id.slice(0, 8)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <WorkOrderCreateSection icon={FileText} title="Abertura da solicitação" description="Defina o motivo da OS e o contexto principal do atendimento.">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-medium">Título *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex: Ar-condicionado não liga na sala 302" className={`h-10 ${submitted && title.trim().length < 3 ? 'border-destructive ring-1 ring-destructive/30' : ''}`} />
                {submitted && title.trim().length < 3 && <p className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3" /> O título deve ter pelo menos 3 caracteres.</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-medium">Descrição</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Descreva sintomas, contexto, impacto e qualquer detalhe que acelere o atendimento..." className="text-sm" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5"><Label className="text-xs font-medium">Prioridade</Label><Select value={priority} onValueChange={setPriority}><SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="baixa">🟢 Baixa</SelectItem><SelectItem value="media">🔵 Média</SelectItem><SelectItem value="alta">🟠 Alta</SelectItem><SelectItem value="critica">🔴 Crítica</SelectItem></SelectContent></Select></div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Categoria</Label>{clearableSelect(categoryId, setCategoryId, 'Selecione a categoria', categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Visibilidade</Label><Select value={visibility} onValueChange={setVisibility}><SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="internal"><span className="flex items-center gap-1.5"><Eye className="h-3 w-3" /> Interno</span></SelectItem><SelectItem value="customer"><span className="flex items-center gap-1.5"><Eye className="h-3 w-3" /> Cliente</span></SelectItem></SelectContent></Select></div>
              </div>
            </WorkOrderCreateSection>

            <WorkOrderCreateSection icon={MapPin} title="Contexto operacional" description="Localize onde o serviço será executado e vincule o ativo, se houver.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label className="text-xs font-medium">Unidade (Prédio / Campus)</Label>{clearableSelect(unitId, setUnitId, 'Ex: Bloco A, Sede, Filial Centro', units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}</div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Sala / Espaço</Label>{clearableSelect(locationId, setLocationId, !unitId ? 'Selecione a unidade primeiro' : filteredLocations.length === 0 ? 'Nenhum local cadastrado' : 'Ex: Sala 101, Pátio, Recepção', filteredLocations.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}{l.description ? ` — ${l.description}` : ''}</SelectItem>), !unitId || filteredLocations.length === 0)}</div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs font-medium">Equipamento / Ativo vinculado</Label>{clearableSelect(assetId, setAssetId, filteredAssets.length === 0 ? (unitId ? 'Nenhum ativo nesta unidade' : 'Selecione a unidade primeiro') : 'Ex: Ar-condicionado Sala 201, Impressora HP', filteredAssets.map((a: any) => <SelectItem key={a.id} value={a.id} disabled={a.status !== 'ativo'}>{a.name}{a.patrimony_code ? ` — Pat. ${a.patrimony_code}` : ''}{a.serial_number ? ` (S/N: ${a.serial_number})` : ''}</SelectItem>), filteredAssets.length === 0)}<p className="text-[11px] text-muted-foreground">Opcional. Vincule um equipamento para rastrear manutenções por ativo.</p></div>
            </WorkOrderCreateSection>

            <WorkOrderCreateSection icon={User} title="Pessoas e execução" description="Defina quem solicita, quem atende e dados de contato para retorno.">
              <div className={`grid grid-cols-1 gap-4 ${canAssign ? 'sm:grid-cols-2' : ''}`}>
                {canAssign && <div className="space-y-1.5"><Label className="flex items-center gap-1.5 text-xs font-medium"><Wrench className="h-3 w-3" /> Responsável técnico</Label>{clearableSelect(assignedToId, setAssignedToId, 'Não atribuído', technicians.map((t: any) => <SelectItem key={t.user_id} value={t.user_id}>{t.profiles?.name || t.profiles?.email}</SelectItem>))}</div>}
                <div className="space-y-1.5"><Label className="text-xs font-medium">Solicitante</Label>{clearableSelect(requesterId, setRequesterId, 'Nenhum (você será o solicitante)', solicitantes.map((s: any) => <SelectItem key={s.user_id} value={s.user_id}>{s.profiles?.name || s.profiles?.email}</SelectItem>))}</div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label className="flex items-center gap-1.5 text-xs font-medium"><Mail className="h-3 w-3" /> E-mail</Label><Input value={contactEmail} readOnly disabled type="email" className="h-10 cursor-not-allowed bg-muted text-sm text-muted-foreground" /></div>
                <div className="space-y-1.5"><Label className="flex items-center gap-1.5 text-xs font-medium"><Phone className="h-3 w-3" /> Telefone / Ramal</Label><Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Ex: (11) 99999-0000 ou ramal 302" className="h-10 text-sm" /></div>
              </div>
            </WorkOrderCreateSection>

            <WorkOrderCreateSection icon={Settings2} title="Complementos da OS" description="Informações adicionais que ajudam no atendimento e no rastreio.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="externalLink" className="flex items-center gap-1.5 text-xs font-medium"><Link className="h-3 w-3" /> Link externo</Label><Input id="externalLink" value={externalLink} onChange={(e) => setExternalLink(e.target.value)} type="url" placeholder="https://exemplo.com/documento" className="h-10 text-sm" /></div>
                <div className="space-y-1.5"><Label htmlFor="deadlineAt" className="flex items-center gap-1.5 text-xs font-medium"><Calendar className="h-3 w-3" /> Prazo estimado</Label><Input id="deadlineAt" value={deadlineAt} onChange={(e) => setDeadlineAt(e.target.value)} type="datetime-local" className="h-10 text-sm" /></div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div><Label className="flex items-center gap-2 text-xs font-medium"><Paperclip className="h-3.5 w-3.5" /> Anexos</Label><p className="mt-1 text-[11px] text-muted-foreground">Limite: 10 MB por arquivo (PNG, JPG, PDF, Word, Excel)</p></div>
                <label><input type="file" multiple accept="image/png,image/jpeg,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleFilesSelected} /><Button type="button" variant="outline" className="h-10" asChild><span className="cursor-pointer"><Upload className="mr-2 h-4 w-4" /> Selecionar arquivos</span></Button></label>
                {pendingFiles.length > 0 && <div className="space-y-2">{pendingFiles.map((file, idx) => <div key={idx} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2 text-sm"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="flex-1 truncate">{file.name}</span><span className="text-xs text-muted-foreground">{formatSize(file.size)}</span><Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removePendingFile(idx)}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div>}
              </div>
              <Separator />
              <div className="space-y-3">
                <div><Label className="flex items-center gap-2 text-xs font-medium"><Tag className="h-3.5 w-3.5" /> Tags</Label><p className="mt-1 text-[11px] text-muted-foreground">Classifique a OS com etiquetas rápidas para facilitar buscas e relatórios.</p></div>
                <div className="flex gap-2"><Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="Digite uma tag e pressione Enter" className="h-10 flex-1 text-sm" /><Button type="button" variant="outline" className="h-10" onClick={addTag}><Plus className="h-4 w-4" /></Button></div>
                {tags.length > 0 && <div className="flex flex-wrap gap-2">{tags.map((tag) => <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-xs">{tag}<button type="button" onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button></Badge>)}</div>}
              </div>
            </WorkOrderCreateSection>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" className="h-10" onClick={() => navigate(-1)}>Cancelar</Button>
              <Button type="submit" className="h-10" disabled={insertMutation.isPending}>{insertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar ordem de serviço</Button>
            </div>
          </div>

          <WorkOrderCreateSidebar
            title={title.trim() || 'Ainda não informado'}
            priorityLabel={priorityLabel(priority)}
            categoryName={selectedCategory?.name || 'Não selecionada'}
            unitName={selectedUnit?.name || 'Não selecionada'}
            locationName={selectedLocation ? `${selectedLocation.name}${selectedLocation.description ? ` — ${selectedLocation.description}` : ''}` : 'Não selecionado'}
            assetName={selectedAsset?.name || 'Não vinculado'}
            requesterName={selectedRequester?.profiles?.name || profile?.name || profile?.email || 'Não definido'}
            technicianName={selectedTechnician?.profiles?.name || 'Não atribuído'}
            visibilityLabel={visibility === 'internal' ? 'Interno' : 'Cliente'}
            deadlineLabel={deadlineAt ? new Date(deadlineAt).toLocaleString('pt-BR') : 'Não definido'}
            attachmentCount={pendingFiles.length}
            tagCount={tags.length}
            qualityChecks={[
              { ok: !!title.trim(), text: 'Título preenchido' },
              { ok: !!categoryId, text: 'Categoria definida' },
              { ok: !!unitId, text: 'Unidade informada' },
              { ok: !!description.trim(), text: 'Descrição adicionada' },
              { ok: pendingFiles.length > 0, text: 'Anexo incluído' },
              { ok: !!assignedToId, text: 'Responsável atribuído' },
            ]}
          />
        </div>
      </form>
    </div>
  );
}
