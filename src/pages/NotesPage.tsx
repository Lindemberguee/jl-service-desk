import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  StickyNote, Plus, Trash2, Search, FolderOpen, Pin, PinOff,
  ArrowLeft, Loader2, Tag, Bold, Italic, List, ListOrdered,
  Heading1, Heading2, Quote, Code, Minus, X, FolderPlus,
  ChevronRight, Sparkles, Clock, FileText, Strikethrough,
  Underline, AlignLeft, AlignCenter, Link2,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useNotes, type Note } from '@/hooks/useNotes';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

function getPlainText(html: string) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function formatRelative(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "'Hoje' HH:mm", { locale: ptBR });
  if (isYesterday(d)) return format(d, "'Ontem' HH:mm", { locale: ptBR });
  if (isThisWeek(d)) return format(d, "EEEE HH:mm", { locale: ptBR });
  return format(d, "dd MMM yyyy", { locale: ptBR });
}

function ToolbarBtn({ icon: Icon, label, onClick, active, className }: any) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7 rounded-lg', active && 'bg-accent text-accent-foreground', className)}
          onClick={onClick}
          type="button"
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

const FOLDER_COLORS: Record<string, string> = {
  'Geral': 'bg-blue-500/10 text-blue-500',
  'Pessoal': 'bg-violet-500/10 text-violet-500',
  'Trabalho': 'bg-emerald-500/10 text-emerald-500',
  'Ideias': 'bg-amber-500/10 text-amber-500',
};

function getFolderColor(folder: string) {
  return FOLDER_COLORS[folder] || 'bg-primary/10 text-primary';
}

