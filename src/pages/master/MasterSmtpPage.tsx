import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, Mail, Server, Send, CheckCircle2, AlertCircle, Shield,
  Plus, Pencil, Copy, Trash2, Eye, Code, FileText,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { EmailTemplateEditor } from '@/components/email/EmailTemplateEditor';
import type { EmailTemplate } from '@/components/email/EmailTemplateEditor';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
}

const DEFAULT_CONFIG: SmtpConfig = {
  host: 'smtp.hostinger.com',
  port: 465,
  user: 'mail@ordfy.com.br',
  from_email: 'mail@ordfy.com.br',
  from_name: 'Ordfy',
  use_tls: true,
};

const categoryLabels: Record<string, string> = {
  sistema: 'Sistema', onboarding: 'Onboarding', auth: 'Autenticação',
  lifecycle: 'Ciclo de Vida', notificacao: 'Notificação',
};
const categoryColors: Record<string, string> = {
  sistema: 'bg-muted text-muted-foreground',
  onboarding: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  auth: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  lifecycle: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  notificacao: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
};

export default function MasterSmtpPage() {
  const [config, setConfig] = useState<SmtpConfig>(DEFAULT_CONFIG);
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [isNewTemplate, setIsNewTemplate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [testingTemplate, setTestingTemplate] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
    loadTemplates();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('platform-email', {
        body: { action: 'get_config' },
      });
      if (error) throw error;
      if (data?.config) setConfig(prev => ({ ...prev, ...data.config }));
      setHasPassword(data?.has_password || false);
    } catch (err: any) {
      console.error('Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_email_templates' as any)
        .select('*')
        .order('category')
        .order('name');
      if (error) throw error;
      setTemplates((data || []) as any);
    } catch (err: any) {
      console.error('Failed to load templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('platform-email', {
        body: { action: 'save_config', ...config },
      });
      if (error) throw error;
      toast.success('Configuração SMTP salva com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) { toast.error('Informe um e-mail'); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('platform-email', {
        body: { action: 'test_email', to_email: testEmail },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTestResult({ success: true, message: data.message || 'Enviado!' });
      toast.success('E-mail de teste enviado!');
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
      toast.error(`Falha: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveTemplate = async (data: Partial<EmailTemplate>) => {
    try {
      if (data.id) {
        const { error } = await supabase
          .from('platform_email_templates' as any)
          .update({
            name: data.name, slug: data.slug, subject: data.subject,
            html_body: data.html_body, description: data.description,
            category: data.category, is_active: data.is_active,
            variables: data.variables as any, updated_at: new Date().toISOString(),
          } as any)
          .eq('id', data.id);
        if (error) throw error;
        toast.success('Template atualizado!');
      } else {
        const { error } = await supabase
          .from('platform_email_templates' as any)
          .insert({
            name: data.name, slug: data.slug, subject: data.subject,
            html_body: data.html_body, description: data.description,
            category: data.category, is_active: data.is_active,
            variables: data.variables as any,
          } as any);
        if (error) throw error;
        toast.success('Template criado!');
      }
      loadTemplates();
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const handleDuplicate = async (t: EmailTemplate) => {
    try {
      const { error } = await supabase
        .from('platform_email_templates' as any)
        .insert({
          name: `${t.name} (cópia)`, slug: `${t.slug}_copy_${Date.now()}`,
          subject: t.subject, html_body: t.html_body, description: t.description,
          category: t.category, is_active: false, variables: t.variables as any,
        } as any);
      if (error) throw error;
      toast.success('Template duplicado!');
      loadTemplates();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from('platform_email_templates' as any)
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Template excluído!');
      setDeleteTarget(null);
      loadTemplates();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleTestTemplate = async (t: EmailTemplate) => {
    if (!testEmail) {
      toast.error('Defina um e-mail de teste na aba "Teste de Envio" primeiro.');
      return;
    }
    setTestingTemplate(t.id);
    try {
      const { data, error } = await supabase.functions.invoke('platform-email', {
        body: { action: 'send_template', template_slug: t.slug, to_email: testEmail },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Template "${t.name}" enviado para ${testEmail}!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTestingTemplate(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">E-mail da Plataforma</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure SMTP, gerencie templates HTML e teste o envio de e-mails.
        </p>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Templates</TabsTrigger>
          <TabsTrigger value="smtp" className="gap-1.5"><Server className="h-3.5 w-3.5" /> SMTP</TabsTrigger>
          <TabsTrigger value="test" className="gap-1.5"><Send className="h-3.5 w-3.5" /> Teste</TabsTrigger>
        </TabsList>

        {/* ─── Templates Tab ─── */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {templates.length} template{templates.length !== 1 ? 's' : ''} configurado{templates.length !== 1 ? 's' : ''}
            </p>
            <Button size="sm" className="gap-1.5 h-8" onClick={() => { setEditingTemplate(null); setIsNewTemplate(true); setShowEditor(true); }}>
              <Plus className="h-3.5 w-3.5" /> Novo Template
            </Button>
          </div>

          {templatesLoading ? (
            <div className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
          ) : templates.length === 0 ? (
            <div className="py-12 text-center"><p className="text-sm text-muted-foreground">Nenhum template cadastrado</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {templates.map(t => (
                <div
                  key={t.id}
                  className={cn(
                    "group relative rounded-xl border bg-card p-4 transition-all hover:shadow-[0_4px_16px_0_hsl(var(--foreground)/0.08)] cursor-pointer",
                    !t.is_active && "opacity-50"
                  )}
                  onClick={() => { setEditingTemplate(t); setIsNewTemplate(false); setShowEditor(true); }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{t.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className={cn("text-[9px] h-4 px-1.5 border-0", categoryColors[t.category] || categoryColors.sistema)}>
                        {categoryLabels[t.category] || t.category}
                      </Badge>
                      {t.is_active ? (
                        <Badge variant="default" className="text-[9px] h-4 px-1.5 bg-emerald-600">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">Inativo</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{t.description || 'Sem descrição'}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {((t.variables as any) || []).slice(0, 4).map((v: any) => (
                      <span key={v.key} className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{`{{${v.key}}}`}</span>
                    ))}
                    {((t.variables as any) || []).length > 4 && (
                      <span className="text-[10px] text-muted-foreground">+{(t.variables as any).length - 4}</span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={e => { e.stopPropagation(); handleTestTemplate(t); }} title="Enviar teste">
                      {testingTemplate === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={e => { e.stopPropagation(); handleDuplicate(t); }} title="Duplicar">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget(t); }} title="Excluir">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── SMTP Tab ─── */}
        <TabsContent value="smtp" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3"><CardTitle className="text-sm">Status</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  {hasPassword ? (
                    <Badge variant="default" className="gap-1 bg-emerald-600"><CheckCircle2 className="h-3 w-3" /> Senha configurada</Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Senha ausente</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {config.host ? (
                    <Badge variant="outline" className="gap-1"><Server className="h-3 w-3" /> {config.host}</Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">Não configurado</Badge>
                  )}
                </div>
                <Separator />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  A senha SMTP é armazenada como secret seguro.
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Servidor SMTP</CardTitle>
                <CardDescription className="text-xs">Dados do servidor para envio de e-mails.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Host</Label>
                    <Input value={config.host} onChange={e => setConfig(p => ({ ...p, host: e.target.value }))} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Porta</Label>
                    <Input type="number" value={config.port} onChange={e => setConfig(p => ({ ...p, port: Number(e.target.value) }))} className="h-9 text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Usuário</Label>
                  <Input value={config.user} onChange={e => setConfig(p => ({ ...p, user: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">E-mail remetente</Label>
                    <Input value={config.from_email} onChange={e => setConfig(p => ({ ...p, from_email: e.target.value }))} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome remetente</Label>
                    <Input value={config.from_name} onChange={e => setConfig(p => ({ ...p, from_name: e.target.value }))} className="h-9 text-sm" />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="text-sm font-medium">TLS/SSL</p><p className="text-xs text-muted-foreground">Conexão segura</p></div>
                  <Switch checked={config.use_tls} onCheckedChange={v => setConfig(p => ({ ...p, use_tls: v }))} />
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Test Tab ─── */}
        <TabsContent value="test">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle className="text-sm">Teste de Envio</CardTitle>
              <CardDescription className="text-xs">Verifique se a configuração SMTP está funcionando.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail de destino</Label>
                <Input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="seu@email.com" className="h-9 text-sm" />
              </div>
              <Button onClick={handleTest} disabled={testing} className="w-full">
                {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Enviar Teste
              </Button>
              {testResult && (
                <div className={cn("flex items-center gap-2 p-3 rounded-lg text-sm",
                  testResult.success ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                )}>
                  {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  {testResult.message}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Editor Dialog */}
      <EmailTemplateEditor
        template={isNewTemplate ? null : editingTemplate}
        open={showEditor}
        onClose={() => { setShowEditor(false); setEditingTemplate(null); setIsNewTemplate(false); }}
        onSave={handleSaveTemplate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é irreversível.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
