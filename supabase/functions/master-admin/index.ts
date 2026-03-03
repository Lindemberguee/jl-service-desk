import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getCallerIdFromAuth(req: Request, supabaseUrl: string, anonKey: string): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await callerClient.auth.getUser();
  return user?.id || null;
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

    const callerId = await getCallerIdFromAuth(req, supabaseUrl, anonKey);
    if (!callerId) return json({ error: "Não autorizado" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is super_admin
    const { data: memberships } = await adminClient
      .from("user_memberships")
      .select("role")
      .eq("user_id", callerId)
      .eq("is_active", true);

    const isSuperAdmin = (memberships || []).some((m: any) => m.role === "super_admin");
    if (!isSuperAdmin) return json({ error: "Acesso restrito a Super Admins" }, 403);

    const body = await req.json();
    const { action } = body;

    // Audit helper
    async function logAudit(entity: string, entityId: string | null, actionName: string, diff: Record<string, unknown> | null, tenantId?: string) {
      await adminClient.from("audit_logs").insert({
        entity, entity_id: entityId, action: actionName,
        actor_user_id: callerId, tenant_id: tenantId || null, diff,
        ip: req.headers.get("x-forwarded-for") || null,
        user_agent: req.headers.get("user-agent") || null,
      });
    }

    switch (action) {
      // ============ LIST TENANTS WITH METRICS ============
      case "list_tenants": {
        const { data: tenants } = await adminClient
          .from("tenants")
          .select("*")
          .order("created_at", { ascending: false });

        const { data: subscriptions } = await adminClient
          .from("tenant_subscriptions")
          .select("*");

        const { data: userCounts } = await adminClient
          .from("user_memberships")
          .select("tenant_id")
          .eq("is_active", true);

        const countMap: Record<string, number> = {};
        for (const uc of userCounts || []) {
          countMap[uc.tenant_id] = (countMap[uc.tenant_id] || 0) + 1;
        }

        const subMap: Record<string, any> = {};
        for (const s of subscriptions || []) {
          subMap[s.tenant_id] = s;
        }

        const result = (tenants || []).map((t: any) => ({
          ...t,
          subscription: subMap[t.id] || null,
          active_users: countMap[t.id] || 0,
        }));

        return json({ tenants: result });
      }

      // ============ ONBOARD NEW TENANT ============
      case "onboard_tenant": {
        const { tenant_name, tenant_slug, plan, max_users, enabled_modules, admin_email, admin_password, admin_name, monthly_price, trial_days } = body;

        if (!tenant_name || !tenant_slug || !admin_email || !admin_password || !admin_name) {
          return json({ error: "Campos obrigatórios: tenant_name, tenant_slug, admin_email, admin_password, admin_name" }, 400);
        }

        const { data: existing } = await adminClient
          .from("tenants")
          .select("id")
          .eq("slug", tenant_slug)
          .single();

        if (existing) return json({ error: "Slug já existe" }, 400);

        // 1. Create tenant
        const { data: tenant, error: tenantErr } = await adminClient
          .from("tenants")
          .insert({ name: tenant_name, slug: tenant_slug })
          .select()
          .single();

        if (tenantErr) return json({ error: tenantErr.message }, 400);

        // 2. Create subscription
        const trialEnd = trial_days
          ? new Date(Date.now() + trial_days * 86400000).toISOString()
          : null;

        const allModules = ['os', 'dashboard', 'assets', 'stock', 'portal', 'notifications', 'kpis', 'manutencao', 'reports', 'docs', 'knowledge', 'checklist', 'canvas', 'notes', 'reminders', 'vault', 'audit', 'disposal', 'api', 'theme'];
        const starterModules = ['os', 'dashboard', 'assets', 'stock', 'portal', 'notifications'];
        const professionalModules = [...starterModules, 'kpis', 'manutencao', 'reports', 'docs', 'knowledge', 'checklist', 'api'];
        const enterpriseModules = allModules;

        let resolvedModules = enabled_modules;
        if (!resolvedModules) {
          switch (plan || 'trial') {
            case 'starter': resolvedModules = starterModules; break;
            case 'professional': resolvedModules = professionalModules; break;
            case 'enterprise': case 'custom': resolvedModules = enterpriseModules; break;
            default: resolvedModules = starterModules;
          }
        }

        const resolvedPlan = plan || 'trial';
        const isIndefinite = !trial_days && (resolvedPlan === 'custom' || resolvedPlan === 'enterprise');
        const resolvedStatus = isIndefinite ? 'active' : (resolvedPlan === 'trial' || !plan ? 'trial' : 'active');
        const periodEnd = isIndefinite
          ? '2099-12-31'
          : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

        await adminClient.from("tenant_subscriptions").insert({
          tenant_id: tenant.id,
          plan: resolvedPlan,
          status: resolvedStatus,
          max_users: max_users || 5,
          enabled_modules: resolvedModules,
          trial_ends_at: trialEnd,
          monthly_price: monthly_price || 0,
          current_period_start: new Date().toISOString().split('T')[0],
          current_period_end: periodEnd,
        });

        // 3. Create admin auth user
        const { data: newUser, error: userErr } = await adminClient.auth.admin.createUser({
          email: admin_email,
          password: admin_password,
          email_confirm: true,
          user_metadata: { name: admin_name },
        });

        if (userErr) {
          await adminClient.from("tenant_subscriptions").delete().eq("tenant_id", tenant.id);
          await adminClient.from("tenants").delete().eq("id", tenant.id);
          return json({ error: `Erro ao criar usuário: ${userErr.message}` }, 400);
        }

        // 4. Create membership as admin
        await adminClient.from("user_memberships").insert({
          user_id: newUser.user!.id,
          tenant_id: tenant.id,
          role: "admin",
        });

        await logAudit("tenant", tenant.id, "tenant.onboarded", {
          tenant_name, tenant_slug, plan: resolvedPlan,
          admin_email, admin_name, max_users: max_users || 5,
        });

        return json({
          success: true,
          tenant,
          admin: { id: newUser.user!.id, email: admin_email, name: admin_name },
        });
      }

      // ============ UPDATE SUBSCRIPTION ============
      case "update_subscription": {
        const { tenant_id, plan, max_users, enabled_modules, status, monthly_price, notes } = body;
        if (!tenant_id) return json({ error: "tenant_id obrigatório" }, 400);

        const updates: Record<string, unknown> = {};
        if (plan !== undefined) updates.plan = plan;
        if (max_users !== undefined) updates.max_users = max_users;
        if (enabled_modules !== undefined) updates.enabled_modules = enabled_modules;
        if (status !== undefined) updates.status = status;
        if (monthly_price !== undefined) updates.monthly_price = monthly_price;
        if (notes !== undefined) updates.notes = notes;

        const { error } = await adminClient
          .from("tenant_subscriptions")
          .update(updates)
          .eq("tenant_id", tenant_id);

        if (error) return json({ error: error.message }, 400);

        await logAudit("subscription", tenant_id, "subscription.updated", updates, tenant_id);

        return json({ success: true });
      }

      // ============ DELETE TENANT ============
      case "delete_tenant": {
        const { tenant_id } = body;
        if (!tenant_id) return json({ error: "tenant_id obrigatório" }, 400);

        // Get tenant info for audit
        const { data: tenantInfo } = await adminClient
          .from("tenants")
          .select("name, slug")
          .eq("id", tenant_id)
          .single();

        if (!tenantInfo) return json({ error: "Empresa não encontrada" }, 404);

        // Get all user memberships for this tenant
        const { data: tenantMembers } = await adminClient
          .from("user_memberships")
          .select("user_id")
          .eq("tenant_id", tenant_id);

        // Delete subscription
        await adminClient.from("tenant_subscriptions").delete().eq("tenant_id", tenant_id);

        // Delete memberships
        await adminClient.from("user_memberships").delete().eq("tenant_id", tenant_id);

        // Delete tenant-specific data (cascade should handle most, but be explicit)
        const tablesToClean = [
          'work_orders', 'assets', 'stock_items', 'stock_movements',
          'categories', 'locations', 'units', 'customers', 'collaborators',
          'documents', 'document_versions', 'knowledge_articles',
          'kpis', 'kpi_entries', 'okr_cycles', 'okr_objectives', 'okr_key_results', 'okr_checkins',
          'sla_policies', 'notifications', 'notes', 'note_shares',
          'canvas_boards', 'canvas_board_shares', 'reminders', 'disposals',
          'checklist_templates', 'module_categories',
          'asset_components', 'asset_maintenance_records',
        ];

        for (const table of tablesToClean) {
          try {
            await adminClient.from(table).delete().eq("tenant_id", tenant_id);
          } catch {
            // Some tables might not exist or have different constraints
          }
        }

        // Delete tenant
        const { error: delErr } = await adminClient.from("tenants").delete().eq("id", tenant_id);
        if (delErr) return json({ error: `Erro ao excluir: ${delErr.message}` }, 400);

        // Delete orphaned auth users (users with no remaining memberships)
        if (tenantMembers?.length) {
          for (const member of tenantMembers) {
            const { count } = await adminClient
              .from("user_memberships")
              .select("*", { count: "exact", head: true })
              .eq("user_id", member.user_id);

            if ((count || 0) === 0) {
              // User has no other memberships, delete auth user
              try {
                await adminClient.from("profiles").delete().eq("id", member.user_id);
                await adminClient.auth.admin.deleteUser(member.user_id);
              } catch {
                // Non-blocking
              }
            }
          }
        }

        await logAudit("tenant", tenant_id, "tenant.deleted", {
          tenant_name: tenantInfo.name,
          tenant_slug: tenantInfo.slug,
        });

        return json({ success: true });
      }

      // ============ LIST ALL USERS ============
      case "list_all_users": {
        const { data: allMembers } = await adminClient
          .from("user_memberships")
          .select("user_id, tenant_id, role, is_active, tenants(name)")
          .order("user_id");

        const { data: allProfiles } = await adminClient
          .from("profiles")
          .select("id, name, email, is_active, created_at")
          .order("created_at", { ascending: false });

        const memberMap: Record<string, any[]> = {};
        for (const m of allMembers || []) {
          if (!memberMap[m.user_id]) memberMap[m.user_id] = [];
          memberMap[m.user_id].push({
            tenant_id: m.tenant_id,
            tenant_name: (m as any).tenants?.name || '?',
            role: m.role,
            is_active: m.is_active,
          });
        }

        const users = (allProfiles || []).map((p: any) => ({
          ...p,
          memberships: memberMap[p.id] || [],
        }));

        return json({ users });
      }

      // ============ LIST AUDIT LOGS (GLOBAL) ============
      case "list_audit_logs": {
        const limit = body.limit || 100;
        const { data: logs } = await adminClient
          .from("audit_logs")
          .select("*, tenants:tenant_id(name)")
          .order("created_at", { ascending: false })
          .limit(limit);

        return json({ logs: logs || [] });
      }

      // ============ GET PLATFORM STATS ============
      case "platform_stats": {
        const { count: totalTenants } = await adminClient
          .from("tenants").select("*", { count: "exact", head: true });
        const { count: totalUsers } = await adminClient
          .from("profiles").select("*", { count: "exact", head: true });
        const { count: activeUsers } = await adminClient
          .from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true);
        const { count: totalWOs } = await adminClient
          .from("work_orders").select("*", { count: "exact", head: true });

        const { data: subs } = await adminClient.from("tenant_subscriptions").select("plan, status, monthly_price");
        const planCounts: Record<string, number> = {};
        const statusCounts: Record<string, number> = {};
        let mrr = 0;
        for (const s of subs || []) {
          planCounts[s.plan] = (planCounts[s.plan] || 0) + 1;
          statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
          if ((s.status === 'active' || s.status === 'trial') && s.monthly_price) {
            mrr += Number(s.monthly_price);
          }
        }

        return json({
          total_tenants: totalTenants || 0,
          total_users: totalUsers || 0,
          active_users: activeUsers || 0,
          total_work_orders: totalWOs || 0,
          plans: planCounts,
          statuses: statusCounts,
          mrr,
        });
      }

      default:
        return json({ error: "Ação desconhecida" }, 400);
    }
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
