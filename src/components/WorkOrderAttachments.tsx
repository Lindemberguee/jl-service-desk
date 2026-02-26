import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Paperclip, Upload, Loader2, FileText, Image, Download, Trash2, AlertTriangle, X, Eye } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog';

interface WorkOrderAttachmentsProps {
  workOrderId: string;
  resolvedAt?: string | null;
}

function getIcon(mimeType: string | null) {
  if (mimeType?.startsWith('image')) return Image;
  return FileText;
}

export function WorkOrderAttachments({ workOrderId, resolvedAt }: WorkOrderAttachmentsProps) {
  const { currentTenantId, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['work_order_attachments', workOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_order_attachments')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_MIME_TYPES = [
    'image/png', 'image/jpeg', 'image/jpg',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];

  const isFileAllowed = (file: File) => {
    if (ALLOWED_MIME_TYPES.includes(file.type)) return true;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    return ALLOWED_EXTENSIONS.includes(ext);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentTenantId || !user) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!isFileAllowed(file)) {
          toast({ title: 'Tipo não permitido', description: `${file.name}: apenas imagens (PNG/JPG), PDF, Word e Excel.`, variant: 'destructive' });
          continue;
        }
        if (file.size > MAX_SIZE_BYTES) {
          toast({ title: 'Arquivo muito grande', description: `${file.name} excede o limite de 10 MB.`, variant: 'destructive' });
          continue;
        }
        const ext = file.name.split('.').pop();
        const storagePath = `${currentTenantId}/${workOrderId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('work-order-attachments')
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('work-order-attachments')
          .getPublicUrl(storagePath);

        // Since bucket is private, we'll use signed URLs for download
        const { data: signedData } = await supabase.storage
          .from('work-order-attachments')
          .createSignedUrl(storagePath, 3600);

        const { error: insertError } = await supabase
          .from('work_order_attachments')
          .insert({
            tenant_id: currentTenantId,
            work_order_id: workOrderId,
            file_name: file.name,
            mime_type: file.type,
            size: file.size,
            storage_key: storagePath,
            url: signedData?.signedUrl || urlData.publicUrl,
            uploaded_by: user.id,
          });

        if (insertError) throw insertError;
      }

      toast({ title: 'Anexo(s) enviado(s) com sucesso!' });
      qc.invalidateQueries({ queryKey: ['work_order_attachments', workOrderId] });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar anexo', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (attachment: any) => {
    if (!attachment.storage_key) return;
    const { data } = await supabase.storage
      .from('work-order-attachments')
      .download(attachment.storage_key);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handlePreview = async (attachment: any) => {
    if (!attachment.storage_key) return;
    const { data } = await supabase.storage
      .from('work-order-attachments')
      .download(attachment.storage_key);
    if (data) {
      const url = URL.createObjectURL(data);
      if (attachment.mime_type?.startsWith('image')) {
        setPreviewName(attachment.file_name);
        setPreviewUrl(url);
      } else {
        // Open blob URL - bypasses SmartScreen/browser blocking
        window.open(url, '_blank');
      }
    }
  };

  const handleDelete = async (attachment: any) => {
    try {
      if (attachment.storage_key) {
        await supabase.storage.from('work-order-attachments').remove([attachment.storage_key]);
      }
      const { error } = await supabase.from('work_order_attachments').delete().eq('id', attachment.id);
      if (error) throw error;
      toast({ title: 'Anexo removido com sucesso!' });
      qc.invalidateQueries({ queryKey: ['work_order_attachments', workOrderId] });
    } catch (err: any) {
      toast({ title: 'Erro ao remover anexo', description: err.message, variant: 'destructive' });
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Anexos ({attachments.length})
        </CardTitle>
        <label>
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,.pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button size="sm" variant="outline" asChild disabled={uploading}>
            <span className="cursor-pointer">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
              Enviar
            </span>
          </Button>
        </label>
      </CardHeader>
      <CardContent>
        {/* 15-day deletion warning */}
        {resolvedAt && (() => {
          const resolvedDate = new Date(resolvedAt);
          const deleteDate = new Date(resolvedDate.getTime() + 15 * 24 * 60 * 60 * 1000);
          const daysLeft = Math.max(0, Math.ceil((deleteDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
          if (daysLeft <= 15) {
            return (
              <div className="mb-3 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {daysLeft > 0
                    ? `Os arquivos desta OS serão removidos automaticamente em ${daysLeft} dia(s) após a conclusão para economia de armazenamento.`
                    : 'Os arquivos desta OS estão programados para exclusão.'}
                </p>
              </div>
            );
          }
          return null;
        })()}
        <p className="text-[10px] text-muted-foreground mb-3">Limite: 10 MB por arquivo (PNG, JPG, PDF, Word, Excel)</p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum anexo.</p>
        ) : (
          <div className="space-y-2">
            {attachments.map((att: any) => {
              const Icon = getIcon(att.mime_type);
              const isImage = att.mime_type?.startsWith('image');
              return (
                <div
                  key={att.id}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => handlePreview(att)}
                  title="Clique para visualizar"
                >
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{att.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(att.size)} • {new Date(att.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); handleDownload(att); }}
                    title="Baixar"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => e.stopPropagation()}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir anexo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O arquivo "{att.file_name}" será removido permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(att)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Image preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => { if (!open) setPreviewUrl(null); }}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">{previewName}</DialogTitle>
          {previewUrl && (
            <img src={previewUrl} alt={previewName} className="w-full h-auto max-h-[80vh] object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
