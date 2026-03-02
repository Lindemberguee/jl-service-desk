import { useState, useRef, useCallback } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Upload, FileText, Trash2, Download, Search, FolderOpen, Calendar, User, History, Edit, Eye, ExternalLink } from 'lucide-react';
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

function canPreviewInline(mime: string | null) {
  if (!mime) return false;
  return mime.startsWith('image/') || mime === 'application/pdf';
}

interface DocForm {
  title: string; description: string; folder: string; category: string; tags: string;
}

const emptyForm: DocForm = { title: '', description: '', folder: 'Geral', category: 'Geral', tags: '' };

export function DocumentsLibrary() {
  const { documentsQuery, uploadDocument, updateDocument, deleteDocument, getSignedUrl } = useDocuments();
  const { categories: CATEGORIES } = useModuleCategories('library');
  const [search, setSearch] = useState('');
  const [filterFolder, setFilterFolder] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState<DocForm>(emptyForm);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<DocForm>(emptyForm);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
    setUploadForm(emptyForm);
  };

  const handleOpenDoc = async (doc: any) => {
    if (!doc.storage_key) return;
    const url = await getSignedUrl(doc.storage_key);
    if (!url) { toast({ title: 'Erro ao abrir arquivo', variant: 'destructive' }); return; }

    if (canPreviewInline(doc.mime_type)) {
      setPreviewUrl(url);
      setPreviewMime(doc.mime_type);
      setPreviewTitle(doc.title);
    } else {
      // For non-previewable files, open in new tab (download)
      window.open(url, '_blank');
    }
  };

  const handleEdit = (doc: any) => {
    setEditId(doc.id);
    setEditForm({
      title: doc.title,
      description: doc.description || '',
      folder: doc.folder || 'Geral',
      category: doc.category || 'Geral',
      tags: (doc.tags || []).join(', '),
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editId || !editForm.title.trim()) return;
    await updateDocument.mutateAsync({
      id: editId,
      title: editForm.title,
      description: editForm.description,
      folder: editForm.folder,
      category: editForm.category,
      tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
    setEditOpen(false);
    setEditId(null);
    setEditForm(emptyForm);
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      deleteDocument.mutate(deleteId);
      setDeleteId(null);
    }
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

  const renderFormFields = (form: DocForm, setForm: React.Dispatch<React.SetStateAction<DocForm>>) => (
    <>
      <div><Label>Título *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="mt-1" /></div>
      <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="mt-1" rows={2} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Pasta</Label>
          <Select value={form.folder} onValueChange={v => setForm(p => ({ ...p, folder: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{FOLDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Categoria</Label>
          <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Tags (separadas por vírgula)</Label><Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} className="mt-1" /></div>
    </>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar documentos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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

          {/* Upload Dialog */}
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
                {renderFormFields(uploadForm, setUploadForm)}
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
            <Card key={doc.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleOpenDoc(doc)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getMimeIcon(doc.mime_type)}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{doc.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <FolderOpen className="h-3 w-3" /> {doc.folder}
                      <span>•</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{doc.category}</Badge>
                      <span>•</span>
                      <span>{formatFileSize(doc.file_size || 0)}</span>
                    </div>
                    {doc.tags?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {doc.tags.slice(0, 3).map((t: string) => (
                          <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      {doc.profiles?.name && (
                        <><span>•</span><User className="h-3 w-3" />{doc.profiles.name}</>
                      )}
                    </div>
                  </div>
                  {canPreviewInline(doc.mime_type) && (
                    <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <div className="flex gap-1 mt-3" onClick={e => e.stopPropagation()}>
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={() => handleOpenDoc(doc)}>
                    {canPreviewInline(doc.mime_type) ? <><Eye className="h-3 w-3" /> Visualizar</> : <><Download className="h-3 w-3" /> Baixar</>}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleEdit(doc)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteId(doc.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={v => { setEditOpen(v); if (!v) { setEditId(null); setEditForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Editar Documento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {renderFormFields(editForm, setEditForm)}
            <Button onClick={handleSaveEdit} disabled={updateDocument.isPending} className="w-full">
              {updateDocument.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => { setPreviewUrl(null); setPreviewMime(null); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              {previewTitle}
              <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto" onClick={() => previewUrl && window.open(previewUrl, '_blank')}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto px-4 pb-4">
            {previewMime?.startsWith('image/') && previewUrl && (
              <img src={previewUrl} alt={previewTitle} className="max-w-full max-h-[75vh] mx-auto rounded-lg object-contain" />
            )}
            {previewMime === 'application/pdf' && previewUrl && (
              <iframe src={previewUrl} className="w-full h-[75vh] rounded-lg border" title={previewTitle} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O arquivo será removido permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
