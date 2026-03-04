import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Send, Paperclip, X, Eye, ChevronLeft, CheckCircle, Building2, Link } from 'lucide-react';
import { priorityLabels } from '@/lib/permissions';

type Step = 'form' | 'preview' | 'success';

export default function PortalNewRequest() {
  const { memberships, user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('form');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('media');
  const [categoryId, setCategoryId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [assetId, setAssetId] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-select if only one membership
  useEffect(() => {
    if (memberships.length === 1 && !selectedTenantId) {
      setSelectedTenantId(memberships[0].tenant_id);
    }
  }, [memberships, selectedTenantId]);

  // Reset category/unit/location/asset when department changes
  useEffect(() => {
    setCategoryId('');
    setUnitId('');
    setLocationId('');
    setAssetId('');
  }, [selectedTenantId]);

  // Reset location/asset when unit changes
  useEffect(() => {
    setLocationId('');
    setAssetId('');
  }, [unitId]);

  // Auto-fill email from profile
  useEffect(() => {
    if (profile?.email && !contactEmail) {
      setContactEmail(profile.email);
    }
  }, [profile?.email]);

  // Load categories for selected department
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return [];
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', selectedTenantId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedTenantId,
  });

  // Load units for selected department
  const { data: units = [] } = useQuery({
    queryKey: ['units', selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return [];
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('tenant_id', selectedTenantId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedTenantId,
  });
  // Load locations for selected department
  const { data: allLocations = [] } = useQuery({
    queryKey: ['locations', selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return [];
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('tenant_id', selectedTenantId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedTenantId,
  });

  // Load assets for selected department
  const { data: assets = [] } = useQuery({
    queryKey: ['assets', selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return [];
      const { data, error } = await supabase
        .from('assets')
        .select('id, name, patrimony_code, serial_number, unit_id, status')
        .eq('tenant_id', selectedTenantId)
        .eq('status', 'ativo')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedTenantId,
  });

  const filteredLocations = useMemo(
    () => unitId ? allLocations.filter((l: any) => l.unit_id === unitId) : allLocations,
    [allLocations, unitId]
  );

  const filteredAssets = useMemo(
    () => unitId ? assets.filter((a: any) => a.unit_id === unitId) : assets,
    [assets, unitId]
  );

  const insertMutation = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data, error } = await (supabase.from as any)('work_orders')
        .insert({ ...values, tenant_id: selectedTenantId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal_work_orders'] });
      qc.invalidateQueries({ queryKey: ['work_orders'] });
    },
  });

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const MAX_SIZE = 10 * 1024 * 1024;
      const newFiles = Array.from(e.target.files).filter(f => {
        if (!isFileAllowed(f)) {
          toast({ title: 'Tipo não permitido', description: `${f.name}: apenas imagens (PNG/JPG), PDF, Word e Excel.`, variant: 'destructive' });
          return false;
        }
        if (f.size > MAX_SIZE) {
          toast({ title: 'Arquivo muito grande', description: `${f.name} excede o limite de 10 MB.`, variant: 'destructive' });
          return false;
        }
        return true;
      });
      setFiles(prev => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const getCategoryName = (id: string) => categories.find((c: any) => c.id === id)?.name || '';
  const getUnitName = (id: string) => units.find((u: any) => u.id === id)?.name || '';
  const getLocationName = (id: string) => {
    const l = allLocations.find((loc: any) => loc.id === id);
    if (!l) return '';
    return `${l.name}${l.description ? ` — ${l.description}` : ''}`;
  };
  const getAssetName = (id: string) => {
    const a = assets.find((asset: any) => asset.id === id);
    if (!a) return '';
    return `${a.name}${a.patrimony_code ? ` — Pat. ${a.patrimony_code}` : ''}`;
  };
  const getDeptName = (id: string) => memberships.find(m => m.tenant_id === id)?.tenant_name || '';

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const requesterContact: Record<string, string> = {};
      if (contactPhone) requesterContact.phone = contactPhone;
      if (contactEmail) requesterContact.email = contactEmail;
      if (preferredTime) requesterContact.preferred_time = preferredTime;

      const result = await insertMutation.mutateAsync({
        title,
        description,
        priority,
        category_id: categoryId || null,
        unit_id: unitId || null,
        location_id: locationId || null,
        asset_id: assetId || null,
        code: '',
        visibility: 'customer',
        requester_user_id: user?.id || null,
        external_link: externalLink.trim() || null,
        requester_contact: Object.keys(requesterContact).length > 0 ? requesterContact : null,
      });

      // Upload attachments
      if (files.length > 0 && result?.id) {
        for (const file of files) {
          const path = `${selectedTenantId}/${result.id}/${Date.now()}_${file.name}`;
          const { error: uploadErr } = await supabase.storage
            .from('work-order-attachments')
            .upload(path, file);
          if (!uploadErr) {
            await supabase.from('work_order_attachments').insert({
              tenant_id: selectedTenantId,
              work_order_id: result.id,
              file_name: file.name,
              storage_key: path,
              mime_type: file.type,
              size: file.size,
              uploaded_by: user?.id,
            });
          }
        }
      }

      await logAudit({
        entity: 'work_order',
        entityId: result?.id,
        action: 'work_order.created',
        tenantId: selectedTenantId,
        diff: { title, priority, department: getDeptName(selectedTenantId), source: 'portal' },
      });

      setCreatedCode(result?.code || '');
      setStep('success');
    } catch (err: any) {
      toast({ title: 'Erro ao criar solicitação', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="text-center py-16 space-y-4 animate-fade-in">
        <div className="mx-auto h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold">Solicitação Criada!</h2>
        <p className="text-sm text-muted-foreground">
          Sua solicitação <span className="font-mono font-semibold text-foreground">{createdCode}</span> foi enviada para <span className="font-semibold text-foreground">{getDeptName(selectedTenantId)}</span>.
        </p>
        <p className="text-xs text-muted-foreground">Você receberá atualizações sobre o andamento.</p>
        <div className="flex gap-2 justify-center pt-4">
          <Button variant="outline" onClick={() => navigate('/portal')}>Ver Minhas OS</Button>
          <Button onClick={() => { setStep('form'); setTitle(''); setDescription(''); setPriority('media'); setCategoryId(''); setUnitId(''); setLocationId(''); setAssetId(''); setFiles([]); setExternalLink(''); setContactPhone(''); setContactEmail(profile?.email || ''); setPreferredTime(''); }}>
            Abrir Outra
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep('form')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Confirmar Solicitação</h1>
            <p className="text-xs text-muted-foreground">Revise antes de enviar.</p>
          </div>
        </div>

        <Card className="border-border shadow-none">
          <CardContent className="pt-5 space-y-3">
            <div>
              <p className="text-[11px] uppercase font-medium text-muted-foreground">Departamento</p>
              <Badge variant="outline" className="text-xs gap-1.5">
                <Building2 className="h-3 w-3" />
                {getDeptName(selectedTenantId)}
              </Badge>
            </div>
            <div>
              <p className="text-[11px] uppercase font-medium text-muted-foreground">Título</p>
              <p className="text-sm font-medium">{title}</p>
            </div>
            {description && (
              <div>
                <p className="text-[11px] uppercase font-medium text-muted-foreground">Descrição</p>
                <p className="text-sm whitespace-pre-wrap">{description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] uppercase font-medium text-muted-foreground">Urgência</p>
                <Badge variant="outline" className="text-xs">{priorityLabels[priority]}</Badge>
              </div>
              {categoryId && (
                <div>
                  <p className="text-[11px] uppercase font-medium text-muted-foreground">Categoria</p>
                  <p className="text-sm">{getCategoryName(categoryId)}</p>
                </div>
              )}
              {unitId && (
                <div>
                  <p className="text-[11px] uppercase font-medium text-muted-foreground">Unidade (Prédio / Campus)</p>
                  <p className="text-sm">{getUnitName(unitId)}</p>
                </div>
              )}
              {locationId && (
                <div>
                  <p className="text-[11px] uppercase font-medium text-muted-foreground">Sala / Espaço</p>
                  <p className="text-sm">{getLocationName(locationId)}</p>
                </div>
              )}
              {assetId && (
                <div>
                  <p className="text-[11px] uppercase font-medium text-muted-foreground">Equipamento</p>
                  <p className="text-sm">{getAssetName(assetId)}</p>
                </div>
              )}
              {contactEmail && (
                <div>
                  <p className="text-[11px] uppercase font-medium text-muted-foreground">E-mail</p>
                  <p className="text-sm">{contactEmail}</p>
                </div>
              )}
              {contactPhone && (
                <div>
                  <p className="text-[11px] uppercase font-medium text-muted-foreground">Telefone</p>
                  <p className="text-sm">{contactPhone}</p>
                </div>
              )}
              {preferredTime && (
                <div>
                  <p className="text-[11px] uppercase font-medium text-muted-foreground">Melhor horário</p>
                  <p className="text-sm">{preferredTime}</p>
                </div>
              )}
            </div>
            {files.length > 0 && (
              <div>
                <p className="text-[11px] uppercase font-medium text-muted-foreground mb-1">Anexos ({files.length})</p>
                {files.map((f, i) => (
                  <p key={i} className="text-xs text-muted-foreground">📎 {f.name}</p>
                ))}
              </div>
            )}
            {externalLink && (
              <div>
                <p className="text-[11px] uppercase font-medium text-muted-foreground">Link Externo</p>
                <a href={externalLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">{externalLink}</a>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setStep('form')}>Voltar e Editar</Button>
          <Button size="sm" className="gap-1.5" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Confirmar e Enviar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/portal')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Nova Solicitação</h1>
          <p className="text-xs text-muted-foreground">Descreva o problema ou necessidade de serviço.</p>
        </div>
      </div>

      <Card className="border-border shadow-none">
        <CardContent className="pt-5">
          <div className="space-y-4">
            {/* Department selector - FIRST and PROMINENT */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Para qual departamento? *
              </Label>
              {memberships.length === 1 ? (
                <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/50 border border-border">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{memberships[0].tenant_name}</span>
                </div>
              ) : (
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Selecione o departamento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {memberships.map(m => (
                      <SelectItem key={m.tenant_id} value={m.tenant_id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5" />
                          {m.tenant_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {memberships.length > 1 && (
                <p className="text-[10px] text-muted-foreground">
                  Escolha o setor responsável: TI, Manutenção, etc.
                </p>
              )}
            </div>

            {/* Only show rest of form after department is selected */}
            {selectedTenantId ? (
              <>
                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-medium">O que precisa ser feito? *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ex: Ar-condicionado não liga na sala 302"
                    className="h-10"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-medium">Detalhes adicionais</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Informe mais detalhes: quando começou, local exato, urgência..."
                    className="text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    💡 Quanto mais detalhes, mais rápido o atendimento.
                  </p>
                </div>

                {/* Priority + Category + Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Urgência</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa — Pode esperar</SelectItem>
                        <SelectItem value="media">Média — Normal</SelectItem>
                        <SelectItem value="alta">Alta — Urgente</SelectItem>
                        <SelectItem value="critica">Crítica — Emergência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {categories.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Tipo de serviço</Label>
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {units.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Unidade (Prédio / Campus)</Label>
                      <Select value={unitId} onValueChange={setUnitId}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {units.map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Location (Sala / Espaço) - shown after unit selected */}
                {unitId && filteredLocations.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Sala / Espaço</Label>
                    <Select value={locationId} onValueChange={setLocationId}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Ex: Sala 101, Pátio, Recepção" /></SelectTrigger>
                      <SelectContent>
                        {filteredLocations.map((l: any) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}{l.description ? ` — ${l.description}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Asset (Equipamento) - optional */}
                {filteredAssets.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Equipamento / Ativo (opcional)</Label>
                    <Select value={assetId} onValueChange={setAssetId}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o equipamento relacionado" /></SelectTrigger>
                      <SelectContent>
                        {filteredAssets.map((a: any) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}{a.patrimony_code ? ` — Pat. ${a.patrimony_code}` : ''}{a.serial_number ? ` (S/N: ${a.serial_number})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      💡 Vincular o equipamento ajuda a equipe técnica a identificar o problema mais rápido.
                    </p>
                  </div>
                )}


                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">E-mail</Label>
                    <Input
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      type="email"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Telefone / Ramal</Label>
                    <Input
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                      placeholder="Ex: (11) 99999-0000 ou ramal 302"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Melhor horário</Label>
                    <Input
                      value={preferredTime}
                      onChange={e => setPreferredTime(e.target.value)}
                      placeholder="Ex: Manhã, 8h-12h"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* External Link */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Link className="h-3 w-3" /> Link Externo
                  </Label>
                  <Input
                    value={externalLink}
                    onChange={e => setExternalLink(e.target.value)}
                    type="url"
                    placeholder="https://exemplo.com/documento"
                    className="h-9 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Opcional. Link para referência externa (documento, sistema, etc.)</p>
                </div>

                {/* Attachments */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Anexos (até 5 — PNG, JPG, PDF, Word, Excel)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,.pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="flex flex-wrap gap-2">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-muted rounded-md px-2 py-1">
                        <span className="text-xs truncate max-w-[120px]">{f.name}</span>
                        <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {files.length < 5 && (
                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip className="h-3 w-3" /> Anexar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => navigate('/portal')}>Cancelar</Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={!title.trim()}
                    onClick={() => setStep('preview')}
                  >
                    <Eye className="h-3.5 w-3.5" /> Revisar
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="mx-auto h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Selecione o departamento para continuar.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}