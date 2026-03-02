import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantQuery, useTenantInsert } from '@/hooks/useTenantQuery';
import { logAudit } from '@/lib/audit';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Loader2, Mail, Phone, FileText, Settings2,
  MapPin, Wrench, User, Eye, Tag, X, Plus, AlertCircle, Link,
  Paperclip, Upload, Trash2
} from 'lucide-react';

export default function WorkOrderCreate() {
  const { currentTenantId, user, profile, currentRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Basic fields
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

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Auto-fill email from profile (only if no requester selected)
  useEffect(() => {
    if (!requesterId && profile?.email && !contactEmail) {
      setContactEmail(profile.email);
    }
  }, [profile?.email]);

  // Data queries
  const { data: categories = [] } = useTenantQuery<any>('categories', 'categories');
  const { data: units = [] } = useTenantQuery<any>('units', 'units');
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
  const { data: assets = [] } = useTenantQuery<any>('assets', 'assets');

  // Locations filtered by selected unit
  const { data: allLocations = [] } = useTenantQuery<any>('locations', 'locations');
  const filteredLocations = useMemo(
    () => unitId ? allLocations.filter((l: any) => l.unit_id === unitId) : allLocations,
    [allLocations, unitId]
  );

  // Assets filtered by selected unit
  const filteredAssets = useMemo(
    () => unitId ? assets.filter((a: any) => a.unit_id === unitId) : assets,
    [assets, unitId]
  );

  // Technicians for assignment (analista cannot assign)
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

  // Auto-fill contact info when a requester is selected
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
  }, [requesterId, solicitantes]);

  // Reset location/asset when unit changes
  useEffect(() => {
    setLocationId('');
    setAssetId('');
  }, [unitId]);

  const insertMutation = useTenantInsert('work_orders', ['work_orders']);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const isValid = title.trim().length >= 3;

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
        requester_contact: Object.keys(requesterContact).length > 0 ? requesterContact : null,
      });
      await logAudit({
        entity: 'work_order',
        entityId: result?.id,
        action: 'work_order.created',
        tenantId: currentTenantId,
        diff: { title, priority, category_id: categoryId || null },
      });

      // Upload pending files
      if (result?.id && pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          try {
            const ext = file.name.split('.').pop();
            const storagePath = `${currentTenantId}/${result.id}/${crypto.randomUUID()}.${ext}`;
            const { error: uploadError } = await supabase.storage
              .from('work-order-attachments')
              .upload(storagePath, file);
            if (uploadError) throw uploadError;

            const { data: signedData } = await supabase.storage
              .from('work-order-attachments')
              .createSignedUrl(storagePath, 3600);

            await supabase.from('work_order_attachments').insert({
              tenant_id: currentTenantId!,
              work_order_id: result.id,
              file_name: file.name,
              mime_type: file.type,
              size: file.size,
              storage_key: storagePath,
              url: signedData?.signedUrl || '',
              uploaded_by: user?.id || null,
            });
          } catch (err: any) {
            console.error('Erro ao enviar anexo:', err);
          }
        }
      }

      // Auto-apply checklist template based on category
      if (result?.id && categoryId) {
        try {
          const { data: templates } = await supabase
            .from('checklist_templates')
            .select('items')
            .eq('tenant_id', currentTenantId!)
            .eq('category_id', categoryId);
          if (templates && templates.length > 0) {
            const items = (templates[0].items as any[]) || [];
            if (items.length > 0) {
              const checklistRows = items.map((label: any, idx: number) => ({
                tenant_id: currentTenantId!,
                work_order_id: result.id,
                label: typeof label === 'string' ? label : label.label || label.text || String(label),
                sort_order: idx,
                is_checked: false,
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
        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
      {value && !disabled && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(''); }}
          className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Limpar seleção"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Nova Ordem de Serviço</h1>
          <p className="text-xs text-muted-foreground">Preencha os campos abaixo para registrar uma nova OS.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Informações Básicas */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-medium">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="Descreva o problema brevemente"
                className={`h-9 ${submitted && title.trim().length < 3 ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
              />
              {submitted && title.trim().length < 3 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> O título deve ter pelo menos 3 caracteres.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-medium">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="Detalhes adicionais sobre o serviço..."
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="externalLink" className="text-xs font-medium flex items-center gap-1.5">
                <Link className="h-3 w-3" /> Link Externo
              </Label>
              <Input
                id="externalLink"
                value={externalLink}
                onChange={e => setExternalLink(e.target.value)}
                type="url"
                placeholder="https://exemplo.com/documento"
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground">Opcional. Adicione um link para referência externa (documento, sistema, etc.)</p>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Classificação */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              Classificação
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">🟢 Baixa</SelectItem>
                    <SelectItem value="media">🔵 Média</SelectItem>
                    <SelectItem value="alta">🟠 Alta</SelectItem>
                    <SelectItem value="critica">🔴 Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Categoria</Label>
                {clearableSelect(categoryId, setCategoryId, 'Selecione',
                  categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Visibilidade</Label>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">
                      <span className="flex items-center gap-1.5"><Eye className="h-3 w-3" /> Interno</span>
                    </SelectItem>
                    <SelectItem value="customer">
                      <span className="flex items-center gap-1.5"><Eye className="h-3 w-3" /> Cliente</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Localização & Ativo */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Localização & Ativo
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Selecione a unidade (prédio/campus) e depois o espaço específico onde o serviço será realizado.
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Unidade (Prédio / Campus)</Label>
                {clearableSelect(unitId, setUnitId, 'Ex: Bloco A, Sede, Filial Centro',
                  units.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Sala / Espaço</Label>
                {clearableSelect(
                  locationId, setLocationId,
                  !unitId ? 'Selecione a unidade primeiro' : filteredLocations.length === 0 ? 'Nenhum local cadastrado' : 'Ex: Sala 101, Pátio, Recepção',
                  filteredLocations.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}{l.description ? ` — ${l.description}` : ''}
                    </SelectItem>
                  )),
                  !unitId || filteredLocations.length === 0
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Equipamento / Ativo vinculado</Label>
              {clearableSelect(
                assetId, setAssetId,
                filteredAssets.length === 0 ? (unitId ? 'Nenhum ativo nesta unidade' : 'Selecione a unidade primeiro') : 'Ex: Ar-condicionado Sala 201, Impressora HP',
                filteredAssets.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}{a.patrimony_code ? ` — Pat. ${a.patrimony_code}` : ''}{a.serial_number ? ` (S/N: ${a.serial_number})` : ''}
                  </SelectItem>
                )),
                filteredAssets.length === 0
              )}
              <p className="text-[11px] text-muted-foreground">Opcional. Vincule um equipamento para rastrear manutenções por ativo.</p>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Atribuição & Solicitante */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Atribuição & Solicitante
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div className={`grid grid-cols-1 ${canAssign ? 'sm:grid-cols-2' : ''} gap-4`}>
              {canAssign && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Wrench className="h-3 w-3" /> Responsável Técnico
                  </Label>
                  {clearableSelect(assignedToId, setAssignedToId, 'Não atribuído',
                    technicians.map((t: any) => (
                      <SelectItem key={t.user_id} value={t.user_id}>
                        {t.profiles?.name || t.profiles?.email}
                      </SelectItem>
                    ))
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Solicitante</Label>
                {clearableSelect(requesterId, setRequesterId, 'Nenhum (você será o solicitante)',
                  solicitantes.map((s: any) => (
                    <SelectItem key={s.user_id} value={s.user_id}>
                      {s.profiles?.name || s.profiles?.email}
                    </SelectItem>
                  ))
                )}
              </div>
            </div>

            <Separator />

            {/* Contact info */}
            <p className="text-xs font-medium text-muted-foreground">Contato do Solicitante</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> E-mail
                </Label>
                <Input
                  value={contactEmail}
                  readOnly
                  disabled
                  type="email"
                  className="h-9 text-sm bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> Telefone / Ramal
                </Label>
                <Input
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="Ex: (11) 99999-0000 ou ramal 302"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Anexos */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-primary" />
              Anexos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            <label>
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={handleFilesSelected}
              />
              <Button type="button" size="sm" variant="outline" asChild>
                <span className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-1" />
                  Selecionar Arquivos
                </span>
              </Button>
            </label>
            <p className="text-[10px] text-muted-foreground">Limite: 10 MB por arquivo (PNG, JPG, PDF, Word, Excel)</p>
            {pendingFiles.length > 0 && (
              <div className="space-y-1.5">
                {pendingFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border bg-card text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removePendingFile(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 6: Tags */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Digite uma tag e pressione Enter"
                className="h-9 text-sm flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag} className="h-9">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2 pb-4">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={insertMutation.isPending}>
            {insertMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Criar Ordem de Serviço
          </Button>
        </div>
      </form>
    </div>
  );
}
