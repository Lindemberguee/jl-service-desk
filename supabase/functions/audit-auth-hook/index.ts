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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, user_id, email, provider, timestamp } = body;

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    // Map action to audit action name
    const actionMap: Record<string, string> = {
      login: "auth.login",
      logout: "auth.logout",
      signup: "auth.signup",
      token_refreshed: "auth.token_refreshed",
      password_recovery: "auth.password_recovery",
      password_reset: "auth.password_reset",
    };

    const auditAction = actionMap[action] || `auth.${action}`;

    // Get user's tenant for context
    let tenantId: string | null = null;
    if (user_id) {
      const { data: membership } = await adminClient
        .from("user_memberships")
        .select("tenant_id")
        .eq("user_id", user_id)
        .eq("is_active", true)
        .limit(1)
        .single();
      tenantId = membership?.tenant_id || null;
    }

    await adminClient.from("audit_logs").insert({
      entity: "auth",
      entity_id: user_id || null,
      action: auditAction,
      actor_user_id: user_id || null,
      tenant_id: tenantId,
      ip,
      user_agent: userAgent,
      diff: {
        email: email || null,
        provider: provider || "email",
        timestamp: timestamp || new Date().toISOString(),
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Audit auth hook error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
