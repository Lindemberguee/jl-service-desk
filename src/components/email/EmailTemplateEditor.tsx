import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Eye, Variable, Plus, Copy, Undo2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateVariable {
  key: string;
  label: string;
  example: string;
}

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  subject: string;
  html_body: string;
  variables: TemplateVariable[];
  category: string;
  is_active: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  template: EmailTemplate | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<EmailTemplate>) => Promise<void>;
}

const categoryOptions = [
  { value: 'sistema', label: 'Sistema' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'auth', label: 'Autenticação' },
  { value: 'lifecycle', label: 'Ciclo de Vida' },
  { value: 'notificacao', label: 'Notificação' },
];

function replaceVariables(html: string, variables: TemplateVariable[]) {
  let result = html;
  for (const v of variables) {
    result = result.split(`{{${v.key}}}`).join(v.example || v.key);
  }
  return result;
}

export function EmailTemplateEditor({ template, open, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('sistema');
  const [isActive, setIsActive] = useState(true);
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [saving, setSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState<string>('code');
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarLabel, setNewVarLabel] = useState('');
  const [newVarExample, setNewVarExample] = useState('');

  // Reset form when template changes
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (open && template && template.id !== loadedId) {
    setName(template.name);
    setSlug(template.slug);
    setSubject(template.subject);
    setHtmlBody(template.html_body);
    setDescription(template.description || '');
    setCategory(template.category);
    setIsActive(template.is_active);
    setVariables(template.variables || []);
    setLoadedId(template.id);
    setPreviewTab('code');
  } else if (open && !template && loadedId !== 'new') {
    setName('');
    setSlug('');
    setSubject('');
    setHtmlBody(DEFAULT_HTML);
    setDescription('');
    setCategory('sistema');
    setIsActive(true);
    setVariables([]);
    setLoadedId('new');
    setPreviewTab('code');
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        id: template?.id,
        name, slug, subject, html_body: htmlBody,
        description, category, is_active: isActive,
        variables,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const addVariable = () => {
    if (!newVarKey.trim()) return;
    setVariables(v => [...v, { key: newVarKey.trim(), label: newVarLabel.trim() || newVarKey.trim(), example: newVarExample.trim() }]);
    setNewVarKey('');
    setNewVarLabel('');
    setNewVarExample('');
  };

  const removeVariable = (key: string) => {
    setVariables(v => v.filter(x => x.key !== key));
  };

  const insertVariable = (key: string) => {
    setHtmlBody(prev => prev + `{{${key}}}`);
  };

  const previewHtml = replaceVariables(htmlBody, variables);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">{template ? `Editar: ${template.name}` : 'Novo Template'}</DialogTitle>
          <DialogDescription className="text-xs">Editor completo de template HTML para e-mails da plataforma.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex">
          {/* Left sidebar - metadata */}
          <div className="w-72 border-r bg-muted/20 p-4 space-y-4 overflow-y-auto shrink-0">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Slug (identificador)</Label>
              <Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'))} className="h-8 text-sm font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Assunto</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} className="h-8 text-sm" placeholder="Assunto do e-mail..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Descrição</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} className="text-sm min-h-[60px] resize-none" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="text-xs font-medium cursor-pointer">Ativo</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            {/* Variables */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
                <Variable className="h-3 w-3" /> Variáveis Dinâmicas
              </Label>
              <div className="space-y-1.5">
                {variables.map(v => (
                  <div key={v.key} className="flex items-center gap-1.5">
                    <button
                      className="flex-1 text-left text-[11px] font-mono bg-background border rounded px-2 py-1 hover:bg-primary/5 transition-colors truncate"
                      onClick={() => insertVariable(v.key)}
                      title={`Inserir {{${v.key}}} no HTML`}
                    >
                      <span className="text-primary">{`{{${v.key}}}`}</span>
                      <span className="text-muted-foreground ml-1">— {v.label}</span>
                    </button>
                    <button onClick={() => removeVariable(v.key)} className="text-muted-foreground hover:text-destructive text-xs px-1">✕</button>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 bg-background rounded-lg border p-2.5">
                <Input value={newVarKey} onChange={e => setNewVarKey(e.target.value)} placeholder="chave" className="h-7 text-xs font-mono" />
                <Input value={newVarLabel} onChange={e => setNewVarLabel(e.target.value)} placeholder="label" className="h-7 text-xs" />
                <Input value={newVarExample} onChange={e => setNewVarExample(e.target.value)} placeholder="valor exemplo" className="h-7 text-xs" />
                <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1" onClick={addVariable} disabled={!newVarKey.trim()}>
                  <Plus className="h-3 w-3" /> Adicionar
                </Button>
              </div>
            </div>
          </div>

          {/* Main editor area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/20">
              <Tabs value={previewTab} onValueChange={setPreviewTab}>
                <TabsList className="h-8">
                  <TabsTrigger value="code" className="text-xs gap-1 h-7 px-3"><Code className="h-3 w-3" /> HTML</TabsTrigger>
                  <TabsTrigger value="preview" className="text-xs gap-1 h-7 px-3"><Eye className="h-3 w-3" /> Preview</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] h-5">
                  {htmlBody.length.toLocaleString()} chars
                </Badge>
              </div>
            </div>

            {previewTab === 'code' ? (
              <textarea
                value={htmlBody}
                onChange={e => setHtmlBody(e.target.value)}
                className="flex-1 w-full resize-none border-0 bg-[hsl(var(--background))] text-foreground font-mono text-xs p-4 focus:outline-none leading-relaxed"
                spellCheck={false}
                placeholder="Cole ou edite o HTML do template aqui..."
              />
            ) : (
              <div className="flex-1 overflow-auto bg-[#f4f6f9] p-6">
                <div className="mx-auto max-w-[640px]">
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full min-h-[500px] bg-white rounded-lg shadow-lg border-0"
                    title="Preview do template"
                    sandbox="allow-same-origin"
                    style={{ height: '600px' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t gap-2">
          <Button variant="outline" onClick={onClose} className="text-sm">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || !slug.trim()} className="text-sm gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Salvar Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#1a56db,#0f172a);padding:40px 40px 30px;text-align:center;">
          <img src="https://jl-service-desk.lovable.app/ordfy-logo.png" alt="Ordfy" height="40" style="margin-bottom:20px;filter:brightness(0) invert(1);">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Título do E-mail</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">Subtítulo descritivo aqui.</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Olá,</p>
          <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.7;">Conteúdo do e-mail aqui...</p>
        </td></tr>
        <tr><td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">Plataforma Ordfy · E-mail automático</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export type { EmailTemplate, TemplateVariable };
