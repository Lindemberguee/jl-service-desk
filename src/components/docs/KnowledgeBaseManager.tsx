import { useState } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, BookOpen, Search, Edit, Trash2, Eye, EyeOff, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { useModuleCategories } from '@/hooks/useModuleCategories';
import { CategoryManager } from './CategoryManager';

interface ArticleForm {
  title: string; content: string; category: string; tags: string; is_published: boolean;
}

const emptyForm: ArticleForm = { title: '', content: '', category: 'Geral', tags: '', is_published: false };

export function KnowledgeBaseManager() {
  const { articlesQuery, createArticle, updateArticle, deleteArticle } = useKnowledgeBase();
  const { currentRole, rolePermissions, user } = useAuth();
  const { categories: KB_CATEGORIES } = useModuleCategories('knowledge');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ArticleForm>(emptyForm);
  const [viewArticle, setViewArticle] = useState<any>(null);

  const canManage = currentRole && hasPermission(currentRole, 'kb:manage' as any, undefined, rolePermissions);
  const articles = articlesQuery.data || [];

  const filtered = articles.filter((a: any) => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === 'all' || a.category === filterCategory;
    return matchSearch && matchCat;
  });

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: 'Preencha o título', variant: 'destructive' }); return; }
    const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (editId) {
      await updateArticle.mutateAsync({ id: editId, title: form.title, content: form.content, category: form.category, tags, is_published: form.is_published });
    } else {
      await createArticle.mutateAsync({ title: form.title, content: form.content, category: form.category, tags, is_published: form.is_published });
    }
    setFormOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const handleEdit = (article: any) => {
    setForm({ title: article.title, content: article.content, category: article.category || 'Geral', tags: (article.tags || []).join(', '), is_published: article.is_published });
    setEditId(article.id);
    setFormOpen(true);
  };

  if (articlesQuery.isLoading) {
    return <div className="grid gap-4 md:grid-cols-2">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar artigos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {KB_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {canManage && <CategoryManager module="knowledge" label="Base de Conhecimento" />}
          {canManage && (
            <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Artigo</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editId ? 'Editar Artigo' : 'Novo Artigo'}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Título *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="mt-1" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Categoria</Label>
                      <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{KB_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Tags (separadas por vírgula)</Label><Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} className="mt-1" /></div>
                  </div>
                  <div>
                    <Label>Conteúdo (Markdown)</Label>
                    <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} className="mt-1 font-mono text-sm" rows={12} placeholder="# Título&#10;&#10;Escreva em Markdown..." />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_published} onCheckedChange={v => setForm(p => ({ ...p, is_published: v }))} />
                    <Label>Publicar (visível para todos do departamento)</Label>
                  </div>
                  <Button onClick={handleSave} disabled={createArticle.isPending || updateArticle.isPending} className="w-full">
                    {createArticle.isPending || updateArticle.isPending ? 'Salvando...' : editId ? 'Atualizar' : 'Criar Artigo'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} artigo(s)</p>

      {/* View Dialog */}
      <Dialog open={!!viewArticle} onOpenChange={() => setViewArticle(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewArticle && (
            <>
              <DialogHeader>
                <DialogTitle>{viewArticle.title}</DialogTitle>
                <div className="flex gap-2 items-center text-xs text-muted-foreground mt-1">
                  <Badge variant="secondary">{viewArticle.category}</Badge>
                  {viewArticle.is_published ? <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Publicado</Badge> : <Badge variant="outline">Rascunho</Badge>}
                </div>
              </DialogHeader>
              <div className="prose prose-sm dark:prose-invert max-w-none mt-4">
                <ReactMarkdown>{viewArticle.content}</ReactMarkdown>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Nenhum artigo na base de conhecimento</p>
          {canManage && <Button variant="outline" className="mt-4" onClick={() => setFormOpen(true)}>Criar primeiro artigo</Button>}
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((article: any) => (
            <Card key={article.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewArticle(article)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{article.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.content?.slice(0, 150)}...</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary" className="text-[10px]">{article.category}</Badge>
                    {article.is_published ? (
                      <Badge className="text-[10px] bg-green-500/10 text-green-500 border-green-500/20 gap-1"><Eye className="h-2.5 w-2.5" /> Publicado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1"><EyeOff className="h-2.5 w-2.5" /> Rascunho</Badge>
                    )}
                  </div>
                </div>

                {article.tags?.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {article.tags.slice(0, 4).map((t: string) => <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>)}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <User className="h-3 w-3" /> {article.profiles?.name || 'Autor'}
                    <span>•</span>
                    <Calendar className="h-3 w-3" /> {format(new Date(article.updated_at), 'dd/MM/yyyy', { locale: ptBR })}
                    <span>•</span>
                    {article.views_count || 0} visualizações
                  </div>
                  {canManage && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleEdit(article)}><Edit className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => deleteArticle.mutate(article.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
