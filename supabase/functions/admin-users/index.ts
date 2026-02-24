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

    // Verify caller is authenticated
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with caller's token to verify identity
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Use getClaims for signing-keys compatibility, fallback to getUser
    const token = authHeader.replace("Bearer ", "");
    let callerId: string | null = null;
    
    if (typeof callerClient.auth.getClaims === "function") {
      const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) {
        // Fallback to getUser
        const { data: { user: fallbackUser } } = await callerClient.auth.getUser();
        callerId = fallbackUser?.id || null;
      } else {
        callerId = claimsData.claims.sub as string;
      }
    } else {
      const { data: { user: fallbackUser } } = await callerClient.auth.getUser();
      callerId = fallbackUser?.id || null;
    }

    if (!callerId) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Create a minimal caller object for compatibility
    const caller = { id: callerId };

    // Verify caller is super_admin, admin, or coordenador
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: callerMemberships } = await adminClient
      .from("user_memberships")
      .select("role, tenant_id")
      .eq("user_id", caller.id)
      .eq("is_active", true);

    const callerRoles = (callerMemberships || []).map((m: any) => m.role);
    const isSuperAdmin = callerRoles.includes("super_admin");
    const isAdmin = callerRoles.includes("admin");
    const isCoordenador = callerRoles.includes("coordenador");

    if (!isSuperAdmin && !isAdmin && !isCoordenador) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // Audit log helper
    async function logAudit(entity: string, entityId: string | null, actionName: string, diff: Record<string, unknown> | null, tenantId?: string) {
      await adminClient.from("audit_logs").insert({
        entity,
        entity_id: entityId,
        action: actionName,
        actor_user_id: caller.id,
        tenant_id: tenantId || null,
        diff,
        ip: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
        user_agent: req.headers.get("user-agent") || null,
      });
    }

    switch (action) {
      case "create_user": {
        const { email, password, name, tenant_id, role } = body;
        if (!email || !password || !name) {
          return new Response(JSON.stringify({ error: "Email, senha e nome são obrigatórios" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Coordenador can only create solicitante role
        if (isCoordenador && !isSuperAdmin && !isAdmin && role !== "solicitante") {
          return new Response(JSON.stringify({ error: "Coordenadores só podem cadastrar solicitantes" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Coordenador can only create in their own tenant
        if (isCoordenador && !isSuperAdmin && !isAdmin) {
          const coordTenantIds = (callerMemberships || [])
            .filter((m: any) => m.role === "coordenador")
            .map((m: any) => m.tenant_id);
          if (tenant_id && !coordTenantIds.includes(tenant_id)) {
            return new Response(JSON.stringify({ error: "Sem permissão neste departamento" }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        // Create auth user
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name },
        });

        if (createError) {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create membership if tenant specified
        if (tenant_id && newUser.user) {
          await adminClient.from("user_memberships").insert({
            user_id: newUser.user.id,
            tenant_id,
            role: role || "tecnico",
          });

          // Auto-create customer record for solicitante users
          if ((role || "tecnico") === "solicitante") {
            await adminClient.from("customers").insert({
              name,
              email,
              phone: body.phone || null,
              document: body.document || null,
              position: body.position || null,
              sector: body.sector || null,
              notes: body.notes || null,
              tenant_id,
              user_id: newUser.user.id,
              type: "internal",
            });
          }
        }

        await logAudit("user", newUser.user?.id || null, "user.created", {
          email,
          name,
          tenant_id: tenant_id || null,
          role: role || "tecnico",
        }, tenant_id);

        return new Response(JSON.stringify({ success: true, user: newUser.user }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "change_password": {
        const { user_id, new_password } = body;
        if (!user_id || !new_password) {
          return new Response(JSON.stringify({ error: "user_id e new_password são obrigatórios" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: pwError } = await adminClient.auth.admin.updateUserById(user_id, {
          password: new_password,
        });

        if (pwError) {
          return new Response(JSON.stringify({ error: pwError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await logAudit("user", user_id, "user.password_changed", {
          changed_by: caller.id,
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "toggle_user_active": {
        const { user_id: toggleUserId, is_active } = body;
        if (!toggleUserId || typeof is_active !== "boolean") {
          return new Response(JSON.stringify({ error: "user_id e is_active são obrigatórios" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Ban/unban in auth
        if (is_active) {
          await adminClient.auth.admin.updateUserById(toggleUserId, {
            ban_duration: "none",
          });
        } else {
          await adminClient.auth.admin.updateUserById(toggleUserId, {
            ban_duration: "876000h", // ~100 years
          });
        }

        // Update profile
        await adminClient.from("profiles").update({ is_active }).eq("id", toggleUserId);

        // Deactivate all memberships if deactivating
        if (!is_active) {
          await adminClient
            .from("user_memberships")
            .update({ is_active: false })
            .eq("user_id", toggleUserId);
        }

        await logAudit("user", toggleUserId, is_active ? "user.reactivated" : "user.deactivated", {
          is_active,
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Ação desconhecida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
