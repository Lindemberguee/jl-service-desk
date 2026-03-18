import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { company_name, admin_name, admin_email, admin_password } = body;

    // Validation
    if (!company_name || !admin_name || !admin_email || !admin_password) {
      return json({ error: "Todos os campos são obrigatórios." }, 400);
    }

    if (admin_password.length < 6) {
      return json({ error: "A senha deve ter pelo menos 6 caracteres." }, 400);
    }

    // Generate slug from company name
    const slug = company_name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if slug exists
    const { data: existing } = await adminClient
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return json({ error: "Já existe uma empresa com esse nome. Tente outro." }, 400);
    }

    // Check if email already exists
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", admin_email)
      .single();

    if (existingProfile) {
      return json({ error: "Este e-mail já está cadastrado. Faça login." }, 400);
    }

    // 1. Create tenant
    const { data: tenant, error: tenantErr } = await adminClient
      .from("tenants")
      .insert({ name: company_name, slug })
      .select()
      .single();

    if (tenantErr) return json({ error: tenantErr.message }, 400);

    // 2. Create subscription (Trial 14 days, Starter)
    const starterModules = ['os', 'dashboard', 'assets', 'stock', 'portal', 'notifications'];
    const trialEnd = new Date(Date.now() + 14 * 86400000).toISOString();

    await adminClient.from("tenant_subscriptions").insert({
      tenant_id: tenant.id,
      plan: "starter",
      status: "trial",
      max_users: 5,
      enabled_modules: starterModules,
      trial_ends_at: trialEnd,
      monthly_price: 299,
      current_period_start: new Date().toISOString().split("T")[0],
      current_period_end: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    });

    // 3. Create auth user
    const { data: newUser, error: userErr } = await adminClient.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
      user_metadata: { name: admin_name },
    });

    if (userErr) {
      // Rollback
      await adminClient.from("tenant_subscriptions").delete().eq("tenant_id", tenant.id);
      await adminClient.from("tenants").delete().eq("id", tenant.id);
      return json({ error: `Erro ao criar conta: ${userErr.message}` }, 400);
    }

    // 4. Create membership as admin
    await adminClient.from("user_memberships").insert({
      user_id: newUser.user!.id,
      tenant_id: tenant.id,
      role: "admin",
    });

    // 5. Seed default role permissions for the new tenant
    const defaultPermissions = [
      // Admin gets everything
      ...['dashboard:read', 'os:read', 'os:create', 'os:update', 'os:delete', 'assets:read', 'assets:manage', 'stock:read', 'stock:manage', 'users:read', 'users:manage', 'settings:manage', 'cadastros:read', 'cadastros:manage', 'reports:read', 'notifications:read']
        .map(p => ({ role: 'admin', permission: p, granted: true })),
    ];

    // Insert role permissions (non-blocking)
    try {
      await adminClient.from("role_permissions").insert(
        defaultPermissions.map(p => ({ ...p, tenant_id: tenant.id }))
      );
    } catch {
      // Non-blocking - permissions will use defaults
    }

    // 6. Log audit
    await adminClient.from("audit_logs").insert({
      entity: "tenant",
      entity_id: tenant.id,
      action: "tenant.self_service_signup",
      actor_user_id: newUser.user!.id,
      tenant_id: tenant.id,
      diff: { company_name, admin_email, admin_name, plan: "starter", trial_days: 14 },
    });

    // 7. Send welcome email (non-blocking)
    try {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      await fetch(`${supabaseUrl}/functions/v1/platform-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-trigger": "true",
          "apikey": anonKey,
          "Authorization": `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          action: "send_welcome",
          company_name,
          admin_name,
          admin_email,
          login_url: "https://jl-service-desk.lovable.app/login",
          plan: "Starter",
          trial_days: 14,
        }),
      });
    } catch {
      // Non-blocking - don't fail signup if email fails
    }

    return json({
      success: true,
      tenant_id: tenant.id,
      user_id: newUser.user!.id,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
