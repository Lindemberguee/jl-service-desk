import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  StickyNote, Plus, Trash2, Search, FolderOpen, Pin, PinOff,
  ArrowLeft, Loader2, Tag, Bold, Italic, List, ListOrdered,
  Heading1, Heading2, Quote, Code, Minus, X, FolderPlus,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useNotes, type Note } from '@/hooks/useNotes';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

export default function NotesPage() {
  const { notes, loading, saving, createNote, updateNote, deleteNote, folders, allTags } = useNotes();
  const navigate = useNavigate();

  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Local editing state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newFolder, setNewFolder] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const debouncedTitle = useDebounce(editTitle, 1000);
  const debouncedContent = useDebounce(editContent, 1500);

  const note = notes.find(n => n.id === activeNote);

  // Sync editor when switching notes
  useEffect(() => {
    if (note) {
      setEditTitle(note.title);
      setEditContent(note.content);
      if (editorRef.current) {
        editorRef.current.innerHTML = note.content;
      }
    }
  }, [activeNote]); // intentionally only on activeNote change

  // Auto-save title
  useEffect(() => {
    if (note && debouncedTitle !== note.title && debouncedTitle.trim()) {
      updateNote(note.id, { title: debouncedTitle });
    }
  }, [debouncedTitle]);

  // Auto-save content
  useEffect(() => {
    if (note && debouncedContent !== note.content) {
      updateNote(note.id, { content: debouncedContent });
    }
  }, [debouncedContent]);

  const execCommand = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    setEditContent(editorRef.current?.innerHTML || '');
  };

  const handleCreate = async () => {
    const folder = activeFolder || 'Geral';
    const result = await createNote(folder);
    if (result) setActiveNote(result.id);
  };

  const handleAddTag = () => {
    if (!note || !newTag.trim()) return;
    const tags = [...note.tags, newTag.trim().toLowerCase()];
    updateNote(note.id, { tags: [...new Set(tags)] });
    // Update local state
    note.tags = [...new Set(tags)];
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    if (!note) return;
    const tags = note.tags.filter(t => t !== tag);
    updateNote(note.id, { tags });
    note.tags = tags;
  };

  const handleChangeFolder = (folder: string) => {
    if (!note) return;
    updateNote(note.id, { folder });
    note.folder = folder;
  };

  const togglePin = () => {
    if (!note) return;
    updateNote(note.id, { is_pinned: !note.is_pinned });
    note.is_pinned = !note.is_pinned;
  };

  // Filtered notes
  const filtered = notes.filter(n => {
    if (activeFolder && n.folder !== activeFolder) return false;
    if (activeTag && !n.tags.includes(activeTag)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    }
    return true;
  });

  // Active note editor view
  if (note) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-1 pb-3 shrink-0 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setActiveNote(null)} className="text-xs gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={togglePin}>
            {note.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </Button>
          <Badge variant="outline" className="text-[10px] gap-1">
            <FolderOpen className="h-2.5 w-2.5" />
            {note.folder}
          </Badge>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <span className="text-[10px] text-muted-foreground">Salva automaticamente</span>
        </div>

        {/* Title */}
        <Input
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          placeholder="Título da nota..."
          className="text-lg font-bold border-0 border-b rounded-none px-4 h-12 focus-visible:ring-0 bg-transparent"
        />

        {/* Formatting toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30 flex-wrap">
          {[
            { icon: Bold, cmd: 'bold', label: 'Negrito' },
            { icon: Italic, cmd: 'italic', label: 'Itálico' },
            { icon: Heading1, cmd: 'formatBlock', value: 'H1', label: 'Título 1' },
            { icon: Heading2, cmd: 'formatBlock', value: 'H2', label: 'Título 2' },
            { icon: Quote, cmd: 'formatBlock', value: 'BLOCKQUOTE', label: 'Citação' },
            { icon: List, cmd: 'insertUnorderedList', label: 'Lista' },
            { icon: ListOrdered, cmd: 'insertOrderedList', label: 'Lista numerada' },
            { icon: Code, cmd: 'formatBlock', value: 'PRE', label: 'Código' },
            { icon: Minus, cmd: 'insertHorizontalRule', label: 'Linha' },
          ].map(({ icon: Icon, cmd, value, label }) => (
            <Button
              key={cmd + (value || '')}
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => execCommand(cmd, value)}
              title={label}
            >
              <Icon className="h-3.5 w-3.5" />
            </Button>
          ))}
        </div>

        {/* Content editor */}
        <div className="flex-1 overflow-auto">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="min-h-full p-4 outline-none prose prose-sm dark:prose-invert max-w-none
                       [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2
                       [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2
                       [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
                       [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded-md [&_pre]:text-xs [&_pre]:font-mono
                       [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
            onInput={() => setEditContent(editorRef.current?.innerHTML || '')}
            data-placeholder="Comece a escrever..."
          />
        </div>

        {/* Tags bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-t bg-muted/20 flex-wrap">
          <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {note.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-[10px] h-5 gap-1 cursor-pointer" onClick={() => handleRemoveTag(tag)}>
              {tag} <X className="h-2.5 w-2.5" />
            </Badge>
          ))}
          <Input
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTag()}
            placeholder="Nova tag..."
            className="h-6 text-xs w-24 border-dashed"
          />
        </div>
      </div>
    );
  }

  // Notes listing view
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - Folders */}
      <div className="w-52 shrink-0 border-r pr-3 space-y-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/ferramentas')} className="gap-1 text-xs w-full justify-start">
          <ArrowLeft className="h-3.5 w-3.5" /> Ferramentas
        </Button>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Pastas</h2>
          <div className="space-y-0.5">
            <Button
              variant={activeFolder === null ? 'secondary' : 'ghost'}
              size="sm" className="w-full justify-start text-xs h-8"
              onClick={() => { setActiveFolder(null); setActiveTag(null); }}
            >
              <StickyNote className="h-3.5 w-3.5 mr-2" /> Todas ({notes.length})
            </Button>
            {folders.map(f => (
              <Button
                key={f}
                variant={activeFolder === f ? 'secondary' : 'ghost'}
                size="sm" className="w-full justify-start text-xs h-8"
                onClick={() => { setActiveFolder(f); setActiveTag(null); }}
              >
                <FolderOpen className="h-3.5 w-3.5 mr-2" /> {f} ({notes.filter(n => n.folder === f).length})
              </Button>
            ))}
            {showNewFolder ? (
              <div className="flex gap-1 px-1">
                <Input
                  autoFocus value={newFolder} onChange={e => setNewFolder(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newFolder.trim()) { setActiveFolder(newFolder.trim()); setShowNewFolder(false); setNewFolder(''); } }}
                  className="h-7 text-xs"
                  placeholder="Nome..."
                />
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8 text-muted-foreground" onClick={() => setShowNewFolder(true)}>
                <FolderPlus className="h-3.5 w-3.5 mr-2" /> Nova pasta
              </Button>
            )}
          </div>
        </div>

        {allTags.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Tags</h2>
            <div className="flex flex-wrap gap-1 px-2">
              {allTags.map(t => (
                <Badge
                  key={t}
                  variant={activeTag === t ? 'default' : 'outline'}
                  className="text-[10px] cursor-pointer"
                  onClick={() => setActiveTag(activeTag === t ? null : t)}
                >
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 pl-4 space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-amber-500" /> Anotações
          </h1>
          <div className="flex-1" />
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar notas..."
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Button size="sm" onClick={handleCreate} className="gap-1">
            <Plus className="h-4 w-4" /> Nova Nota
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
              <StickyNote className="h-7 w-7 text-amber-500" />
            </div>
            <h2 className="text-base font-semibold mb-1">Nenhuma nota encontrada</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {searchQuery ? 'Tente uma busca diferente.' : 'Crie sua primeira nota para começar.'}
            </p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            {filtered.map(n => (
              <motion.div
                key={n.id}
                whileHover={{ y: -2 }}
                className="group rounded-xl border bg-card p-4 cursor-pointer hover:border-amber-500/40 transition-all hover:shadow-md"
                onClick={() => setActiveNote(n.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {n.is_pinned && <Pin className="h-3 w-3 text-amber-500" />}
                    <h3 className="font-medium text-sm truncate">{n.title || 'Sem título'}</h3>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={e => e.stopPropagation()}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={e => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir nota?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteNote(n.id)}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Preview */}
                <div
                  className="text-xs text-muted-foreground line-clamp-3 mb-3"
                  dangerouslySetInnerHTML={{ __html: n.content || '<span class="italic">Nota vazia</span>' }}
                />

                {/* Meta */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5">
                    <FolderOpen className="h-2.5 w-2.5" /> {n.folder}
                  </Badge>
                  {n.tags.slice(0, 2).map(t => (
                    <Badge key={t} variant="secondary" className="text-[10px] h-4 px-1.5">{t}</Badge>
                  ))}
                  {n.tags.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">+{n.tags.length - 2}</span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {format(new Date(n.updated_at), "dd MMM 'às' HH:mm", { locale: ptBR })}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
