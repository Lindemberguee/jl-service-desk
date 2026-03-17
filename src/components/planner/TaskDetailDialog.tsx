import { useState, useEffect, useRef } from 'react';
import { type PlannerTask, type PlannerBucket, type TaskAssignment, type TaskComment, type ChecklistItem, type TaskLabel, type TaskLink, type TaskAttachment } from '@/hooks/usePlanner';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Trash2, Plus, Calendar, Tag, CheckCircle2, MessageSquare,
  Send, Users, X, Pencil, Link2, Paperclip, ExternalLink, Download, FileText, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

const priorityOptions = [
  { value: 'urgent', label: 'Urgente', color: 'text-red-500' },
  { value: 'high', label: 'Alta', color: 'text-orange-500' },
  { value: 'medium', label: 'Média', color: 'text-blue-500' },
  { value: 'low', label: 'Baixa', color: 'text-muted-foreground' },
];

const labelColors = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6',
  '#EC4899', '#14B8A6', '#6366F1', '#F43F5E',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface Props {
  task: PlannerTask | null;
  buckets: PlannerBucket[];
  assignments: TaskAssignment[];
  comments: TaskComment[];
  open: boolean;
  onClose: () => void;
  onUpdate: (data: Partial<PlannerTask> & { id: string }) => void;
  onDelete: (id: string) => void;
  onAssign: (userId: string) => void;
  onUnassign: (userId: string) => void;
  onAddComment: (content: string) => void;
  onDeleteComment: (id: string) => void;
}

