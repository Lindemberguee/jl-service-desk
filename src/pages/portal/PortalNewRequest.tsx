import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Send } from 'lucide-react';

export default function PortalNewRequest() {
  const { currentTenantId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('media');
  const [categoryId, setCategoryId] = useState('');
  const [unitId, setUnitId] = useState('');

  const { data: categories = [] } = useTenantQuery<any>('categories', 'categories');
  const { data: units = [] } = useTenantQuery<any>('units', 'units');
  const insertMutation = useTenantInsert('work_orders', ['work_orders', 'portal_work_orders']);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await insertMutation.mutateAsync({
        title,
        description,
        priority,
        category_id: categoryId || null,
        unit_id: unitId || null,
        code: '',
        visibility: 'customer',
      });
      await logAudit({
        entity: 'work_order',
        entityId: result?.id,
        action: 'work_order.created',
        tenantId: currentTenantId,
        diff: { title, priority, source: 'portal' },
      });
      toast({ title: 'Solicitação criada com sucesso!' });
      navigate('/portal');
    } catch (err: any) {
      toast({ title: 'Erro ao criar solicitação', description: err.message, variant: 'destructive' });
    }
  };

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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-medium">O que precisa ser feito? *</Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="Ex: Ar-condicionado não liga na sala 302"
                className="h-10"
              />
            </div>

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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Urgência</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa - Pode esperar</SelectItem>
                    <SelectItem value="media">Média - Normal</SelectItem>
                    <SelectItem value="alta">Alta - Urgente</SelectItem>
                    <SelectItem value="critica">Crítica - Emergência</SelectItem>
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
                  <Label className="text-xs font-medium">Unidade / Local</Label>
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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => navigate('/portal')}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="gap-1.5" disabled={!title.trim() || insertMutation.isPending}>
                {insertMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Enviar Solicitação
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}