export default function NotesPage() {
  const { notes, loading, saving, createNote, updateNote, deleteNote, folders, allTags } = useNotes();
  const navigate = useNavigate();

  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    note.tags = [...new Set(tags)];
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    if (!note) return;
    const tags = note.tags.filter(t => t !== tag);
    updateNote(note.id, { tags });
    note.tags = tags;
  };

  const togglePin = () => {
    if (!note) return;
    updateNote(note.id, { is_pinned: !note.is_pinned });
    note.is_pinned = !note.is_pinned;
  };

  // Filtered notes
  const filtered = useMemo(() => notes.filter(n => {
    if (activeFolder && n.folder !== activeFolder) return false;
    if (activeTag && !n.tags.includes(activeTag)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || getPlainText(n.content).toLowerCase().includes(q);
    }
    return true;
  }), [notes, activeFolder, activeTag, searchQuery]);

  const pinnedNotes = filtered.filter(n => n.is_pinned);
  const otherNotes = filtered.filter(n => !n.is_pinned);

  // Word count
  const wordCount = useMemo(() => {
    if (!note) return 0;
    return getPlainText(editContent).split(/\s+/).filter(Boolean).length;
  }, [editContent, note]);

  // ====================== RENDER ======================

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ─── LEFT: Sidebar ─── */}
      <motion.div
        animate={{ width: sidebarCollapsed ? 48 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="shrink-0 border-r bg-muted/20 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-3 flex items-center gap-2">
          {!sidebarCollapsed && (
            <Button variant="ghost" size="sm" onClick={() => navigate('/ferramentas')} className="gap-1 text-xs h-7 px-2">
              <ArrowLeft className="h-3 w-3" /> Ferramentas
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="ghost" size="icon" className="h-7 w-7 shrink-0"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', !sidebarCollapsed && 'rotate-180')} />
          </Button>
        </div>

        {!sidebarCollapsed && (
          <ScrollArea className="flex-1 px-2">
            {/* Folders */}
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-2">Pastas</p>
              <div className="space-y-0.5">
                <button
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                    activeFolder === null ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  onClick={() => { setActiveFolder(null); setActiveTag(null); }}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span className="flex-1 text-left">Todas</span>
                  <span className="text-[10px] opacity-60">{notes.length}</span>
                </button>
                {folders.map(f => (
                  <button
                    key={f}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                      activeFolder === f ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    onClick={() => { setActiveFolder(f); setActiveTag(null); }}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    <span className="flex-1 text-left truncate">{f}</span>
                    <span className="text-[10px] opacity-60">{notes.filter(n => n.folder === f).length}</span>
                  </button>
                ))}
                {showNewFolder ? (
                  <div className="px-1 pt-1">
                    <Input
                      autoFocus value={newFolder} onChange={e => setNewFolder(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newFolder.trim()) {
                          setActiveFolder(newFolder.trim());
                          setShowNewFolder(false);
                          setNewFolder('');
                        }
                        if (e.key === 'Escape') setShowNewFolder(false);
                      }}
                      onBlur={() => setShowNewFolder(false)}
                      className="h-7 text-xs"
                      placeholder="Nome da pasta..."
                    />
                  </div>
                ) : (
                  <button
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted transition-colors"
                    onClick={() => setShowNewFolder(true)}
                  >
                    <FolderPlus className="h-3.5 w-3.5" /> Nova pasta
                  </button>
                )}
              </div>
            </div>

            {/* Tags */}
            {allTags.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-2">Tags</p>
                <div className="flex flex-wrap gap-1 px-1">
                  {allTags.map(t => (
                    <Badge
                      key={t}
                      variant={activeTag === t ? 'default' : 'outline'}
                      className={cn(
                        'text-[10px] cursor-pointer transition-all',
                        activeTag === t && 'shadow-sm'
                      )}
                      onClick={() => setActiveTag(activeTag === t ? null : t)}
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        )}

        {/* New note button at bottom */}
        <div className="p-2 border-t">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleCreate}
                size={sidebarCollapsed ? 'icon' : 'sm'}
                className={cn('gap-1.5 w-full', sidebarCollapsed && 'h-8 w-8')}
              >
                <Plus className="h-4 w-4" />
                {!sidebarCollapsed && <span className="text-xs">Nova Nota</span>}
              </Button>
            </TooltipTrigger>
            {sidebarCollapsed && <TooltipContent side="right">Nova Nota</TooltipContent>}
          </Tooltip>
        </div>
      </motion.div>

      {/* ─── CENTER: Note list ─── */}
      <div className={cn(
        'shrink-0 border-r flex flex-col overflow-hidden transition-all',
        activeNote ? 'w-72' : 'flex-1 max-w-full'
      )}>
        {/* Search bar */}
        <div className="p-3 space-y-2 shrink-0 border-b">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold flex items-center gap-1.5 shrink-0">
              <StickyNote className="h-4 w-4 text-amber-500" />
              {activeFolder || 'Anotações'}
            </h1>
            <div className="flex-1" />
            <span className="text-[10px] text-muted-foreground">{filtered.length} nota{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar notas..."
              className="pl-8 h-8 text-xs bg-muted/50 border-transparent focus:border-border"
            />
          </div>
        </div>

        {/* Note list */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-3">
                <StickyNote className="h-6 w-6 text-amber-500" />
              </div>
              <p className="text-sm font-medium mb-1">Nenhuma nota</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? 'Tente outra busca.' : 'Crie sua primeira nota.'}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {/* Pinned */}
              {pinnedNotes.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest px-2 pt-1 flex items-center gap-1">
                    <Pin className="h-2.5 w-2.5" /> Fixadas
                  </p>
                  {pinnedNotes.map(n => (
                    <NoteCard key={n.id} note={n} active={activeNote === n.id} onClick={() => setActiveNote(n.id)} onDelete={deleteNote} compact={!!activeNote} />
                  ))}
                  <Separator className="my-1" />
                </>
              )}
              {/* Others */}
              {otherNotes.map(n => (
                <NoteCard key={n.id} note={n} active={activeNote === n.id} onClick={() => setActiveNote(n.id)} onDelete={deleteNote} compact={!!activeNote} />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ─── RIGHT: Editor ─── */}
      <AnimatePresence mode="wait">
        {note && (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col overflow-hidden min-w-0"
          >
            {/* Editor header */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden" onClick={() => setActiveNote(null)}>
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>

              <Badge variant="outline" className={cn('text-[10px] h-5 gap-1 border-0', getFolderColor(note.folder))}>
                <FolderOpen className="h-2.5 w-2.5" />
                {note.folder}
              </Badge>

              <div className="flex-1" />

              <AnimatePresence>
                {saving && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5 text-muted-foreground"
                  >
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-[10px]">Salvando...</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={togglePin}>
                    {note.is_pinned ? <PinOff className="h-3.5 w-3.5 text-amber-500" /> : <Pin className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{note.is_pinned ? 'Desafixar' : 'Fixar'}</TooltipContent>
              </Tooltip>
            </div>

            {/* Title */}
            <div className="px-6 pt-4 pb-1">
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="Sem título"
                className="w-full text-xl font-bold bg-transparent border-0 outline-none placeholder:text-muted-foreground/30"
              />
              <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {formatRelative(note.updated_at)}
                </span>
                <span>{wordCount} palavra{wordCount !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Formatting toolbar */}
            <div className="flex items-center gap-0.5 px-4 py-1.5 border-y bg-muted/20 flex-wrap">
              <ToolbarBtn icon={Bold} label="Negrito" onClick={() => execCommand('bold')} />
              <ToolbarBtn icon={Italic} label="Itálico" onClick={() => execCommand('italic')} />
              <ToolbarBtn icon={Underline} label="Sublinhado" onClick={() => execCommand('underline')} />
              <ToolbarBtn icon={Strikethrough} label="Riscado" onClick={() => execCommand('strikeThrough')} />

              <Separator orientation="vertical" className="h-4 mx-1" />

              <ToolbarBtn icon={Heading1} label="Título 1" onClick={() => execCommand('formatBlock', 'H1')} />
              <ToolbarBtn icon={Heading2} label="Título 2" onClick={() => execCommand('formatBlock', 'H2')} />
              <ToolbarBtn icon={Quote} label="Citação" onClick={() => execCommand('formatBlock', 'BLOCKQUOTE')} />
              <ToolbarBtn icon={Code} label="Código" onClick={() => execCommand('formatBlock', 'PRE')} />

              <Separator orientation="vertical" className="h-4 mx-1" />

              <ToolbarBtn icon={List} label="Lista" onClick={() => execCommand('insertUnorderedList')} />
              <ToolbarBtn icon={ListOrdered} label="Lista numerada" onClick={() => execCommand('insertOrderedList')} />
              <ToolbarBtn icon={Minus} label="Separador" onClick={() => execCommand('insertHorizontalRule')} />

              <Separator orientation="vertical" className="h-4 mx-1" />

              <ToolbarBtn icon={AlignLeft} label="Alinhar esquerda" onClick={() => execCommand('justifyLeft')} />
              <ToolbarBtn icon={AlignCenter} label="Centralizar" onClick={() => execCommand('justifyCenter')} />
            </div>

            {/* Content editor */}
            <div className="flex-1 overflow-auto">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="min-h-full px-6 py-4 outline-none prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed
                           [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-4
                           [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3
                           [&_blockquote]:border-l-3 [&_blockquote]:border-amber-500/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:bg-amber-500/5 [&_blockquote]:py-2 [&_blockquote]:rounded-r-lg
                           [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:text-xs [&_pre]:font-mono [&_pre]:border [&_pre]:border-border
                           [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                           [&_hr]:border-border [&_hr]:my-4"
                onInput={() => setEditContent(editorRef.current?.innerHTML || '')}
                data-placeholder="Comece a escrever..."
              />
            </div>

            {/* Tags bar */}
            <div className="flex items-center gap-2 px-4 py-2 border-t bg-muted/10 flex-wrap shrink-0">
              <Tag className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <AnimatePresence>
                {note.tags.map(tag => (
                  <motion.div
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Badge
                      variant="secondary"
                      className="text-[10px] h-5 gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} <X className="h-2.5 w-2.5" />
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
              <Input
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                placeholder="+ tag"
                className="h-5 text-[10px] w-20 border-0 bg-transparent px-1 focus-visible:ring-0 placeholder:text-muted-foreground/30"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state when no note selected in wide view */}
      {!activeNote && !loading && filtered.length > 0 && (
        <div className="hidden lg:flex flex-1 items-center justify-center text-center border-l">
          <div className="space-y-3">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center mx-auto">
              <Sparkles className="h-7 w-7 text-amber-500" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Selecione uma nota para editar</p>
            <p className="text-xs text-muted-foreground/50">ou crie uma nova com o botão +</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Note Card Component ───

function NoteCard({ note, active, onClick, onDelete, compact }: {
  note: Note;
  active: boolean;
  onClick: () => void;
  onDelete: (id: string) => void;
  compact: boolean;
}) {
  const preview = getPlainText(note.content).slice(0, compact ? 60 : 120);

  return (
    <motion.div
      layout
      whileHover={{ x: 2 }}
      className={cn(
        'group relative rounded-lg px-3 py-2.5 cursor-pointer transition-all border border-transparent',
        active
          ? 'bg-primary/8 border-primary/20 shadow-sm'
          : 'hover:bg-muted/60'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {note.is_pinned && <Pin className="h-2.5 w-2.5 text-amber-500 shrink-0" />}
            <h3 className={cn(
              'text-xs font-medium truncate',
              active ? 'text-primary' : 'text-foreground'
            )}>
              {note.title || 'Sem título'}
            </h3>
          </div>

          {preview && (
            <p className="text-[11px] text-muted-foreground/70 line-clamp-2 leading-relaxed">
              {preview}
            </p>
          )}

          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[9px] text-muted-foreground/50">
              {formatRelative(note.updated_at)}
            </span>
            {!compact && note.tags.slice(0, 2).map(t => (
              <Badge key={t} variant="outline" className="text-[8px] h-3.5 px-1 border-muted-foreground/20">{t}</Badge>
            ))}
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost" size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive shrink-0 mt-0.5"
              onClick={e => e.stopPropagation()}
            >
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={e => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir nota?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(note.id)}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </motion.div>
  );
}
