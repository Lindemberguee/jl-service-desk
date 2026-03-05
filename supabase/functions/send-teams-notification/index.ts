import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-trigger, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/* ── Color & Style Tokens ──────────────────────────────────────── */

const COLORS = {
  primary: '#6366F1',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  muted: '#94A3B8',
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
};

const BRAND = {
  name: 'OrdFy',
  tagline: 'Sistema de Gestão de Manutenção',
};

/* ── Timestamp Helper ──────────────────────────────────────────── */

function nowBRT(): string {
  const d = new Date();
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ── Modern Adaptive Card Builders ─────────────────────────────── */

function buildTestCard() {
  return wrapCard({
    accentColor: COLORS.success,
    icon: '✅',
    title: 'Conexão com Teams Validada!',
    subtitle: 'Seu webhook está configurado corretamente.',
    sections: [
      factSection([
        { title: 'Status', value: '🟢 Conectado' },
        { title: 'Horário', value: nowBRT() },
        { title: 'Sistema', value: BRAND.name },
      ]),
    ],
  });
}

function buildOsCreatedCard(code: string, title: string, description?: string, attachments?: { name: string; url: string }[]) {
  const sections: any[] = [
    factSection([
      { title: 'Código', value: code || '—' },
      { title: 'Título', value: title || '—' },
      { title: 'Status', value: '🔵 Aberta' },
      { title: 'Registrado em', value: nowBRT() },
    ]),
  ];

  if (description) {
    sections.push(descriptionBlock(description));
  }
  if (attachments && attachments.length > 0) {
    sections.push(attachmentsBlock(attachments));
  }

  return wrapCard({
    accentColor: COLORS.info,
    icon: '📋',
    title: 'Nova Ordem de Serviço',
    subtitle: `${code} foi criada e atribuída a um técnico`,
    sections,
  });
}

function buildOsStatusChangedCard(code: string, title: string, status: string, description?: string, attachments?: { name: string; url: string }[]) {
  const statusIcons: Record<string, string> = {
    'Aberta': '🔵', 'Em Triagem': '🟡', 'Em Execução': '🟠', 'Aguardando Peça': '⏳',
    'Aguardando Solicitante': '⏳', 'Aguardando Terceiro': '⏳',
    'Concluída': '🟢', 'Aprovada': '✅', 'Encerrada': '⚫', 'Reaberta': '🔴',
  };
  const icon = statusIcons[status] || '🔄';

  const sections: any[] = [
    factSection([
      { title: 'Código', value: code || '—' },
      { title: 'Título', value: title || '—' },
      { title: 'Novo Status', value: `${icon} ${status}` },
      { title: 'Atualizado em', value: nowBRT() },
    ]),
  ];

  if (description) {
    sections.push(descriptionBlock(description));
  }
  if (attachments && attachments.length > 0) {
    sections.push(attachmentsBlock(attachments));
  }

  return wrapCard({
    accentColor: COLORS.warning,
    icon: '🔄',
    title: 'Mudança de Status',
    subtitle: `OS ${code} teve o status atualizado`,
    sections,
  });
}

function buildStockCriticalCard(name: string, current: number, min: number) {
  const pct = min > 0 ? Math.round((current / min) * 100) : 0;
  const urgency = pct <= 25 ? '🔴 URGENTE' : pct <= 50 ? '🟠 BAIXO' : '🟡 ATENÇÃO';

  return wrapCard({
    accentColor: COLORS.danger,
    icon: '🚨',
    title: 'Alerta de Estoque Crítico',
    subtitle: `O item "${name}" atingiu o nível mínimo`,
    sections: [
      factSection([
        { title: 'Item', value: name || '—' },
        { title: 'Nível Atual', value: `${current} unidades` },
        { title: 'Nível Mínimo', value: `${min} unidades` },
        { title: 'Urgência', value: urgency },
        { title: 'Detectado em', value: nowBRT() },
      ]),
      progressBar(pct),
    ],
  });
}

function buildNewUserCard(userName: string, userEmail: string, role: string) {
  const roleLabels: Record<string, string> = {
    super_admin: '👑 Super Admin', admin: '🛡️ Administrador', coordenador: '📊 Coordenador',
    tecnico: '🔧 Técnico', analista: '📈 Analista', solicitante: '📝 Solicitante',
  };

  return wrapCard({
    accentColor: COLORS.primary,
    icon: '👤',
    title: 'Novo Usuário Cadastrado',
    subtitle: `${userName} foi adicionado ao departamento`,
    sections: [
      factSection([
        { title: 'Nome', value: userName || '—' },
        { title: 'E-mail', value: userEmail || '—' },
        { title: 'Perfil', value: roleLabels[role] || role || '—' },
        { title: 'Cadastrado em', value: nowBRT() },
      ]),
    ],
  });
}

function buildMaintenanceCard(assetName: string, maintenanceTitle: string, scheduledAt: string) {
  return wrapCard({
    accentColor: '#0EA5E9',
    icon: '🔧',
    title: 'Manutenção Preventiva Programada',
    subtitle: 'Uma manutenção está próxima e requer atenção',
    sections: [
      factSection([
        { title: 'Ativo', value: assetName || '—' },
        { title: 'Manutenção', value: maintenanceTitle || '—' },
        { title: 'Data Programada', value: scheduledAt || '—' },
        { title: 'Lembrete em', value: nowBRT() },
      ]),
    ],
  });
}

function buildSlaWarningCard(code: string, title: string, slaType: string, pctUsed: number) {
  const severity = pctUsed >= 95 ? '🔴 CRÍTICO' : pctUsed >= 90 ? '🟠 ALTO' : '🟡 ATENÇÃO';
  const accentColor = pctUsed >= 95 ? COLORS.danger : pctUsed >= 90 ? '#F97316' : COLORS.warning;

  return wrapCard({
    accentColor,
    icon: '⏰',
    title: 'Alerta de SLA',
    subtitle: `OS ${code} está com ${pctUsed}% do prazo consumido`,
    sections: [
      factSection([
        { title: 'OS', value: `${code} — ${title}` },
        { title: 'Tipo SLA', value: slaType === 'response' ? '⚡ Resposta' : '🔧 Solução' },
        { title: 'Prazo Consumido', value: `${pctUsed}%` },
        { title: 'Severidade', value: severity },
        { title: 'Verificado em', value: nowBRT() },
      ]),
      progressBar(pctUsed),
    ],
  });
}

/* ── Shared Card Components ────────────────────────────────────── */

function factSection(facts: { title: string; value: string }[]) {
  return {
    type: 'FactSet',
    facts: facts.map(f => ({ title: f.title, value: f.value })),
    separator: true,
    spacing: 'Medium',
  };
}

function descriptionBlock(description: string) {
  const truncated = description.length > 300 ? description.substring(0, 300) + '...' : description;
  return {
    type: 'Container',
    separator: true,
    spacing: 'Medium',
    items: [
      { type: 'TextBlock', text: '📝 **Descrição**', size: 'Small', weight: 'Bolder', spacing: 'None' },
      { type: 'TextBlock', text: truncated, wrap: true, size: 'Small', isSubtle: true, spacing: 'Small' },
    ],
  };
}

function attachmentsBlock(attachments: { name: string; url: string }[]) {
  const items: any[] = [
    { type: 'TextBlock', text: `📎 **Anexos (${attachments.length})**`, size: 'Small', weight: 'Bolder', spacing: 'None' },
  ];
  for (const att of attachments.slice(0, 5)) {
    items.push({
      type: 'TextBlock',
      text: `[${att.name}](${att.url})`,
      size: 'Small',
      wrap: true,
      spacing: 'None',
    });
  }
  if (attachments.length > 5) {
    items.push({ type: 'TextBlock', text: `_...e mais ${attachments.length - 5} arquivo(s)_`, size: 'Small', isSubtle: true, spacing: 'None' });
  }
  return { type: 'Container', separator: true, spacing: 'Medium', items };
}


  const filled = Math.min(Math.max(Math.round(pct / 5), 0), 20);
  const empty = 20 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const color = pct >= 90 ? 'Attention' : pct >= 70 ? 'Warning' : 'Good';
  return {
    type: 'Container',
    spacing: 'Small',
    items: [{
      type: 'TextBlock',
      text: `${bar} ${pct}%`,
      fontType: 'Monospace',
      size: 'Small',
      color,
      wrap: false,
    }],
  };
}

