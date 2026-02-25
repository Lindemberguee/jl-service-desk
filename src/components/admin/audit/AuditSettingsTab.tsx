import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { logAudit } from '@/lib/audit';
import { entityLabels } from './AuditConstants';
import { Trash2, Save, ScrollText, AlertTriangle } from 'lucide-react';

const ALL_ENTITIES = Object.keys(entityLabels);

export default function AuditSettingsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [confirmPurgeAll, setConfirmPurgeAll] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['audit_settings'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('audit_settings') as any)
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();
      if (error) throw error;
      return data as { id: string; retention_days: number; enabled_entities: string[]; updated_at: string };
    },
  });

  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [enabledEntities, setEnabledEntities] = useState<string[] | null>(null);

  const currentRetention = retentionDays ?? settings?.retention_days ?? 90;
  const currentEntities = enabledEntities ?? settings?.enabled_entities ?? ALL_ENTITIES;

  const hasChanges = (retentionDays !== null && retentionDays !== settings?.retention_days) ||
    (enabledEntities !== null && JSON.stringify(enabledEntities.sort()) !== JSON.stringify((settings?.enabled_entities || []).sort()));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('audit_settings') as any)
        .update({ retention_days: currentRetention, enabled_entities: currentEntities, updated_at: new Date().toISOString() })
        .eq('id', '00000000-0000-0000-0000-000000000001');
      if (error) throw error;
    },
    onSuccess: async () => {
      await logAudit({ entity: 'audit_settings', action: 'audit_settings.updated', diff: { retention_days: currentRetention, enabled_entities: currentEntities } });
      qc.invalidateQueries({ queryKey: ['audit_settings'] });
      setRetentionDays(null);
      setEnabledEntities(null);
      toast({ title: 'Configurações de auditoria salvas!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const invalidateAuditQueries = () => {
    qc.invalidateQueries({ queryKey: ['admin_audit_logs_paginated'] });
    qc.invalidateQueries({ queryKey: ['admin_audit_logs_chart'] });
  };

  const purgeMutation = useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke('purge-audit-logs', { body: { source: 'manual' } });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (data: any) => {
      toast({ title: 'Limpeza concluída', description: `${data?.purged || 0} registros removidos.` });
      invalidateAuditQueries();
      setConfirmPurge(false);
    },
    onError: (err: any) => { toast({ title: 'Erro', description: err.message, variant: 'destructive' }); setConfirmPurge(false); },
  });

  const purgeAllMutation = useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke('purge-audit-logs', { body: { purge_all: true } });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (data: any) => {
      toast({ title: 'Todos os logs removidos', description: `${data?.purged || 0} registros excluídos.` });
      invalidateAuditQueries();
      setConfirmPurgeAll(false);
    },
    onError: (err: any) => { toast({ title: 'Erro', description: err.message, variant: 'destructive' }); setConfirmPurgeAll(false); },
  });

  const toggleEntity = (entity: string) => {
    const current = [...currentEntities];
    const idx = current.indexOf(entity);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(entity);
    setEnabledEntities(current);
  };

  if (isLoading) return <Skeleton className="h-[300px] w-full" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Trash2 className="h-4 w-4 text-muted-foreground" />Retenção de Logs</CardTitle>
          <CardDescription className="text-xs">Logs mais antigos que o período configurado serão excluídos automaticamente todas as noites às 3h.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm whitespace-nowrap">Manter logs por</Label>
            <Input type="number" min={7} max={365} value={currentRetention} onChange={e => setRetentionDays(Number(e.target.value))} className="w-24" />
            <span className="text-sm text-muted-foreground">dias</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setConfirmPurge(true)} disabled={purgeMutation.isPending}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {purgeMutation.isPending ? 'Limpando...' : 'Limpar antigos'}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setConfirmPurgeAll(true)} disabled={purgeAllMutation.isPending}>
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              {purgeAllMutation.isPending ? 'Excluindo...' : 'Excluir todos os logs'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><ScrollText className="h-4 w-4 text-muted-foreground" />Módulos Auditados</CardTitle>
          <CardDescription className="text-xs">Selecione quais módulos devem gerar logs de auditoria.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ALL_ENTITIES.map(entity => (
              <div key={entity} className="flex items-center justify-between border rounded-lg p-3">
                <Label className="text-sm">{entityLabels[entity] || entity}</Label>
                <Switch checked={currentEntities.includes(entity)} onCheckedChange={() => toggleEntity(entity)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1.5" />{saveMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      )}

      {/* Confirm purge old */}
      <AlertDialog open={confirmPurge} onOpenChange={setConfirmPurge}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar logs antigos?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá permanentemente todos os logs de auditoria com mais de <strong>{currentRetention} dias</strong>. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => purgeMutation.mutate()} disabled={purgeMutation.isPending}>
              {purgeMutation.isPending ? 'Limpando...' : 'Confirmar limpeza'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm purge ALL */}
      <AlertDialog open={confirmPurgeAll} onOpenChange={setConfirmPurgeAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Excluir TODOS os logs?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá <strong>permanentemente todos os registros de auditoria</strong> do sistema. Não será possível recuperar esses dados. Tem certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => purgeAllMutation.mutate()} disabled={purgeAllMutation.isPending}>
              {purgeAllMutation.isPending ? 'Excluindo...' : 'Sim, excluir tudo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
