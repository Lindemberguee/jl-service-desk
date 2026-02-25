import { supabase } from '@/integrations/supabase/client';

// Cache enabled entities to avoid fetching on every audit call
let cachedEntities: string[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

async function getEnabledEntities(): Promise<string[]> {
  if (cachedEntities && Date.now() - cacheTime < CACHE_TTL) return cachedEntities;
  try {
    const { data } = await (supabase.from('audit_settings') as any)
      .select('enabled_entities')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    cachedEntities = data?.enabled_entities || null;
    cacheTime = Date.now();
    return cachedEntities || [];
  } catch {
    return []; // If fetch fails, allow all (fail open for audit)
  }
}

// Cache public IP (fetched once per session)
let cachedIp: string | null = null;
let ipFetched = false;

async function getPublicIp(): Promise<string | null> {
  if (ipFetched) return cachedIp;
  ipFetched = true;
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    cachedIp = data.ip || null;
  } catch {
    cachedIp = null;
  }
  return cachedIp;
}

/**
 * Log an audit event to the audit_logs table.
 * Captures IP and user agent automatically.
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
    // Check if entity is enabled
    const enabled = await getEnabledEntities();
    if (enabled.length > 0 && !enabled.includes(params.entity)) return;

    // Gather connection metadata
    const [ip] = await Promise.all([getPublicIp()]);
    const userAgent = navigator.userAgent || null;

    await (supabase.from('audit_logs') as any).insert({
      entity: params.entity,
      entity_id: params.entityId || null,
      action: params.action,
      actor_user_id: user.id,
      tenant_id: params.tenantId || null,
      diff: params.diff || null,
      ip,
      user_agent: userAgent,
    });
  } catch {
    // Audit logging should never block the main operation
    console.warn('Failed to log audit event:', params.action);
  }
}