export function TaskDetailDialog({
  task, buckets, assignments, comments, open, onClose,
  onUpdate, onDelete, onAssign, onUnassign, onAddComment, onDeleteComment,
}: Props) {
  const { user, currentTenantId } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [commentText, setCommentText] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newLabelName, setNewLabelName] = useState('');
  const [selectedLabelColor, setSelectedLabelColor] = useState(labelColors[0]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load team members for assignment
  const membersQuery = useQuery({
    queryKey: ['planner-members', currentTenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_memberships')
        .select('user_id, profiles:user_id(id, name, email)')
        .eq('tenant_id', currentTenantId!)
        .eq('is_active', true);
      return (data || []).map((m: any) => ({
        id: m.user_id,
        name: m.profiles?.name || m.profiles?.email || 'Usuário',
      }));
    },
    enabled: !!currentTenantId && open,
  });

  const members = membersQuery.data || [];
  const commentProfiles = useQuery({
    queryKey: ['planner-comment-profiles', comments.map(c => c.user_id).join(',')],
    queryFn: async () => {
      const ids = [...new Set(comments.map(c => c.user_id))];
      if (ids.length === 0) return {};
      const { data } = await supabase.from('profiles').select('id, name').in('id', ids);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = p.name; });
      return map;
    },
    enabled: comments.length > 0 && open,
  });

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
    }
  }, [task?.id]);

  if (!task) return null;

  const checklist: ChecklistItem[] = task.checklist || [];
  const labels: TaskLabel[] = task.labels || [];
  const links: TaskLink[] = task.links || [];
  const attachments: TaskAttachment[] = task.attachments || [];
  const isCompleted = !!task.completed_at;

  const handleTitleSave = () => {
    if (title.trim() && title !== task.title) {
      onUpdate({ id: task.id, title: title.trim() });
    }
    setEditingTitle(false);
  };

  const handleDescSave = () => {
    if (description !== task.description) {
      onUpdate({ id: task.id, description });
    }
  };

  const toggleChecklist = (itemId: string) => {
    const updated = checklist.map(c => c.id === itemId ? { ...c, checked: !c.checked } : c);
    onUpdate({ id: task.id, checklist: updated as any });
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const updated = [...checklist, { id: crypto.randomUUID(), text: newChecklistItem.trim(), checked: false }];
    onUpdate({ id: task.id, checklist: updated as any });
    setNewChecklistItem('');
  };

  const removeChecklistItem = (itemId: string) => {
    const updated = checklist.filter(c => c.id !== itemId);
    onUpdate({ id: task.id, checklist: updated as any });
  };

  const addLabel = () => {
    if (!newLabelName.trim()) return;
    const updated = [...labels, { name: newLabelName.trim(), color: selectedLabelColor }];
    onUpdate({ id: task.id, labels: updated as any });
    setNewLabelName('');
  };

  const removeLabel = (idx: number) => {
    const updated = labels.filter((_, i) => i !== idx);
    onUpdate({ id: task.id, labels: updated as any });
  };

  // Links
  const addLink = () => {
    if (!newLinkUrl.trim()) return;
    let url = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const linkTitle = newLinkTitle.trim() || new URL(url).hostname;
    const updated = [...links, { id: crypto.randomUUID(), url, title: linkTitle }];
    onUpdate({ id: task.id, links: updated as any });
    setNewLinkUrl('');
    setNewLinkTitle('');
  };

  const removeLink = (linkId: string) => {
    const updated = links.filter(l => l.id !== linkId);
    onUpdate({ id: task.id, links: updated as any });
  };

  // Attachments
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo: 10MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || '';
      const storageKey = `${currentTenantId}/${task.id}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from('planner-attachments')
        .upload(storageKey, file);

      if (error) throw error;

      const newAttachment: TaskAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        mime_type: file.type,
        storage_key: storageKey,
        uploaded_at: new Date().toISOString(),
      };

      onUpdate({ id: task.id, attachments: [...attachments, newAttachment] as any });
      toast.success('Arquivo anexado');
    } catch (err: any) {
      toast.error('Erro ao enviar arquivo: ' + (err.message || ''));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadAttachment = async (att: TaskAttachment) => {
    const { data, error } = await supabase.storage
      .from('planner-attachments')
      .createSignedUrl(att.storage_key, 300);

    if (error || !data?.signedUrl) {
      toast.error('Erro ao baixar arquivo');
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const handleDeleteAttachment = async (att: TaskAttachment) => {
    await supabase.storage.from('planner-attachments').remove([att.storage_key]);
    const updated = attachments.filter(a => a.id !== att.id);
    onUpdate({ id: task.id, attachments: updated as any });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    onAddComment(commentText.trim());
    setCommentText('');
  };

  const checklistDone = checklist.filter(c => c.checked).length;
  const checklistPct = checklist.length > 0 ? Math.round((checklistDone / checklist.length) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-5 pt-4 pb-3 border-b">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              {editingTitle ? (
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={e => e.key === 'Enter' && handleTitleSave()}
                  className="text-base font-semibold h-8"
                  autoFocus
                />
              ) : (
                <DialogTitle
                  className="text-base font-semibold cursor-pointer hover:text-primary transition-colors"
                  onClick={() => setEditingTitle(true)}
                >
                  {task.title}
                </DialogTitle>
              )}
              <DialogDescription className="text-xs mt-1">
                em <span className="font-medium">{buckets.find(b => b.id === task.bucket_id)?.name || 'Coluna'}</span>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                variant={isCompleted ? "default" : "outline"}
                className="h-7 text-xs gap-1"
                onClick={() => onUpdate({ id: task.id, completed_at: isCompleted ? null : new Date().toISOString() })}
              >
                <CheckCircle2 className="h-3 w-3" />
                {isCompleted ? 'Concluída' : 'Concluir'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={() => { if (confirm('Excluir esta tarefa?')) onDelete(task.id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-0">
            {/* Main content */}
            <div className="p-5 space-y-5 border-r">
              {/* Labels */}
              <div>
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Etiquetas
                </h4>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {labels.map((label, i) => (
                    <Badge
                      key={i}
                      className="text-[10px] px-2 py-0.5 gap-1 cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: label.color + '20', color: label.color, borderColor: label.color + '30' }}
                      onClick={() => removeLabel(i)}
                    >
                      {label.name} <X className="h-2 w-2" />
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    placeholder="Nova etiqueta..."
                    className="h-7 text-xs flex-1"
                    value={newLabelName}
                    onChange={e => setNewLabelName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addLabel()}
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="h-6 w-6 rounded-full border shrink-0" style={{ backgroundColor: selectedLabelColor }} />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                      <div className="grid grid-cols-5 gap-1">
                        {labelColors.map(c => (
                          <button
                            key={c}
                            className={cn("h-6 w-6 rounded-full transition-transform", selectedLabelColor === c && "ring-2 ring-offset-1 ring-primary scale-110")}
                            style={{ backgroundColor: c }}
                            onClick={() => setSelectedLabelColor(c)}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button size="sm" className="h-7 text-[10px]" onClick={addLabel} disabled={!newLabelName.trim()}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div>
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Descrição</h4>
                <Textarea
                  placeholder="Adicione uma descrição..."
                  className="text-xs min-h-[80px] resize-none"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onBlur={handleDescSave}
                />
              </div>

              <Separator />

              {/* Checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Checklist
                  </h4>
                  {checklist.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">{checklistDone}/{checklist.length} ({checklistPct}%)</span>
                  )}
                </div>
                {checklist.length > 0 && (
                  <div className="h-1.5 rounded-full bg-muted mb-3 overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${checklistPct}%` }} />
                  </div>
                )}
                <div className="space-y-1.5 mb-2">
                  {checklist.map(item => (
                    <div key={item.id} className="flex items-center gap-2 group">
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => toggleChecklist(item.id)}
                        className="h-3.5 w-3.5"
                      />
                      <span className={cn("text-xs flex-1", item.checked && "line-through text-muted-foreground")}>
                        {item.text}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                        onClick={() => removeChecklistItem(item.id)}
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    placeholder="Adicionar item..."
                    className="h-7 text-xs"
                    value={newChecklistItem}
                    onChange={e => setNewChecklistItem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
                  />
                  <Button size="sm" className="h-7 text-[10px]" onClick={addChecklistItem} disabled={!newChecklistItem.trim()}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Links */}
              <div>
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Link2 className="h-3 w-3" /> Links
                </h4>
                {links.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {links.map(link => (
                      <div key={link.id} className="flex items-center gap-2 group rounded-md px-2 py-1.5 bg-muted/40 hover:bg-muted/60 transition-colors">
                        <ExternalLink className="h-3 w-3 text-primary shrink-0" />
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline truncate flex-1"
                          title={link.url}
                        >
                          {link.title}
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                          onClick={() => removeLink(link.id)}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="URL do link..."
                      className="h-7 text-xs flex-1"
                      value={newLinkUrl}
                      onChange={e => setNewLinkUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addLink()}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="Título (opcional)"
                      className="h-7 text-xs flex-1"
                      value={newLinkTitle}
                      onChange={e => setNewLinkTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addLink()}
                    />
                    <Button size="sm" className="h-7 text-[10px]" onClick={addLink} disabled={!newLinkUrl.trim()}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Attachments */}
              <div>
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> Anexos
                </h4>
                {attachments.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {attachments.map(att => (
                      <div key={att.id} className="flex items-center gap-2 group rounded-md px-2 py-1.5 bg-muted/40 hover:bg-muted/60 transition-colors">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate font-medium">{att.name}</p>
                          <p className="text-[10px] text-muted-foreground">{formatFileSize(att.size)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                          onClick={() => handleDownloadAttachment(att)}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                          onClick={() => handleDeleteAttachment(att)}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] gap-1 w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                  {uploading ? 'Enviando...' : 'Anexar arquivo'}
                </Button>
              </div>

              <Separator />

              {/* Comments */}
              <div>
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Comentários
                </h4>
                <div className="space-y-3 mb-3">
                  {comments.map(c => (
                    <div key={c.id} className="flex gap-2 group">
                      <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                          {(commentProfiles.data?.[c.user_id] || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium">{commentProfiles.data?.[c.user_id] || 'Usuário'}</span>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {c.user_id === user?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                              onClick={() => onDeleteComment(c.id)}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-foreground/80 mt-0.5">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    placeholder="Escreva um comentário..."
                    className="h-8 text-xs"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                  />
                  <Button size="sm" className="h-8 w-8 p-0" onClick={handleSendComment} disabled={!commentText.trim()}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="p-4 space-y-4 bg-muted/20">
              {/* Bucket */}
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Coluna</h4>
                <Select
                  value={task.bucket_id}
                  onValueChange={(v) => onUpdate({ id: task.id, bucket_id: v })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {buckets.map(b => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Prioridade</h4>
                <Select
                  value={task.priority}
                  onValueChange={(v) => onUpdate({ id: task.id, priority: v })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map(p => (
                      <SelectItem key={p.value} value={p.value} className="text-xs">
                        <span className={p.color}>{p.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Início
                </h4>
                <Input
                  type="date"
                  className="h-7 text-xs"
                  value={task.start_date || ''}
                  onChange={e => onUpdate({ id: task.id, start_date: e.target.value || null })}
                />
              </div>
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Prazo
                </h4>
                <Input
                  type="date"
                  className="h-7 text-xs"
                  value={task.due_date || ''}
                  onChange={e => onUpdate({ id: task.id, due_date: e.target.value || null })}
                />
              </div>

              <Separator />

              {/* Assignees */}
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Membros
                </h4>
                <div className="space-y-1.5 mb-2">
                  {assignments.map(a => {
                    const member = members.find(m => m.id === a.user_id);
                    return (
                      <div key={a.id} className="flex items-center gap-2 group">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                            {(member?.name || '?').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs flex-1 truncate">{member?.name || 'Usuário'}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                          onClick={() => onUnassign(a.user_id)}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] w-full gap-1">
                      <Plus className="h-3 w-3" /> Atribuir
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-1" align="start">
                    <ScrollArea className="max-h-40">
                      {members
                        .filter(m => !assignments.some(a => a.user_id === m.id))
                        .map(m => (
                          <button
                            key={m.id}
                            className="flex items-center gap-2 w-full px-2 py-1.5 text-xs hover:bg-muted rounded-md transition-colors"
                            onClick={() => onAssign(m.id)}
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                {m.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{m.name}</span>
                          </button>
                        ))}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              <Separator />

              {/* Link to WO */}
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Link2 className="h-3 w-3" /> Ordem de Serviço
                </h4>
                <Input
                  placeholder="ID da OS (opcional)"
                  className="h-7 text-xs"
                  value={task.work_order_id || ''}
                  onChange={e => onUpdate({ id: task.id, work_order_id: e.target.value || null })}
                />
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
