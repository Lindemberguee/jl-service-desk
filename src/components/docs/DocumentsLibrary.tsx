import { useState, useRef } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, Trash2, Download, Search, FolderOpen, Calendar, User, Tag, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { useModuleCategories } from '@/hooks/useModuleCategories';
import { CategoryManager } from './CategoryManager';

const FOLDERS = ['Geral', 'Notas Fiscais', 'Contratos', 'Manuais', 'Infraestrutura', 'Licenças', 'Procedimentos'];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsLibrary() {
  const { documentsQuery, uploadDocument, deleteDocument } = useDocuments();
  const { categories: CATEGORIES } = useModuleCategories('library');
  const [search, setSearch] = useState('');
  const [filterFolder, setFilterFolder] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', folder: 'Geral', category: 'Geral', tags: '' });
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const docs = documentsQuery.data || [];
  const filtered = docs.filter((d: any) => {
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.file_name.toLowerCase().includes(search.toLowerCase());
    const matchFolder = filterFolder === 'all' || d.folder === filterFolder;
    const matchCategory = filterCategory === 'all' || d.category === filterCategory;
    return matchSearch && matchFolder && matchCategory;
  });

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.title.trim()) {
      toast({ title: 'Preencha o título e selecione um arquivo', variant: 'destructive' });
      return;
    }
    await uploadDocument.mutateAsync({
      file: selectedFile,
      title: uploadForm.title,
      description: uploadForm.description,
      folder: uploadForm.folder,
      category: uploadForm.category,
      tags: uploadForm.tags ? uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
    setUploadOpen(false);
    setSelectedFile(null);
    setUploadForm({ title: '', description: '', folder: 'Geral', category: 'Geral', tags: '' });
  };

  const handleDownload = async (doc: any) => {
    if (!doc.storage_key) return;
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.storage_key, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const getMimeIcon = (mime: string) => {
    if (mime?.includes('pdf')) return '📄';
    if (mime?.includes('image')) return '🖼️';
    if (mime?.includes('spreadsheet') || mime?.includes('excel')) return '📊';
    if (mime?.includes('word') || mime?.includes('document')) return '📝';
    return '📎';
  };

  if (documentsQuery.isLoading) {
    return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar documentos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={filterFolder} onValueChange={setFilterFolder}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Pasta" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as pastas</SelectItem>
              {FOLDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <CategoryManager module="library" label="Biblioteca" />
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Upload className="h-4 w-4" /> Enviar</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Enviar Documento</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Arquivo *</Label>
                  <Input ref={fileRef} type="file" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="mt-1" />
                </div>
                <div>
                  <Label>Título *</Label>
                  <Input value={uploadForm.title} onChange={e => setUploadForm(p => ({ ...p, title: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={uploadForm.description} onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))} className="mt-1" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Pasta</Label>
                    <Select value={uploadForm.folder} onValueChange={v => setUploadForm(p => ({ ...p, folder: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{FOLDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select value={uploadForm.category} onValueChange={v => setUploadForm(p => ({ ...p, category: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Tags (separadas por vírgula)</Label>
                  <Input value={uploadForm.tags} onChange={e => setUploadForm(p => ({ ...p, tags: e.target.value }))} className="mt-1" placeholder="firewall, switch, rede" />
                </div>
                <Button onClick={handleUpload} disabled={uploadDocument.isPending} className="w-full">
                  {uploadDocument.isPending ? 'Enviando...' : 'Enviar Documento'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{filtered.length} documento(s)</span>
        <span>•</span>
        <span>{formatFileSize(filtered.reduce((sum: number, d: any) => sum + (d.file_size || 0), 0))} total</span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Nenhum documento encontrado</p>
          <Button variant="outline" className="mt-4" onClick={() => setUploadOpen(true)}>Enviar primeiro documento</Button>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc: any) => (
            <Card key={doc.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getMimeIcon(doc.mime_type)}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{doc.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <FolderOpen className="h-3 w-3" /> {doc.folder}
                      <span>•</span>
                      <span>{formatFileSize(doc.file_size || 0)}</span>
                    </div>
                    {doc.tags?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {doc.tags.slice(0, 3).map((t: string) => (
                          <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      {doc.profiles?.name && (
                        <>
                          <span>•</span>
                          <User className="h-3 w-3" />
                          {doc.profiles.name}
                        </>
                      )}
                      {doc.current_version > 1 && (
                        <>
                          <span>•</span>
                          <History className="h-3 w-3" />
                          v{doc.current_version}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => handleDownload(doc)}>
                    <Download className="h-3 w-3 mr-1" /> Baixar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => deleteDocument.mutate(doc.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
