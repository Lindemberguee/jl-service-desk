import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Paperclip, Upload, Loader2, FileText, Image, Download, Trash2 } from 'lucide-react';

interface WorkOrderAttachmentsProps {
  workOrderId: string;
}

const MIME_ICONS: Record<string, typeof FileText> = {
  image: Image,
};

function getIcon(mimeType: string | null) {
  if (mimeType?.startsWith('image')) return Image;
  return FileText;
}

export function WorkOrderAttachments({ workOrderId }: WorkOrderAttachmentsProps) {
  const { currentTenantId, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentTenantId || !user) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
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
      .createSignedUrl(attachment.storage_key, 300);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
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
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum anexo.</p>
        ) : (
          <div className="space-y-2">
            {attachments.map((att: any) => {
              const Icon = getIcon(att.mime_type);
              return (
                <div
                  key={att.id}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{att.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(att.size)} • {new Date(att.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDownload(att)}
                    title="Baixar"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
