import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import nodemailer from "npm:nodemailer@6.9.9";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-trigger',
};

/* ── Rate limiter (per tenant, in-memory) ───────────────────────── */

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW = 60000;

function checkRateLimit(tenantId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(tenantId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(tenantId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

/* ── Shared layout ──────────────────────────────────────────────── */

function emailLayout(opts: {
  headerBg: string;
  headerIcon: string;
  headerTitle: string;
  bodyHtml: string;
  footerText?: string;
  brandName?: string;
}) {
  const { headerBg, headerIcon, headerTitle, bodyHtml, footerText, brandName = 'OrdFy' } = opts;
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:${headerBg};padding:32px 40px;text-align:center;">
          <div style="font-size:36px;margin-bottom:8px;">${headerIcon}</div>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${headerTitle}</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">${bodyHtml}</td></tr>
        <tr><td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(90deg,transparent,#e2e8f0,transparent);"></div></td></tr>
        <tr><td style="padding:24px 40px;text-align:center;">
          ${footerText ? `<p style="margin:0 0 12px;font-size:13px;color:#64748b;">${footerText}</p>` : ''}
          <p style="margin:0;font-size:12px;color:#94a3b8;">Enviado por <strong style="color:#3b82f6;">${brandName}</strong> · ${year}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;">Este é um e-mail automático. Por favor, não responda diretamente.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function infoRow(label: string, value: string, iconColor = '#3b82f6') {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
    <tr>
      <td width="8" style="background:${iconColor};border-radius:4px;"></td>
      <td style="padding:12px 16px;background:#f8fafc;border-radius:0 8px 8px 0;">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;font-weight:600;">${label}</span><br/>
        <span style="font-size:15px;color:#1e293b;font-weight:600;">${value}</span>
      </td>
    </tr>
  </table>`;
}

function statusBadge(label: string, color: string) {
  return `<span style="display:inline-block;padding:6px 16px;border-radius:20px;background:${color};color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.3px;">${label}</span>`;
}

/* ── Template builders ──────────────────────────────────────────── */

function buildTestEmail(smtp: any) {
  return emailLayout({
    headerBg: 'linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%)',
    headerIcon: '✅',
    headerTitle: 'Configuração SMTP Validada',
    bodyHtml: `
      <div style="text-align:center;padding:8px 0 16px;">
        <p style="font-size:16px;color:#334155;margin:0 0 16px;">Seu servidor de e-mail está configurado e funcionando perfeitamente!</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:0 0 16px;">
          <p style="margin:0;color:#166534;font-size:14px;font-weight:600;">🎉 Tudo pronto para enviar notificações</p>
        </div>
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:4px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Detalhes da Conexão</p>
          <p style="margin:0 0 4px;font-size:13px;color:#475569;">🔗 <strong>Host:</strong> ${smtp.smtp_host}:${smtp.smtp_port}</p>
          <p style="margin:0 0 4px;font-size:13px;color:#475569;">🔐 <strong>TLS:</strong> ${smtp.use_tls ? 'Ativado' : 'Desativado'}</p>
          <p style="margin:0;font-size:13px;color:#475569;">📧 <strong>Conta:</strong> ${smtp.smtp_user}</p>
        </td></tr>
      </table>`,
    footerText: 'Este e-mail confirma que suas configurações estão corretas.',
  });
}

function buildOsCreatedEmail(code: string, title: string) {
  return emailLayout({
    headerBg: 'linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%)',
    headerIcon: '📋',
    headerTitle: 'Nova Ordem de Serviço',
    bodyHtml: `
      <p style="font-size:15px;color:#475569;margin:0 0 20px;line-height:1.6;">
        Uma nova ordem de serviço foi <strong style="color:#1e293b;">criada e atribuída a você</strong>. Confira os detalhes abaixo:
      </p>
      ${infoRow('Código da OS', code, '#3b82f6')}
      ${infoRow('Título', title, '#3b82f6')}
      <div style="text-align:center;margin:24px 0 8px;">
        <p style="margin:0;font-size:13px;color:#64748b;">Acesse o sistema para visualizar os detalhes completos e iniciar o atendimento.</p>
      </div>`,
    footerText: 'Acesse o sistema para mais detalhes sobre esta OS.',
  });
}

function buildOsStatusChangedEmail(code: string, title: string, status: string) {
  const statusColors: Record<string, string> = {
    'Aberta': '#3b82f6', 'Em Triagem': '#6366f1', 'Em Execução': '#f59e0b',
    'Aguardando Peça': '#f97316', 'Aguardando Solicitante': '#8b5cf6',
    'Aguardando Terceiro': '#ec4899', 'Concluída': '#22c55e',
    'Aprovada': '#10b981', 'Encerrada': '#6b7280', 'Reaberta': '#ef4444',
  };
  const badgeColor = statusColors[status] || '#6b7280';

  return emailLayout({
    headerBg: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)',
    headerIcon: '🔄',
    headerTitle: 'Atualização de Status',
    bodyHtml: `
      <p style="font-size:15px;color:#475569;margin:0 0 20px;line-height:1.6;">O status da ordem de serviço foi atualizado.</p>
      ${infoRow('Ordem de Serviço', `${code} — ${title}`, '#f59e0b')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
        <tr>
          <td width="8" style="background:#f59e0b;border-radius:4px;"></td>
          <td style="padding:12px 16px;background:#f8fafc;border-radius:0 8px 8px 0;">
            <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;font-weight:600;">Novo Status</span><br/>
            <div style="margin-top:6px;">${statusBadge(status, badgeColor)}</div>
          </td>
        </tr>
      </table>`,
    footerText: 'Você recebeu este e-mail porque está envolvido nesta OS.',
  });
}

function buildStockCriticalEmail(name: string, current: number, min: number) {
  const pct = min > 0 ? Math.round((current / min) * 100) : 0;
  const barColor = pct <= 25 ? '#ef4444' : pct <= 50 ? '#f59e0b' : '#f97316';

  return emailLayout({
    headerBg: 'linear-gradient(135deg,#ef4444 0%,#dc2626 100%)',
    headerIcon: '🚨',
    headerTitle: 'Alerta de Estoque Crítico',
    bodyHtml: `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0;font-size:14px;color:#991b1b;font-weight:600;">⚠️ Um item atingiu o nível mínimo de estoque.</p>
      </div>
      ${infoRow('Item', name, '#ef4444')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
        <tr>
          <td width="8" style="background:#ef4444;border-radius:4px;"></td>
          <td style="padding:12px 16px;background:#f8fafc;border-radius:0 8px 8px 0;">
            <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;font-weight:600;">Nível Atual / Mínimo</span><br/>
            <span style="font-size:22px;color:#ef4444;font-weight:800;">${current}</span>
            <span style="font-size:14px;color:#94a3b8;"> / ${min}</span>
            <div style="margin-top:8px;background:#e2e8f0;border-radius:6px;height:8px;overflow:hidden;">
              <div style="width:${Math.min(pct, 100)}%;height:100%;background:${barColor};border-radius:6px;"></div>
            </div>
          </td>
        </tr>
      </table>`,
    footerText: 'Providencie a reposição o mais breve possível.',
  });
}

function buildNewUserEmail(userName: string, userEmail: string, role: string) {
  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin', admin: 'Administrador', coordenador: 'Coordenador',
    tecnico: 'Técnico', analista: 'Analista', solicitante: 'Solicitante',
  };
  return emailLayout({
    headerBg: 'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)',
    headerIcon: '👤',
    headerTitle: 'Novo Usuário Cadastrado',
    bodyHtml: `
      <p style="font-size:15px;color:#475569;margin:0 0 20px;line-height:1.6;">
        Um novo membro foi adicionado ao seu departamento.
      </p>
      ${infoRow('Nome', userName, '#8b5cf6')}
      ${infoRow('E-mail', userEmail, '#8b5cf6')}
      ${infoRow('Perfil', roleLabels[role] || role, '#8b5cf6')}
      <div style="text-align:center;margin:24px 0 8px;">
        <p style="margin:0;font-size:13px;color:#64748b;">Acesse o painel de usuários para gerenciar permissões.</p>
      </div>`,
    footerText: 'Você recebeu este alerta por ser administrador.',
  });
}

function buildMaintenanceEmail(assetName: string, maintenanceTitle: string, scheduledAt: string) {
  return emailLayout({
    headerBg: 'linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%)',
    headerIcon: '🔧',
    headerTitle: 'Manutenção Preventiva Próxima',
    bodyHtml: `
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0;font-size:14px;color:#075985;font-weight:600;">📅 Uma manutenção preventiva está programada para os próximos dias.</p>
      </div>
      ${infoRow('Ativo', assetName, '#0ea5e9')}
      ${infoRow('Manutenção', maintenanceTitle, '#0ea5e9')}
      ${infoRow('Data Programada', scheduledAt, '#0ea5e9')}`,
    footerText: 'Prepare-se antecipadamente para esta manutenção.',
  });
}

function buildSlaWarningEmail(code: string, title: string, slaType: string, pctUsed: number) {
  const urgencyColor = pctUsed >= 90 ? '#ef4444' : '#f59e0b';
  return emailLayout({
    headerBg: `linear-gradient(135deg,${urgencyColor} 0%,${pctUsed >= 90 ? '#dc2626' : '#d97706'} 100%)`,
    headerIcon: '⏰',
    headerTitle: 'Alerta de SLA',
    bodyHtml: `
      <div style="background:${pctUsed >= 90 ? '#fef2f2' : '#fffbeb'};border:1px solid ${pctUsed >= 90 ? '#fecaca' : '#fde68a'};border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0;font-size:14px;color:${pctUsed >= 90 ? '#991b1b' : '#92400e'};font-weight:600;">
          ⚠️ A OS está com ${pctUsed}% do prazo de ${slaType === 'response' ? 'resposta' : 'solução'} consumido.
        </p>
      </div>
      ${infoRow('OS', `${code} — ${title}`, urgencyColor)}
      ${infoRow('Tipo SLA', slaType === 'response' ? 'Tempo de Resposta' : 'Tempo de Solução', urgencyColor)}
      ${infoRow('Prazo Consumido', `${pctUsed}%`, urgencyColor)}
      <div style="margin-top:8px;background:#e2e8f0;border-radius:6px;height:10px;overflow:hidden;">
        <div style="width:${Math.min(pctUsed, 100)}%;height:100%;background:${urgencyColor};border-radius:6px;"></div>
      </div>`,
    footerText: 'Tome as providências necessárias para evitar o estouro do SLA.',
  });
}

/* ── Build email content based on type ─────────────────────────── */

function buildEmailContent(type: string, body: any, smtp: any): { subject: string; html: string } {
  const { work_order_code, work_order_title, status_label, item_name, current_level, min_level,
    user_name, user_email, role, asset_name, maintenance_title, scheduled_at,
    sla_type, pct_used, subject, html_body } = body;

  switch (type) {
    case 'test':
      return { subject: '✅ Teste de Configuração SMTP', html: buildTestEmail(smtp) };
    case 'os_created':
      return { subject: `📋 Nova OS: ${work_order_code} — ${work_order_title}`, html: buildOsCreatedEmail(work_order_code || '', work_order_title || '') };
    case 'os_status_changed':
      return { subject: `🔄 OS ${work_order_code} — Status: ${status_label}`, html: buildOsStatusChangedEmail(work_order_code || '', work_order_title || '', status_label || '') };
    case 'stock_critical':
      return { subject: `🚨 Estoque Crítico: ${item_name}`, html: buildStockCriticalEmail(item_name || '', current_level ?? 0, min_level ?? 0) };
    case 'new_user':
      return { subject: `👤 Novo Usuário: ${user_name}`, html: buildNewUserEmail(user_name || '', user_email || '', role || '') };
    case 'maintenance':
      return { subject: `🔧 Manutenção Próxima: ${asset_name}`, html: buildMaintenanceEmail(asset_name || '', maintenance_title || '', scheduled_at || '') };
    case 'sla_warning':
      return { subject: `⏰ Alerta SLA: OS ${work_order_code}`, html: buildSlaWarningEmail(work_order_code || '', work_order_title || '', sla_type || 'solution', pct_used ?? 80) };
    default:
      return { subject: subject || 'Notificação do Sistema', html: html_body || '' };
  }
}

/* ── Send a single email and log result ─────────────────────────── */

async function sendAndLog(
  adminClient: any, smtp: any, recipientEmail: string, emailSubject: string,
  emailHtml: string, tenantId: string, emailType: string, queueId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: smtp.smtp_host, port: smtp.smtp_port,
      secure: smtp.smtp_port === 465,
      auth: { user: smtp.smtp_user, pass: smtp.smtp_pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    });

    const fromEmail = smtp.smtp_from_email || smtp.smtp_user;
    const fromName = smtp.smtp_from_name || 'OrdFy';

    await transporter.sendMail({
      from: `"${fromName}" <${smtp.smtp_user}>`,
      replyTo: fromEmail !== smtp.smtp_user ? `"${fromName}" <${fromEmail}>` : undefined,
      to: recipientEmail, subject: emailSubject, html: emailHtml,
    });

    await adminClient.from('email_logs').insert({
      tenant_id: tenantId, queue_id: queueId || null, email_type: emailType,
      to_email: recipientEmail, subject: emailSubject, status: 'sent', smtp_host: smtp.smtp_host,
    });
    return { success: true };
  } catch (err: any) {
    await adminClient.from('email_logs').insert({
      tenant_id: tenantId, queue_id: queueId || null, email_type: emailType,
      to_email: recipientEmail, subject: emailSubject, status: 'failed',
      error_message: err.message || 'Unknown error', smtp_host: smtp.smtp_host,
    });
    return { success: false, error: err.message };
  }
}

/* ── Process retry queue ────────────────────────────────────────── */

async function processRetryQueue(adminClient: any) {
  const { data: pending } = await adminClient
    .from('email_queue').select('*')
    .in('status', ['pending', 'retrying'])
    .lte('next_retry_at', new Date().toISOString())
    .lt('attempts', 3).order('created_at', { ascending: true }).limit(10);

  if (!pending || pending.length === 0) return;

  for (const item of pending) {
    await adminClient.from('email_queue').update({
      status: 'processing', processed_at: new Date().toISOString(), attempts: item.attempts + 1,
    }).eq('id', item.id);

    const { data: smtp } = await adminClient.from('tenant_smtp_settings').select('*')
      .eq('tenant_id', item.tenant_id).eq('is_active', true).single();

    if (!smtp) {
      await adminClient.from('email_queue').update({
        status: 'failed', last_error: 'SMTP não configurado', completed_at: new Date().toISOString(),
      }).eq('id', item.id);
      continue;
    }

    const { subject, html } = buildEmailContent(item.email_type, item.payload, smtp);
    const result = await sendAndLog(adminClient, smtp, item.to_email, subject, html, item.tenant_id, item.email_type, item.id);

    if (result.success) {
      await adminClient.from('email_queue').update({ status: 'sent', completed_at: new Date().toISOString() }).eq('id', item.id);
    } else {
      const newAttempts = item.attempts + 1;
      if (newAttempts >= item.max_attempts) {
        await adminClient.from('email_queue').update({ status: 'failed', last_error: result.error, completed_at: new Date().toISOString() }).eq('id', item.id);
      } else {
        const delayMs = 30000 * Math.pow(4, newAttempts - 1);
        await adminClient.from('email_queue').update({ status: 'retrying', last_error: result.error, next_retry_at: new Date(Date.now() + delayMs).toISOString() }).eq('id', item.id);
      }
    }
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
      const token = authHeader.replace('Bearer ', '');
      const { error: claimsError } = await supabase.auth.getUser(token);
      if (claimsError) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { type, tenant_id, to_email } = body;

    if (!tenant_id) {
      return new Response(JSON.stringify({ success: false, error: 'tenant_id is required' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    processRetryQueue(adminClient).catch(err => console.warn('Retry queue error:', err));

    if (!checkRateLimit(tenant_id)) {
      await adminClient.from('email_queue').insert({ tenant_id, email_type: type || 'custom', to_email: to_email || '', payload: body, status: 'pending', next_retry_at: new Date(Date.now() + 60000).toISOString() });
      return new Response(JSON.stringify({ success: true, queued: true, message: 'Rate limit atingido, e-mail adicionado à fila' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: smtp, error: smtpError } = await adminClient.from('tenant_smtp_settings').select('*').eq('tenant_id', tenant_id).single();

    if (smtpError || !smtp) {
      return new Response(JSON.stringify({ success: false, error: 'Configurações SMTP não encontradas' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!smtp.is_active && type !== 'test') {
      return new Response(JSON.stringify({ success: false, error: 'Envio de e-mail desativado' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const recipientEmail = type === 'test' ? smtp.smtp_user : (to_email || smtp.smtp_from_email);
    const { subject: emailSubject, html: emailHtml } = buildEmailContent(type, body, smtp);
    const result = await sendAndLog(adminClient, smtp, recipientEmail, emailSubject, emailHtml, tenant_id, type || 'custom');

    if (result.success) {
      console.log(`Email sent: type=${type}, to=${recipientEmail}`);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (type !== 'test') {
      await adminClient.from('email_queue').insert({ tenant_id, email_type: type || 'custom', to_email: recipientEmail, subject: emailSubject, payload: body, status: 'retrying', attempts: 1, last_error: result.error, next_retry_at: new Date(Date.now() + 30000).toISOString() });
      return new Response(JSON.stringify({ success: false, queued: true, error: result.error, message: 'Falha no envio. E-mail adicionado à fila de retry.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: false, error: result.error || 'Erro ao enviar e-mail' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Email send error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message || 'Erro ao enviar e-mail' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
