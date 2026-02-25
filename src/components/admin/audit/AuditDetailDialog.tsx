import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { actionLabels, entityLabels, parseUserAgent, type AuditLog } from './AuditConstants';

interface Props {
  log: AuditLog | null;
  onClose: () => void;
  getActorName: (id: string | null) => string;
  getActorEmail: (id: string | null) => string | null;
  getTenantName: (id: string | null) => string;
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-xs font-medium ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

export default function AuditDetailDialog({ log, onClose, getActorName, getActorEmail, getTenantName }: Props) {
  if (!log) return null;
  const ua = parseUserAgent(log.user_agent);

  return (
    <Dialog open={!!log} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Detalhes do Evento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Ação" value={actionLabels[log.action] || log.action} />
            <DetailField label="Entidade" value={entityLabels[log.entity] || log.entity} />
            <DetailField label="Data/Hora" value={format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })} />
            <DetailField label="Departamento" value={getTenantName(log.tenant_id)} />
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-[11px] text-muted-foreground font-medium mb-2 uppercase tracking-wider">Usuário</p>
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Nome" value={getActorName(log.actor_user_id)} />
              <DetailField label="Email" value={getActorEmail(log.actor_user_id) || '—'} />
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-[11px] text-muted-foreground font-medium mb-2 uppercase tracking-wider">Conexão</p>
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Endereço IP" value={log.ip || '—'} mono />
              <DetailField label="Navegador" value={ua.browser} />
              <DetailField label="Sistema Operacional" value={ua.os} />
              <DetailField label="Dispositivo" value={ua.device} />
            </div>
            {log.user_agent && (
              <div className="mt-2">
                <p className="text-[10px] text-muted-foreground mb-0.5">User Agent completo</p>
                <p className="text-[10px] font-mono bg-muted p-2 rounded-md break-all text-muted-foreground">{log.user_agent}</p>
              </div>
            )}
          </div>

          {log.diff && Object.keys(log.diff).length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-[11px] text-muted-foreground font-medium mb-2 uppercase tracking-wider">Detalhes / Alterações</p>
              <div className="bg-muted rounded-lg p-3 space-y-1">
                {Object.entries(log.diff).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-medium">{key}</span>
                    <span className="font-mono text-foreground">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {log.entity_id && (
            <div className="border-t border-border pt-3">
              <DetailField label="ID da Entidade" value={log.entity_id} mono />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
