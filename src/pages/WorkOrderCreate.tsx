import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantQuery, useTenantInsert } from '@/hooks/useTenantQuery';
import { logAudit } from '@/lib/audit';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Mail, Phone } from 'lucide-react';

export default function WorkOrderCreate() {
  const { currentTenantId, user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('media');
  const [categoryId, setCategoryId] = useState<string>('');
  const [unitId, setUnitId] = useState<string>('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Auto-fill email from profile
  useEffect(() => {
    if (profile?.email && !contactEmail) {
      setContactEmail(profile.email);
    }
  }, [profile?.email]);

  const { data: categories = [] } = useTenantQuery<any>('categories', 'categories');
  const { data: units = [] } = useTenantQuery<any>('units', 'units');
  const insertMutation = useTenantInsert('work_orders', ['work_orders']);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const requesterContact: Record<string, string> = {};
      if (contactPhone) requesterContact.phone = contactPhone;
      if (contactEmail) requesterContact.email = contactEmail;

      const result = await insertMutation.mutateAsync({
        title,
        description,
        priority,
        category_id: categoryId || null,
        unit_id: unitId || null,
        code: '',
        requester_user_id: user?.id || null,
        requester_contact: Object.keys(requesterContact).length > 0 ? requesterContact : null,
      });
      await logAudit({
        entity: 'work_order',
        entityId: result?.id,
        action: 'work_order.created',
        tenantId: currentTenantId,
        diff: { title, priority, category_id: categoryId || null },
      });
      toast({ title: 'OS criada com sucesso!' });
      navigate('/os');
    } catch (err: any) {
      toast({ title: 'Erro ao criar OS', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Nova Ordem de Serviço</h1>
          <p className="text-xs text-muted-foreground">Preencha os campos abaixo para registrar uma nova OS.</p>
        </div>
      </div>

      <Card className="border-border shadow-none">
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-medium">Título *</Label>
              <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Descreva o problema brevemente" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-medium">Descrição</Label>
              <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Detalhes adicionais sobre o serviço..." className="text-sm" />
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Unidade</Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {units.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Contact info */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Contato do Solicitante</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <Separator />

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => navigate(-1)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={insertMutation.isPending}>
                {insertMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Criar OS
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
