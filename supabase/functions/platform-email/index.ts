import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getWelcomeEmailHtml(data: { company_name: string; admin_name: string; admin_email: string; login_url: string; plan: string; trial_days: number }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1a56db,#0f172a);padding:40px 40px 30px;text-align:center;">
          <img src="https://jl-service-desk.lovable.app/ordfy-logo.png" alt="Ordfy" height="40" style="margin-bottom:20px;filter:brightness(0) invert(1);">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">Bem-vindo ao Ordfy! 🎉</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">Sua plataforma de gestão está pronta para uso.</p>
        </td></tr>
        
        <!-- Body -->
        <tr><td style="padding:36px 40px 20px;">
          <p style="margin:0 0 20px;color:#1e293b;font-size:15px;line-height:1.6;">
            Olá <strong>${data.admin_name}</strong>,
          </p>
          <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.7;">
            A empresa <strong>${data.company_name}</strong> foi cadastrada com sucesso na plataforma Ordfy. Abaixo estão os detalhes do seu acesso:
          </p>

          <!-- Credentials Card -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:24px;">
            <tr><td style="padding:24px;">
              <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Dados de Acesso</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:13px;width:100px;">E-mail:</td>
                  <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;">${data.admin_email}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:13px;">Plano:</td>
                  <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;">${data.plan} (${data.trial_days} dias grátis)</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- CTA Button -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 28px;">
              <a href="${data.login_url}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#1a56db,#2563eb);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:8px;box-shadow:0 4px 14px rgba(37,99,235,0.35);">
                Acessar Ordfy →
              </a>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">

          <!-- Quick Start -->
          <p style="margin:0 0 16px;color:#1e293b;font-size:14px;font-weight:600;">Primeiros passos:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:8px 0;color:#475569;font-size:13px;line-height:1.6;">
              <span style="display:inline-block;width:24px;height:24px;background:#eff6ff;color:#1a56db;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:10px;">1</span>
              Configure os departamentos da sua empresa
            </td></tr>
            <tr><td style="padding:8px 0;color:#475569;font-size:13px;line-height:1.6;">
              <span style="display:inline-block;width:24px;height:24px;background:#eff6ff;color:#1a56db;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:10px;">2</span>
              Cadastre os membros da sua equipe
            </td></tr>
            <tr><td style="padding:8px 0;color:#475569;font-size:13px;line-height:1.6;">
              <span style="display:inline-block;width:24px;height:24px;background:#eff6ff;color:#1a56db;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:10px;">3</span>
              Crie sua primeira ordem de serviço
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;line-height:1.6;">
            Este e-mail foi enviado automaticamente pela plataforma Ordfy.<br>
            Se você não solicitou este cadastro, ignore esta mensagem.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function getTestEmailHtml() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="500" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#1a56db,#0f172a);padding:30px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:20px;">✅ SMTP Configurado!</h1>
        </td></tr>
        <tr><td style="padding:30px;text-align:center;">
          <p style="margin:0 0 8px;color:#1e293b;font-size:15px;font-weight:600;">Teste de e-mail realizado com sucesso.</p>
          <p style="margin:0;color:#64748b;font-size:13px;">Sua configuração SMTP da plataforma Ordfy está funcionando corretamente.</p>
          <p style="margin:16px 0 0;color:#94a3b8;font-size:11px;">Enviado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const smtpPassword = Deno.env.get("PLATFORM_SMTP_PASSWORD");

    // Auth check - must be super_admin
    const authHeader = req.headers.get("authorization");
    let callerId: string | null = null;
    
    // Allow internal trigger (from self-service-signup)
    const isInternal = req.headers.get("x-internal-trigger") === "true";
    
    if (!isInternal) {
      if (!authHeader) return json({ error: "Não autorizado" }, 401);
      const callerClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await callerClient.auth.getUser();
      if (!user) return json({ error: "Não autorizado" }, 401);
      callerId = user.id;

      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: memberships } = await adminClient
        .from("user_memberships")
        .select("role")
        .eq("user_id", callerId)
        .eq("is_active", true);
      
      const isSuperAdmin = (memberships || []).some((m: any) => m.role === "super_admin");
      if (!isSuperAdmin) return json({ error: "Acesso restrito" }, 403);
    }

    const body = await req.json();
    const { action } = body;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get SMTP config from platform_settings
    async function getSmtpConfig() {
      const { data } = await adminClient
        .from("platform_settings")
        .select("value")
        .eq("key", "platform_smtp")
        .single();
      
      if (!data) throw new Error("SMTP não configurado");
      const config = data.value as any;
      if (!smtpPassword) throw new Error("Senha SMTP não configurada (secret PLATFORM_SMTP_PASSWORD)");
      return { ...config, password: smtpPassword };
    }

    async function sendEmail(to: string, subject: string, html: string) {
      const config = await getSmtpConfig();
      
      const client = new SMTPClient({
        connection: {
          hostname: config.host,
          port: Number(config.port),
          tls: config.use_tls !== false,
          auth: {
            username: config.user,
            password: config.password,
          },
        },
      });

      await client.send({
        from: config.from_email,
        to,
        subject,
        html,
        headers: {
          "Reply-To": config.from_email,
        },
      });

      await client.close();
    }

    switch (action) {
      // ============ GET CONFIG ============
      case "get_config": {
        const { data } = await adminClient
          .from("platform_settings")
          .select("value")
          .eq("key", "platform_smtp")
          .single();

        return json({
          config: data?.value || null,
          has_password: !!smtpPassword,
        });
      }

      // ============ SAVE CONFIG ============
      case "save_config": {
        const { host, port, user, from_email, from_name, use_tls } = body;

        const configValue = { host, port, user, from_email, from_name, use_tls };

        await adminClient
          .from("platform_settings")
          .upsert({
            key: "platform_smtp",
            value: configValue,
            updated_by: callerId,
            updated_at: new Date().toISOString(),
          }, { onConflict: "key" });

        return json({ success: true });
      }

      // ============ TEST EMAIL ============
      case "test_email": {
        const { to_email } = body;
        if (!to_email) return json({ error: "E-mail de destino obrigatório" }, 400);

        await sendEmail(to_email, "✅ Teste SMTP - Ordfy", getTestEmailHtml());
        return json({ success: true, message: "E-mail de teste enviado com sucesso!" });
      }

      // ============ SEND WELCOME EMAIL ============
      case "send_welcome": {
        const { company_name, admin_name, admin_email, login_url, plan, trial_days } = body;
        if (!admin_email) return json({ error: "E-mail obrigatório" }, 400);

        const html = getWelcomeEmailHtml({
          company_name: company_name || "Sua Empresa",
          admin_name: admin_name || "Administrador",
          admin_email,
          login_url: login_url || "https://jl-service-desk.lovable.app/login",
          plan: plan || "Starter",
          trial_days: trial_days || 14,
        });

        await sendEmail(admin_email, `Bem-vindo ao Ordfy, ${admin_name}! 🎉`, html);
        return json({ success: true });
      }

      default:
        return json({ error: "Ação desconhecida" }, 400);
    }
  } catch (err) {
    console.error("platform-email error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
