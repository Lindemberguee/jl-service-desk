import { supabase } from '@/integrations/supabase/client';

/**
 * Log an audit event to the audit_logs table.
 * Call this from any client-side operation that should be tracked.
 */
export async function logAudit(params: {
  entity: string;
  entityId?: string | null;
  action: string;
  tenantId?: string | null;
  diff?: Record<string, unknown> | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    await (supabase.from('audit_logs') as any).insert({
      entity: params.entity,
      entity_id: params.entityId || null,
      action: params.action,
      actor_user_id: user.id,
      tenant_id: params.tenantId || null,
      diff: params.diff || null,
    });
  } catch {
    // Audit logging should never block the main operation
    console.warn('Failed to log audit event:', params.action);
  }
}