function wrapCard(opts: {
  accentColor: string;
  icon: string;
  title: string;
  subtitle: string;
  sections: any[];
  actions?: any[];
}) {
  const body: any[] = [
    // Header with colored accent strip
    {
      type: 'Container',
      style: 'emphasis',
      bleed: true,
      items: [
        {
          type: 'ColumnSet',
          columns: [
            {
              type: 'Column',
              width: 'auto',
              items: [{
                type: 'TextBlock',
                text: opts.icon,
                size: 'ExtraLarge',
                horizontalAlignment: 'Center',
              }],
              verticalContentAlignment: 'Center',
            },
            {
              type: 'Column',
              width: 'stretch',
              items: [
                { type: 'TextBlock', text: opts.title, weight: 'Bolder', size: 'Medium', wrap: true },
                { type: 'TextBlock', text: opts.subtitle, spacing: 'None', isSubtle: true, size: 'Small', wrap: true },
              ],
            },
          ],
        },
      ],
    },
    // Sections
    ...opts.sections,
    // Footer
    {
      type: 'Container',
      separator: true,
      spacing: 'Medium',
      items: [{
        type: 'ColumnSet',
        columns: [
          {
            type: 'Column',
            width: 'stretch',
            items: [{
              type: 'TextBlock',
              text: `${BRAND.name} • ${BRAND.tagline}`,
              isSubtle: true,
              size: 'Small',
              wrap: true,
              horizontalAlignment: 'Left',
            }],
          },
        ],
      }],
    },
  ];

  return {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.5',
        body,
        actions: opts.actions || [],
        msteams: { width: 'Full' },
      },
    }],
  };
}

