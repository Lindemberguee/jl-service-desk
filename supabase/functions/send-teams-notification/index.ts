import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-trigger',
};

/* ── Adaptive Card builders ─────────────────────────────────────── */

function buildTestCard() {
  return wrapCard([{
    type: "Container", style: "good",
    items: [{ type: "ColumnSet", columns: [
      { type: "Column", width: "auto", items: [{ type: "TextBlock", text: "✅", size: "Large" }] },
      { type: "Column", width: "stretch", items: [
        { type: "TextBlock", text: "Conexão com Teams Validada!", weight: "Bolder", size: "Medium", color: "Good" },
        { type: "TextBlock", text: "Seu webhook está configurado e funcionando.", spacing: "None", isSubtle: true, size: "Small", wrap: true }
      ]}
    ]}]
  }]);
}

function buildOsCreatedCard(code: string, title: string) {
  return wrapCard([
    headerBlock("📋", "Nova Ordem de Serviço", "Uma nova OS foi criada e atribuída"),
    { type: "FactSet", facts: [{ title: "Código", value: code }, { title: "Título", value: title }], separator: true, spacing: "Medium" }
  ]);
}

function buildOsStatusChangedCard(code: string, title: string, status: string) {
  const statusColors: Record<string, string> = {
    'Aberta': 'Good', 'Em Execução': 'Warning', 'Concluída': 'Good',
    'Aprovada': 'Good', 'Encerrada': 'Default', 'Reaberta': 'Attention',
  };
  return wrapCard([
    headerBlock("🔄", "Atualização de Status", `OS ${code} — ${title}`),
    { type: "Container", spacing: "Medium", items: [{ type: "TextBlock", text: `**Novo Status:** ${status}`, wrap: true, color: statusColors[status] || 'Default' }] }
  ]);
}

function buildStockCriticalCard(name: string, current: number, min: number) {
  return wrapCard([
    { type: "Container", style: "attention", items: [{ type: "ColumnSet", columns: [
      { type: "Column", width: "auto", items: [{ type: "TextBlock", text: "🚨", size: "Large" }] },
      { type: "Column", width: "stretch", items: [
        { type: "TextBlock", text: "Alerta de Estoque Crítico", weight: "Bolder", size: "Medium", color: "Attention" },
        { type: "TextBlock", text: "Um item atingiu o nível mínimo", spacing: "None", isSubtle: true, size: "Small" }
      ]}
    ]}] },
    { type: "FactSet", facts: [{ title: "Item", value: name }, { title: "Nível Atual", value: String(current) }, { title: "Nível Mínimo", value: String(min) }], separator: true, spacing: "Medium" }
  ]);
}

function buildNewUserCard(userName: string, userEmail: string, role: string) {
  return wrapCard([
    headerBlock("👤", "Novo Usuário Cadastrado", "Um novo membro foi adicionado ao departamento"),
    { type: "FactSet", facts: [{ title: "Nome", value: userName }, { title: "E-mail", value: userEmail }, { title: "Perfil", value: role }], separator: true, spacing: "Medium" }
  ]);
}

function buildMaintenanceCard(assetName: string, maintenanceTitle: string, scheduledAt: string) {
  return wrapCard([
    headerBlock("🔧", "Manutenção Preventiva Próxima", "Prepare-se para a manutenção programada"),
    { type: "FactSet", facts: [{ title: "Ativo", value: assetName }, { title: "Manutenção", value: maintenanceTitle }, { title: "Data Programada", value: scheduledAt }], separator: true, spacing: "Medium" }
  ]);
}

function buildSlaWarningCard(code: string, title: string, slaType: string, pctUsed: number) {
  return wrapCard([
    { type: "Container", style: pctUsed >= 90 ? "attention" : "warning", items: [{ type: "ColumnSet", columns: [
      { type: "Column", width: "auto", items: [{ type: "TextBlock", text: "⏰", size: "Large" }] },
      { type: "Column", width: "stretch", items: [
        { type: "TextBlock", text: "Alerta de SLA", weight: "Bolder", size: "Medium", color: pctUsed >= 90 ? "Attention" : "Warning" },
        { type: "TextBlock", text: `OS ${code} — ${pctUsed}% do prazo consumido`, spacing: "None", isSubtle: true, size: "Small", wrap: true }
      ]}
    ]}] },
    { type: "FactSet", facts: [{ title: "OS", value: `${code} — ${title}` }, { title: "Tipo SLA", value: slaType === 'response' ? 'Resposta' : 'Solução' }, { title: "Prazo Consumido", value: `${pctUsed}%` }], separator: true, spacing: "Medium" }
  ]);
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function headerBlock(icon: string, title: string, subtitle: string) {
  return {
    type: "Container", style: "emphasis",
    items: [{ type: "ColumnSet", columns: [
      { type: "Column", width: "auto", items: [{ type: "TextBlock", text: icon, size: "Large" }] },
      { type: "Column", width: "stretch", items: [
        { type: "TextBlock", text: title, weight: "Bolder", size: "Medium" },
        { type: "TextBlock", text: subtitle, spacing: "None", isSubtle: true, size: "Small", wrap: true }
      ]}
    ]}]
  };
}

function wrapCard(body: any[]) {
  return {
    type: "message",
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: { $schema: "http://adaptivecards.io/schemas/adaptive-card.json", type: "AdaptiveCard", version: "1.4", body, msteams: { width: "Full" } }
    }]
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
    const { type, tenant_id, work_order_code, work_order_title, status_label, item_name, current_level, min_level,
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
      default: card = wrapCard([{ type: "TextBlock", text: "Notificação do sistema", wrap: true }]);
    }

    const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(card) });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Teams webhook error: ${response.status} - ${errText}`);
      return new Response(JSON.stringify({ success: false, error: `Webhook retornou ${response.status}` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Teams notification sent: type=${type}, tenant=${tenant_id}`);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Teams notification error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
