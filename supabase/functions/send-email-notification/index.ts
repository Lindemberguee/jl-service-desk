import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import nodemailer from "npm:nodemailer@6.9.9";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { type, tenant_id, to_email, subject, html_body, work_order_code, work_order_title, status_label, item_name, current_level, min_level } = body;

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: smtp, error: smtpError } = await adminClient
      .from('tenant_smtp_settings')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single();

    if (smtpError || !smtp) {
      return new Response(JSON.stringify({ success: false, error: 'Configurações SMTP não encontradas' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!smtp.is_active && type !== 'test') {
      return new Response(JSON.stringify({ success: false, error: 'Envio de e-mail desativado' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let emailSubject = subject || 'Notificação do Sistema';
    let emailHtml = html_body || '';
    let recipientEmail = to_email || smtp.smtp_from_email;

    if (type === 'test') {
      emailSubject = '✅ Teste de Configuração SMTP';
      emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:12px;padding:24px;color:white;text-align:center;margin-bottom:20px;">
            <h1 style="margin:0;font-size:20px;">✅ Configuração SMTP Validada</h1>
          </div>
          <div style="background:#f8fafc;border-radius:8px;padding:20px;border:1px solid #e2e8f0;">
            <p style="color:#334155;margin:0;">Seu servidor SMTP está configurado corretamente.</p>
            <p style="color:#94a3b8;font-size:12px;margin-top:12px;">Host: ${smtp.smtp_host}:${smtp.smtp_port} | TLS: ${smtp.use_tls ? 'Sim' : 'Não'}</p>
          </div>
        </div>`;
      recipientEmail = smtp.smtp_from_email;
    } else if (type === 'os_created') {
      emailSubject = `📋 Nova OS: ${work_order_code} — ${work_order_title}`;
      emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:12px;padding:24px;color:white;margin-bottom:20px;">
            <h1 style="margin:0;font-size:18px;">📋 Nova Ordem de Serviço</h1>
          </div>
          <div style="background:#f8fafc;border-radius:8px;padding:20px;border:1px solid #e2e8f0;">
            <p style="color:#334155;margin:0 0 8px;"><strong>Código:</strong> ${work_order_code}</p>
            <p style="color:#334155;margin:0 0 8px;"><strong>Título:</strong> ${work_order_title}</p>
            <p style="color:#64748b;margin:0;">Uma nova OS foi criada/atribuída a você.</p>
          </div>
        </div>`;
    } else if (type === 'os_status_changed') {
      emailSubject = `🔄 OS ${work_order_code} — Status: ${status_label}`;
      emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px;padding:24px;color:white;margin-bottom:20px;">
            <h1 style="margin:0;font-size:18px;">🔄 Atualização de Status</h1>
          </div>
          <div style="background:#f8fafc;border-radius:8px;padding:20px;border:1px solid #e2e8f0;">
            <p style="color:#334155;margin:0 0 8px;"><strong>OS:</strong> ${work_order_code} — ${work_order_title}</p>
            <p style="color:#334155;margin:0 0 8px;"><strong>Novo Status:</strong> ${status_label}</p>
          </div>
        </div>`;
    } else if (type === 'stock_critical') {
      emailSubject = `📦 Estoque Crítico: ${item_name}`;
      emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:12px;padding:24px;color:white;margin-bottom:20px;">
            <h1 style="margin:0;font-size:18px;">📦 Alerta de Estoque Crítico</h1>
          </div>
          <div style="background:#f8fafc;border-radius:8px;padding:20px;border:1px solid #e2e8f0;">
            <p style="color:#334155;margin:0 0 8px;"><strong>Item:</strong> ${item_name}</p>
            <p style="color:#334155;margin:0 0 8px;"><strong>Nível:</strong> ${current_level} / Mínimo: ${min_level}</p>
          </div>
        </div>`;
    }

    const transporter = nodemailer.createTransport({
      host: smtp.smtp_host,
      port: smtp.smtp_port,
      secure: smtp.smtp_port === 465,
      auth: {
        user: smtp.smtp_user,
        pass: smtp.smtp_pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.sendMail({
      from: `"${smtp.smtp_from_name || 'Sistema'}" <${smtp.smtp_from_email}>`,
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Email send error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message || 'Erro ao enviar e-mail' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