/* ── Resolve webhook URL (per-event channels) ───────────────────── */

function resolveWebhookUrl(settings: any, type: string): string {
  if ((type === 'os_created' || type === 'os_status_changed' || type === 'sla_warning') && settings.webhook_url_os) {
    return settings.webhook_url_os;
  }
  if (type === 'stock_critical' && settings.webhook_url_stock) {
    return settings.webhook_url_stock;
  }
  if (type === 'maintenance' && settings.webhook_url_maintenance) {
    return settings.webhook_url_maintenance;
  }
  return settings.webhook_url;
}

/* ── Log helper ─────────────────────────────────────────────────── */

async function logTeamsNotification(
  adminClient: any,
  tenantId: string,
  type: string,
  webhookUrl: string,
  status: 'sent' | 'failed',
  errorMessage?: string,
  payload?: any,
) {
  try {
    await adminClient.from('teams_notification_logs').insert({
      tenant_id: tenantId,
      notification_type: type,
      webhook_url: webhookUrl ? webhookUrl.substring(0, 120) + '...' : null,
      status,
      error_message: errorMessage || null,
      payload: payload ? { type, ...payload } : { type },
    });
  } catch (e) {
    console.error('Failed to log teams notification:', e);
  }
}

/* ── Main handler ───────────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const isInternalTrigger = req.headers.get('x-internal-trigger') === 'true';

    if (!isInternalTrigger) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      }
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
      const { error: claimsError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (claimsError) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { type, tenant_id, work_order_code, work_order_title, work_order_description, status_label, item_name, current_level, min_level,
      user_name, user_email, role, asset_name, maintenance_title, scheduled_at, sla_type, pct_used } = body;

    if (!tenant_id) {
      return new Response(JSON.stringify({ success: false, error: 'tenant_id is required' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: settings, error: settingsError } = await adminClient.from('tenant_teams_settings').select('*').eq('tenant_id', tenant_id).single();

    if (settingsError || !settings) {
      return new Response(JSON.stringify({ success: false, error: 'Configurações do Teams não encontradas' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!settings.is_active && type !== 'test') {
      return new Response(JSON.stringify({ success: false, error: 'Integração Teams desativada' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const webhookUrl = resolveWebhookUrl(settings, type);
    if (!webhookUrl) {
      await logTeamsNotification(adminClient, tenant_id, type, '', 'failed', 'Webhook URL não configurada', body);
      return new Response(JSON.stringify({ success: false, error: 'Webhook URL não configurada' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let card: any;
    switch (type) {
      case 'test': card = buildTestCard(); break;
      case 'os_created': card = buildOsCreatedCard(work_order_code || '', work_order_title || ''); break;
      case 'os_status_changed': card = buildOsStatusChangedCard(work_order_code || '', work_order_title || '', status_label || ''); break;
      case 'stock_critical': card = buildStockCriticalCard(item_name || '', current_level ?? 0, min_level ?? 0); break;
      case 'new_user': card = buildNewUserCard(user_name || '', user_email || '', role || ''); break;
      case 'maintenance': card = buildMaintenanceCard(asset_name || '', maintenance_title || '', scheduled_at || ''); break;
      case 'sla_warning': card = buildSlaWarningCard(work_order_code || '', work_order_title || '', sla_type || 'solution', pct_used ?? 80); break;
      default: card = wrapCard({ accentColor: COLORS.primary, icon: '📬', title: 'Notificação do Sistema', subtitle: 'Uma nova notificação foi gerada', sections: [] });
    }

    const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(card) });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Teams webhook error: ${response.status} - ${errText}`);
      await logTeamsNotification(adminClient, tenant_id, type, webhookUrl, 'failed', `HTTP ${response.status}: ${errText.substring(0, 200)}`, body);
      return new Response(JSON.stringify({ success: false, error: `Webhook retornou ${response.status}` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await logTeamsNotification(adminClient, tenant_id, type, webhookUrl, 'sent', undefined, body);
    console.log(`Teams notification sent: type=${type}, tenant=${tenant_id}`);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Teams notification error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
