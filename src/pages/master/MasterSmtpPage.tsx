import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, Server, Send, CheckCircle2, AlertCircle, Shield, Eye, EyeOff } from 'lucide-react';

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

export default function MasterSmtpPage() {
  const [config, setConfig] = useState<SmtpConfig>(DEFAULT_CONFIG);
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('platform-email', {
        body: { action: 'get_config' },
      });
      if (error) throw error;
      if (data?.config) {
        setConfig(prev => ({ ...prev, ...data.config }));
      }
      setHasPassword(data?.has_password || false);
    } catch (err: any) {
      console.error('Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('platform-email', {
        body: { action: 'save_config', ...config },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Configuração SMTP salva com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast.error('Informe um e-mail de destino');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('platform-email', {
        body: { action: 'test_email', to_email: testEmail },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTestResult({ success: true, message: data.message || 'E-mail enviado!' });
      toast.success('E-mail de teste enviado com sucesso!');
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
      toast.error(`Falha: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuração de E-mail</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure o servidor SMTP da plataforma para envio de e-mails de boas-vindas e notificações do sistema.
        </p>
      </div>

      <Tabs defaultValue="smtp" className="space-y-4">
        <TabsList>
          <TabsTrigger value="smtp" className="gap-1.5">
            <Server className="h-3.5 w-3.5" />
            Servidor SMTP
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Teste de Envio
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* SMTP Config Tab */}
        <TabsContent value="smtp" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Status Card */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  {hasPassword ? (
                    <Badge variant="default" className="gap-1 bg-emerald-600">
                      <CheckCircle2 className="h-3 w-3" /> Senha configurada
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" /> Senha ausente
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {config.host ? (
                    <Badge variant="outline" className="gap-1">
                      <Server className="h-3 w-3" /> {config.host}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      Não configurado
                    </Badge>
                  )}
                </div>
                <Separator />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  A senha SMTP é armazenada como secret seguro e nunca exposta no frontend.
                </div>
              </CardContent>
            </Card>

            {/* Config Form */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Configuração do Servidor</CardTitle>
                <CardDescription className="text-xs">
                  Configure os dados do servidor SMTP para envio de e-mails da plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Host SMTP</Label>
                    <Input
                      value={config.host}
                      onChange={e => setConfig(p => ({ ...p, host: e.target.value }))}
                      placeholder="smtp.hostinger.com"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Porta</Label>
                    <Input
                      type="number"
                      value={config.port}
                      onChange={e => setConfig(p => ({ ...p, port: Number(e.target.value) }))}
                      placeholder="465"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Usuário (e-mail de autenticação)</Label>
                  <Input
                    value={config.user}
                    onChange={e => setConfig(p => ({ ...p, user: e.target.value }))}
                    placeholder="mail@ordfy.com.br"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">E-mail remetente</Label>
                    <Input
                      value={config.from_email}
                      onChange={e => setConfig(p => ({ ...p, from_email: e.target.value }))}
                      placeholder="mail@ordfy.com.br"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome do remetente</Label>
                    <Input
                      value={config.from_name}
                      onChange={e => setConfig(p => ({ ...p, from_name: e.target.value }))}
                      placeholder="Ordfy"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Usar TLS/SSL</p>
                    <p className="text-xs text-muted-foreground">Conexão segura (recomendado)</p>
                  </div>
                  <Switch
                    checked={config.use_tls}
                    onCheckedChange={v => setConfig(p => ({ ...p, use_tls: v }))}
                  />
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar Configuração
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle className="text-sm">Teste de Envio</CardTitle>
              <CardDescription className="text-xs">
                Envie um e-mail de teste para verificar se a configuração SMTP está funcionando.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail de destino</Label>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="h-9 text-sm"
                />
              </div>

              <Button onClick={handleTest} disabled={testing} className="w-full">
                {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Enviar E-mail de Teste
              </Button>

              {testResult && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  testResult.success ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                }`}>
                  {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  {testResult.message}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Boas-vindas</CardTitle>
                  <Badge variant="default" className="text-[10px] bg-emerald-600">Ativo</Badge>
                </div>
                <CardDescription className="text-xs">
                  Enviado automaticamente quando uma nova empresa se cadastra (self-service) ou é criada pelo Super Admin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
                  <p className="text-xs font-medium text-foreground">Inclui:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Nome da empresa e do administrador</li>
                    <li>• Credenciais de acesso (e-mail)</li>
                    <li>• Informações do plano e trial</li>
                    <li>• Link direto para login</li>
                    <li>• Guia de primeiros passos</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Expiração de Trial</CardTitle>
                  <Badge variant="outline" className="text-[10px]">Em breve</Badge>
                </div>
                <CardDescription className="text-xs">
                  Notificação enviada 3 dias antes do término do período de teste.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <p className="text-xs text-muted-foreground">Funcionalidade em desenvolvimento</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
