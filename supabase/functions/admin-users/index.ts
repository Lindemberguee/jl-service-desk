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

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    let callerId: string | null = null;

    if (typeof callerClient.auth.getClaims === "function") {
      const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) {
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

    const caller = { id: callerId };
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

    // Tenant IDs the caller manages (admin/super_admin memberships)
    const callerAdminTenantIds = (callerMemberships || [])
      .filter((m: any) => ["super_admin", "admin"].includes(m.role))
      .map((m: any) => m.tenant_id);

    const callerCoordTenantIds = (callerMemberships || [])
      .filter((m: any) => m.role === "coordenador")
      .map((m: any) => m.tenant_id);

    if (!isSuperAdmin && !isAdmin && !isCoordenador) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // Helper to check if caller can manage a given tenant
    function canManageTenant(tenantId: string): boolean {
      if (isSuperAdmin) return true;
      return callerAdminTenantIds.includes(tenantId) || callerCoordTenantIds.includes(tenantId);
    }

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

        // Validate tenant access
        if (tenant_id && !canManageTenant(tenant_id)) {
          return new Response(JSON.stringify({ error: "Sem permissão neste departamento" }), {
            status: 403,
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

        // Admin cannot assign super_admin
        if (!isSuperAdmin && role === "super_admin") {
          return new Response(JSON.stringify({ error: "Apenas super admins podem atribuir este papel" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check user limit from tenant_subscriptions
        if (tenant_id) {
          const { data: subscription } = await adminClient
            .from("tenant_subscriptions")
            .select("max_users, status")
            .eq("tenant_id", tenant_id)
            .single();

          if (subscription) {
            if (["expired", "suspended", "cancelled"].includes(subscription.status)) {
              return new Response(JSON.stringify({ error: "O plano desta empresa está inativo. Entre em contato com o suporte." }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }

            const { count } = await adminClient
              .from("user_memberships")
              .select("*", { count: "exact", head: true })
              .eq("tenant_id", tenant_id)
              .eq("is_active", true);

            // Super admin bypasses user limits
            if (!isSuperAdmin && (count || 0) >= subscription.max_users) {
              return new Response(JSON.stringify({
                error: `Limite de usuários atingido (${count}/${subscription.max_users}). Faça upgrade do plano.`
              }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
        }

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

        if (tenant_id && newUser.user) {
          await adminClient.from("user_memberships").insert({
            user_id: newUser.user.id,
            tenant_id,
            role: role || "tecnico",
          });

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
          email, name, tenant_id: tenant_id || null, role: role || "tecnico",
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

        // Non-super_admin: verify target user is in their managed tenants
        if (!isSuperAdmin) {
          const { data: targetMemberships } = await adminClient
            .from("user_memberships")
            .select("tenant_id")
            .eq("user_id", user_id)
            .eq("is_active", true);

          const targetTenantIds = (targetMemberships || []).map((m: any) => m.tenant_id);
          const hasAccess = targetTenantIds.some((tid: string) => callerAdminTenantIds.includes(tid));
          if (!hasAccess) {
            return new Response(JSON.stringify({ error: "Sem permissão para gerenciar este usuário" }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
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

        await logAudit("user", user_id, "user.password_changed", { changed_by: caller.id });

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

        // Non-super_admin: verify target user is in their managed tenants
        if (!isSuperAdmin) {
          const { data: targetMemberships } = await adminClient
            .from("user_memberships")
            .select("tenant_id")
            .eq("user_id", toggleUserId)
            .eq("is_active", true);

          const targetTenantIds = (targetMemberships || []).map((m: any) => m.tenant_id);
          const hasAccess = targetTenantIds.some((tid: string) => callerAdminTenantIds.includes(tid));
          if (!hasAccess) {
            return new Response(JSON.stringify({ error: "Sem permissão para gerenciar este usuário" }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        if (is_active) {
          await adminClient.auth.admin.updateUserById(toggleUserId, { ban_duration: "none" });
        } else {
          await adminClient.auth.admin.updateUserById(toggleUserId, { ban_duration: "876000h" });
        }

        await adminClient.from("profiles").update({ is_active }).eq("id", toggleUserId);

        if (!is_active) {
          // For admin: only deactivate memberships in their tenants
          if (!isSuperAdmin) {
            for (const tid of callerAdminTenantIds) {
              await adminClient
                .from("user_memberships")
                .update({ is_active: false })
                .eq("user_id", toggleUserId)
                .eq("tenant_id", tid);
            }
          } else {
            await adminClient
              .from("user_memberships")
              .update({ is_active: false })
              .eq("user_id", toggleUserId);
          }
        }

        await logAudit("user", toggleUserId, is_active ? "user.reactivated" : "user.deactivated", { is_active });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        const { user_id: deleteUserId } = body;
        if (!deleteUserId) {
          return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (deleteUserId === caller.id) {
          return new Response(JSON.stringify({ error: "Não é possível excluir a própria conta" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!isSuperAdmin && !isAdmin) {
          return new Response(JSON.stringify({ error: "Apenas administradores podem excluir usuários" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Non-super_admin: verify target user is in their managed tenants
        if (!isSuperAdmin) {
          const { data: targetMemberships } = await adminClient
            .from("user_memberships")
            .select("tenant_id, role")
            .eq("user_id", deleteUserId);

          const targetTenantIds = (targetMemberships || []).map((m: any) => m.tenant_id);
          const hasAccess = targetTenantIds.some((tid: string) => callerAdminTenantIds.includes(tid));
          if (!hasAccess) {
            return new Response(JSON.stringify({ error: "Sem permissão para excluir este usuário" }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Admin cannot delete super_admin users
          const targetRoles = (targetMemberships || []).map((m: any) => m.role);
          if (targetRoles.includes("super_admin")) {
            return new Response(JSON.stringify({ error: "Não é possível excluir um super administrador" }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        const { data: deletedProfile } = await adminClient
          .from("profiles")
          .select("name, email")
          .eq("id", deleteUserId)
          .single();

        await adminClient.from("user_memberships").delete().eq("user_id", deleteUserId);
        await adminClient.from("profiles").delete().eq("id", deleteUserId);

        const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(deleteUserId);
        if (deleteAuthError) {
          return new Response(JSON.stringify({ error: deleteAuthError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await logAudit("user", deleteUserId, "user.deleted", {
          name: deletedProfile?.name || "N/A",
          email: deletedProfile?.email || "N/A",
          deleted_by: caller.id,
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
