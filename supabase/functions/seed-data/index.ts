import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ---- 1. Create 3 departments (tenants) ----
    const departments = [
      { name: "TI", slug: "ti", primary_color: "#3B82F6", accent_color: "#6366F1", plan: "pro" },
      { name: "Manutenção Predial", slug: "manutencao-predial", primary_color: "#F59E0B", accent_color: "#EF4444", plan: "pro" },
      { name: "Limpeza Predial", slug: "limpeza-predial", primary_color: "#10B981", accent_color: "#14B8A6", plan: "pro" },
    ];

    const tenantIds: Record<string, string> = {};
    for (const dept of departments) {
      const { data: existing } = await supabase.from("tenants").select("id").eq("slug", dept.slug).maybeSingle();
      if (existing) {
        tenantIds[dept.slug] = existing.id;
      } else {
        const { data, error } = await supabase.from("tenants").insert(dept).select("id").single();
        if (error) throw error;
        tenantIds[dept.slug] = data.id;
      }
    }

    // ---- 2. Create users ----
    const users = [
      { email: "superadmin@serviceos.com", password: "Admin123!", name: "Admin Geral", memberships: [
        { slug: "ti", role: "super_admin" }, { slug: "manutencao-predial", role: "super_admin" }, { slug: "limpeza-predial", role: "super_admin" },
      ]},
      { email: "coord.ti@serviceos.com", password: "Coord123!", name: "Carlos Coordenador TI", memberships: [
        { slug: "ti", role: "coordenador" },
      ]},
      { email: "tecnico.ti@serviceos.com", password: "Tecnico123!", name: "Ana Técnica TI", memberships: [
        { slug: "ti", role: "tecnico" },
      ]},
      { email: "coord.manut@serviceos.com", password: "Coord123!", name: "Roberto Coord Manutenção", memberships: [
        { slug: "manutencao-predial", role: "coordenador" },
      ]},
      { email: "tecnico.manut@serviceos.com", password: "Tecnico123!", name: "José Técnico Predial", memberships: [
        { slug: "manutencao-predial", role: "tecnico" }, { slug: "limpeza-predial", role: "tecnico" },
      ]},
      { email: "coord.limpeza@serviceos.com", password: "Coord123!", name: "Maria Coord Limpeza", memberships: [
        { slug: "limpeza-predial", role: "coordenador" },
      ]},
      { email: "solicitante@serviceos.com", password: "Solic123!", name: "Pedro Solicitante", memberships: [
        { slug: "ti", role: "solicitante" }, { slug: "manutencao-predial", role: "solicitante" }, { slug: "limpeza-predial", role: "solicitante" },
      ]},
    ];

    const userIds: Record<string, string> = {};
    for (const u of users) {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const found = existingUsers?.users?.find((eu: any) => eu.email === u.email);
      let userId: string;
      if (found) {
        userId = found.id;
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email: u.email, password: u.password,
          user_metadata: { name: u.name }, email_confirm: true,
        });
        if (error) throw error;
        userId = data.user.id;
      }
      userIds[u.email] = userId;

      await supabase.from("profiles").upsert({ id: userId, name: u.name, email: u.email });

      for (const m of u.memberships) {
        const tenantId = tenantIds[m.slug];
        const { data: existingMem } = await supabase.from("user_memberships")
          .select("id").eq("user_id", userId).eq("tenant_id", tenantId).maybeSingle();
        if (!existingMem) {
          await supabase.from("user_memberships").insert({ user_id: userId, tenant_id: tenantId, role: m.role });
        }
      }
    }

    // ---- 3. Categories per department ----
    const categoriesData: Record<string, string[]> = {
      "ti": ["Rede", "Hardware", "Software", "Telefonia", "Segurança da Informação"],
      "manutencao-predial": ["Elétrica", "Hidráulica", "Ar Condicionado", "Civil", "Pintura"],
      "limpeza-predial": ["Limpeza Geral", "Limpeza Pesada", "Jardinagem", "Controle de Pragas"],
    };

    const categoryIds: Record<string, string> = {};
    for (const [slug, cats] of Object.entries(categoriesData)) {
      for (const catName of cats) {
        const tenantId = tenantIds[slug];
        const { data: existing } = await supabase.from("categories")
          .select("id").eq("tenant_id", tenantId).eq("name", catName).maybeSingle();
        if (existing) {
          categoryIds[`${slug}-${catName}`] = existing.id;
        } else {
          const { data, error } = await supabase.from("categories")
            .insert({ tenant_id: tenantId, name: catName }).select("id").single();
          if (error) throw error;
          categoryIds[`${slug}-${catName}`] = data.id;
        }
      }
    }

    // ---- 4. Units ----
    const unitNames = ["Sede Principal", "Filial Centro"];
    const unitIds: Record<string, string> = {};
    for (const slug of Object.keys(tenantIds)) {
      for (const uName of unitNames) {
        const tenantId = tenantIds[slug];
        const { data: existing } = await supabase.from("units")
          .select("id").eq("tenant_id", tenantId).eq("name", uName).maybeSingle();
        if (existing) {
          unitIds[`${slug}-${uName}`] = existing.id;
        } else {
          const { data, error } = await supabase.from("units")
            .insert({ tenant_id: tenantId, name: uName, city: "São Paulo", state: "SP" }).select("id").single();
          if (error) throw error;
          unitIds[`${slug}-${uName}`] = data.id;
        }
      }
    }

    // ---- 5. Work Orders ----
    const woData = [
      { slug: "ti", title: "Computador não liga - Sala 301", desc: "PC não liga após queda de energia", priority: "alta", status: "em_execucao", cat: "Hardware" },
      { slug: "ti", title: "Instalar VPN para novo colaborador", desc: "Configurar VPN e acessos para João Silva", priority: "media", status: "aberta", cat: "Rede" },
      { slug: "ti", title: "Atualizar antivírus em todos os PCs", desc: "Atualização em massa do antivírus corporativo", priority: "critica", status: "triagem", cat: "Segurança da Informação" },
      { slug: "manutencao-predial", title: "Vazamento no banheiro 2o andar", desc: "Torneira com vazamento", priority: "alta", status: "em_execucao", cat: "Hidráulica" },
      { slug: "manutencao-predial", title: "Ar condicionado não gela - Sala reunião", desc: "Não está gelando", priority: "critica", status: "aguardando_peca", cat: "Ar Condicionado" },
      { slug: "manutencao-predial", title: "Trocar lâmpadas corredor térreo", desc: "3 lâmpadas queimadas", priority: "baixa", status: "concluida", cat: "Elétrica" },
      { slug: "limpeza-predial", title: "Limpeza pesada pós-evento", desc: "Limpeza completa do auditório", priority: "alta", status: "aberta", cat: "Limpeza Pesada" },
      { slug: "limpeza-predial", title: "Poda das árvores estacionamento", desc: "Árvores precisam de poda", priority: "media", status: "triagem", cat: "Jardinagem" },
    ];

    const adminId = userIds["superadmin@serviceos.com"];
    for (const wo of woData) {
      const tenantId = tenantIds[wo.slug];
      const catId = categoryIds[`${wo.slug}-${wo.cat}`];
      const unitId = unitIds[`${wo.slug}-Sede Principal`];

      const { data: existing } = await supabase.from("work_orders")
        .select("id").eq("tenant_id", tenantId).eq("title", wo.title).maybeSingle();
      if (existing) continue;

      const insertData: any = {
        tenant_id: tenantId, title: wo.title, description: wo.desc,
        priority: wo.priority, status: wo.status, category_id: catId, unit_id: unitId,
        code: `SEED-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        response_due_at: new Date(Date.now() + 14400000).toISOString(),
        resolve_due_at: new Date(Date.now() + 86400000).toISOString(),
      };
      if (wo.status === "em_execucao") insertData.started_at = new Date(Date.now() - 3600000).toISOString();
      if (wo.status === "concluida") {
        insertData.started_at = new Date(Date.now() - 86400000).toISOString();
        insertData.resolved_at = new Date().toISOString();
      }
      if (wo.status === "aguardando_peca") {
        insertData.started_at = new Date(Date.now() - 7200000).toISOString();
        insertData.paused_at = new Date().toISOString();
      }

      const { data: woResult, error } = await supabase.from("work_orders")
        .insert(insertData).select("id, code").single();
      if (error) throw error;

      await supabase.from("work_order_events").insert({
        tenant_id: tenantId, work_order_id: woResult.id,
        type: "created", actor_user_id: adminId,
        payload: { text: `OS ${woResult.code} criada` },
      });

      if (wo.status !== "aberta") {
        await supabase.from("work_order_events").insert({
          tenant_id: tenantId, work_order_id: woResult.id,
          type: "status_changed", actor_user_id: adminId,
          payload: { from: "aberta", to: wo.status },
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      departments: Object.keys(tenantIds),
      credentials: [
        { email: "superadmin@serviceos.com", password: "Admin123!", role: "Super Admin (todos os deptos)" },
        { email: "coord.ti@serviceos.com", password: "Coord123!", role: "Coordenador TI" },
        { email: "tecnico.ti@serviceos.com", password: "Tecnico123!", role: "Técnico TI" },
        { email: "coord.manut@serviceos.com", password: "Coord123!", role: "Coordenador Manutenção" },
        { email: "tecnico.manut@serviceos.com", password: "Tecnico123!", role: "Técnico Manut + Limpeza" },
        { email: "coord.limpeza@serviceos.com", password: "Coord123!", role: "Coordenador Limpeza" },
        { email: "solicitante@serviceos.com", password: "Solic123!", role: "Solicitante (todos)" },
      ],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
