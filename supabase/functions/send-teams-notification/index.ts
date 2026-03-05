import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-trigger',
};

/* ── Adaptive Card builders ─────────────────────────────────────── */

function buildOsCreatedCard(code: string, title: string) {
  return {
    type: "message",
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: {
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.4",
        body: [
          {
            type: "Container",
            style: "emphasis",
            items: [{
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  items: [{ type: "TextBlock", text: "📋", size: "Large" }]
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    { type: "TextBlock", text: "Nova Ordem de Serviço", weight: "Bolder", size: "Medium" },
                    { type: "TextBlock", text: "Uma nova OS foi criada e atribuída", spacing: "None", isSubtle: true, size: "Small" }
                  ]
                }
              ]
            }]
          },
          {
            type: "FactSet",
            facts: [
              { title: "Código", value: code },
              { title: "Título", value: title },
            ],
            separator: true,
            spacing: "Medium"
          }
        ],
        msteams: { width: "Full" }
      }
    }]
  };
}

function buildOsStatusChangedCard(code: string, title: string, status: string) {
  const statusColors: Record<string, string> = {
    'Aberta': 'Good', 'Em Triagem': 'Accent', 'Em Execução': 'Warning',
    'Aguardando Peça': 'Warning', 'Aguardando Solicitante': 'Accent',
    'Aguardando Terceiro': 'Accent', 'Concluída': 'Good',
    'Aprovada': 'Good', 'Encerrada': 'Default', 'Reaberta': 'Attention',
  };
  const style = statusColors[status] || 'Default';

  return {
    type: "message",
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: {
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.4",
        body: [
          {
            type: "Container",
            style: "emphasis",
            items: [{
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  items: [{ type: "TextBlock", text: "🔄", size: "Large" }]
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    { type: "TextBlock", text: "Atualização de Status", weight: "Bolder", size: "Medium" },
                    { type: "TextBlock", text: `OS ${code} — ${title}`, spacing: "None", isSubtle: true, size: "Small", wrap: true }
                  ]
                }
              ]
            }]
          },
          {
            type: "Container",
            spacing: "Medium",
            items: [{
              type: "TextBlock",
              text: `**Novo Status:** ${status}`,
              wrap: true,
              color: style
            }]
          }
        ],
        msteams: { width: "Full" }
      }
    }]
  };
}

function buildStockCriticalCard(name: string, current: number, min: number) {
  return {
    type: "message",
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: {
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.4",
        body: [
          {
            type: "Container",
            style: "attention",
            items: [{
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  items: [{ type: "TextBlock", text: "🚨", size: "Large" }]
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    { type: "TextBlock", text: "Alerta de Estoque Crítico", weight: "Bolder", size: "Medium", color: "Attention" },
                    { type: "TextBlock", text: "Um item atingiu o nível mínimo", spacing: "None", isSubtle: true, size: "Small" }
                  ]
                }
              ]
            }]
          },
          {
            type: "FactSet",
            facts: [
              { title: "Item", value: name },
              { title: "Nível Atual", value: String(current) },
              { title: "Nível Mínimo", value: String(min) },
            ],
            separator: true,
            spacing: "Medium"
          }
        ],
        msteams: { width: "Full" }
      }
    }]
  };
}

function buildTestCard() {
  return {
    type: "message",
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: {
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.4",
        body: [
          {
            type: "Container",
            style: "good",
            items: [{
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  items: [{ type: "TextBlock", text: "✅", size: "Large" }]
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    { type: "TextBlock", text: "Conexão com Teams Validada!", weight: "Bolder", size: "Medium", color: "Good" },
                    { type: "TextBlock", text: "Seu webhook está configurado e funcionando perfeitamente.", spacing: "None", isSubtle: true, size: "Small", wrap: true }
                  ]
                }
              ]
            }]
          }
        ],
        msteams: { width: "Full" }
      }
    }]
  };
}

/* ── Main handler ───────────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const isInternalTrigger = req.headers.get('x-internal-trigger') === 'true';

    if (!isInternalTrigger) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      }
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace('Bearer ', '');
      const { error: claimsError } = await supabase.auth.getUser(token);
      if (claimsError) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      }
    }

    const body = await req.json();
    const { type, tenant_id, work_order_code, work_order_title, status_label, item_name, current_level, min_level } = body;

    if (!tenant_id) {
      return new Response(JSON.stringify({ success: false, error: 'tenant_id is required' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: settings, error: settingsError } = await adminClient
      .from('tenant_teams_settings')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single();

    if (settingsError || !settings) {
      return new Response(JSON.stringify({ success: false, error: 'Configurações do Teams não encontradas' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!settings.is_active && type !== 'test') {
      return new Response(JSON.stringify({ success: false, error: 'Integração Teams desativada' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!settings.webhook_url) {
      return new Response(JSON.stringify({ success: false, error: 'Webhook URL não configurada' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let card: any;
    switch (type) {
      case 'test':
        card = buildTestCard();
        break;
      case 'os_created':
        card = buildOsCreatedCard(work_order_code || '', work_order_title || '');
        break;
      case 'os_status_changed':
        card = buildOsStatusChangedCard(work_order_code || '', work_order_title || '', status_label || '');
        break;
      case 'stock_critical':
        card = buildStockCriticalCard(item_name || '', current_level ?? 0, min_level ?? 0);
        break;
      default:
        card = { type: "message", attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content: { type: "AdaptiveCard", version: "1.4", body: [{ type: "TextBlock", text: "Notificação do sistema", wrap: true }] } }] };
    }

    const response = await fetch(settings.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Teams webhook error: ${response.status} - ${errText}`);
      return new Response(JSON.stringify({ success: false, error: `Webhook retornou ${response.status}: ${errText.substring(0, 200)}` }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Teams notification sent: type=${type}, tenant=${tenant_id}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Teams notification error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message || 'Erro ao enviar notificação' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
