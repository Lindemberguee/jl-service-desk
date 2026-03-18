import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const authHeader = req.headers.get("authorization");
    let callerId: string | null = null;
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
          auth: { username: config.user, password: config.password },
        },
      });

      await client.send({
        from: config.from_email,
        to,
        subject,
        html,
        headers: { "Reply-To": config.from_email },
      });

      await client.close();
    }

    // Helper: load template from DB and replace variables
    async function loadAndRenderTemplate(slug: string, vars: Record<string, string> = {}) {
      const { data: template, error } = await adminClient
        .from("platform_email_templates")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error || !template) throw new Error(`Template "${slug}" não encontrado ou inativo`);

      let html = (template as any).html_body as string;
      let subject = (template as any).subject as string;

      // Replace {{variable}} in both subject and body
      for (const [key, value] of Object.entries(vars)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
        html = html.replace(regex, value);
        subject = subject.replace(regex, value);
      }

      return { html, subject, template };
    }

    switch (action) {
      case "get_config": {
        const { data } = await adminClient
          .from("platform_settings")
          .select("value")
          .eq("key", "platform_smtp")
          .single();

        return json({ config: data?.value || null, has_password: !!smtpPassword });
      }

      case "save_config": {
        const { host, port, user, from_email, from_name, use_tls } = body;
        await adminClient
          .from("platform_settings")
          .upsert({
            key: "platform_smtp",
            value: { host, port, user, from_email, from_name, use_tls },
            updated_by: callerId,
            updated_at: new Date().toISOString(),
          }, { onConflict: "key" });

        return json({ success: true });
      }

      case "test_email": {
        const { to_email } = body;
        if (!to_email) return json({ error: "E-mail obrigatório" }, 400);

        try {
          // Try to use the DB template
          const { html, subject } = await loadAndRenderTemplate("test", {
            sent_at: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
          });
          await sendEmail(to_email, subject, html);
        } catch {
          // Fallback to inline template
          await sendEmail(to_email, "✅ Teste SMTP - Ordfy", getFallbackTestHtml());
        }

        return json({ success: true, message: "E-mail de teste enviado com sucesso!" });
      }

      case "send_welcome": {
        const { company_name, admin_name, admin_email, login_url, plan, trial_days } = body;
        if (!admin_email) return json({ error: "E-mail obrigatório" }, 400);

        const vars = {
          company_name: company_name || "Sua Empresa",
          admin_name: admin_name || "Administrador",
          admin_email,
          login_url: login_url || "https://jl-service-desk.lovable.app/login",
          plan: plan || "Starter",
          trial_days: String(trial_days || 14),
        };

        try {
          const { html, subject } = await loadAndRenderTemplate("welcome", vars);
          await sendEmail(admin_email, subject, html);
        } catch {
          // Fallback
          await sendEmail(admin_email, `Bem-vindo ao Ordfy, ${vars.admin_name}! 🎉`, getFallbackWelcomeHtml(vars));
        }

        return json({ success: true });
      }

      // New: send any template by slug with example vars
      case "send_template": {
        const { template_slug, to_email } = body;
        if (!template_slug || !to_email) return json({ error: "slug e to_email obrigatórios" }, 400);

        const { data: tpl } = await adminClient
          .from("platform_email_templates")
          .select("*")
          .eq("slug", template_slug)
          .single();

        if (!tpl) return json({ error: "Template não encontrado" }, 404);

        // Use example values from variables definition
        const exampleVars: Record<string, string> = {};
        const varsArray = (tpl as any).variables as any[];
        if (Array.isArray(varsArray)) {
          for (const v of varsArray) {
            exampleVars[v.key] = v.example || v.key;
          }
        }

        const { html, subject } = await loadAndRenderTemplate(template_slug, exampleVars);
        await sendEmail(to_email, subject, html);

        return json({ success: true, message: `Template "${(tpl as any).name}" enviado para ${to_email}` });
      }

      default:
        return json({ error: "Ação desconhecida" }, 400);
    }
  } catch (err) {
    console.error("platform-email error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

// ─── Fallback templates (used if DB templates not found) ───

function getFallbackTestHtml() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;background:#f4f6f9;font-family:sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
      <tr><td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#10b981,#059669);padding:30px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:20px;">✅ SMTP Configurado!</h1>
          </td></tr>
          <tr><td style="padding:30px;text-align:center;">
            <p style="margin:0;color:#1e293b;font-size:15px;font-weight:600;">Teste realizado com sucesso.</p>
            <p style="margin:8px 0 0;color:#64748b;font-size:13px;">Enviado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

function getFallbackWelcomeHtml(d: Record<string, string>) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;background:#f4f6f9;font-family:sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#1a56db,#0f172a);padding:40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;">Bem-vindo ao Ordfy! 🎉</h1>
          </td></tr>
          <tr><td style="padding:36px 40px;">
            <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Olá <strong>${d.admin_name}</strong>,</p>
            <p style="margin:0 0 24px;color:#475569;font-size:14px;">A empresa <strong>${d.company_name}</strong> foi cadastrada com sucesso.</p>
            <p style="margin:0;"><a href="${d.login_url}" style="display:inline-block;background:#1a56db;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;">Acessar Ordfy →</a></p>
          </td></tr>
          <tr><td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">Plataforma Ordfy · E-mail automático</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}
