import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1) Create 2 tenants
    const { data: tenants, error: tErr } = await supabase
      .from("tenants")
      .upsert(
        [
          { name: "TechCorp Manutenção", slug: "techcorp", plan: "pro" },
          { name: "Hospital Central", slug: "hospital-central", plan: "enterprise" },
        ],
        { onConflict: "slug" }
      )
      .select();
    if (tErr) throw tErr;

    const t1 = tenants![0].id;
    const t2 = tenants![1].id;

    // 2) Create users via auth.admin
    const users = [
      { email: "admin@techcorp.com", password: "Admin123!", name: "Carlos Admin", role: "super_admin", tenantId: t1 },
      { email: "coord@techcorp.com", password: "Coord123!", name: "Ana Coordenadora", role: "coordenador", tenantId: t1 },
      { email: "tecnico@techcorp.com", password: "Tecnico123!", name: "João Técnico", role: "tecnico", tenantId: t1 },
      { email: "admin@hospital.com", password: "Admin123!", name: "Maria Admin", role: "admin", tenantId: t2 },
      { email: "tecnico@hospital.com", password: "Tecnico123!", name: "Pedro Técnico", role: "tecnico", tenantId: t2 },
    ];

    const userIds: Record<string, string> = {};

    for (const u of users) {
      // Check if user exists
      const { data: existing } = await supabase.auth.admin.listUsers();
      const found = existing?.users?.find((x: any) => x.email === u.email);

      let userId: string;
      if (found) {
        userId = found.id;
      } else {
        const { data: created, error: cErr } = await supabase.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { name: u.name },
        });
        if (cErr) throw cErr;
        userId = created.user!.id;
      }
      userIds[u.email] = userId;

      // Upsert membership
      await supabase.from("user_memberships").upsert(
        { tenant_id: u.tenantId, user_id: userId, role: u.role, is_active: true },
        { onConflict: "tenant_id,user_id" }
      );
    }

    // Also add admin@techcorp to hospital tenant (multi-tenant demo)
    await supabase.from("user_memberships").upsert(
      { tenant_id: t2, user_id: userIds["admin@techcorp.com"], role: "admin", is_active: true },
      { onConflict: "tenant_id,user_id" }
    );

    // 3) Categories
    const catData = [
      { tenant_id: t1, name: "Elétrica" },
      { tenant_id: t1, name: "Hidráulica" },
      { tenant_id: t1, name: "TI / Infraestrutura" },
      { tenant_id: t1, name: "Refrigeração" },
      { tenant_id: t2, name: "Equipamentos Médicos" },
      { tenant_id: t2, name: "Infraestrutura Predial" },
      { tenant_id: t2, name: "TI Hospitalar" },
    ];
    const { data: cats } = await supabase.from("categories").upsert(catData, { onConflict: "id" }).select();

    // 4) Units
    const unitData = [
      { tenant_id: t1, name: "Matriz São Paulo", address: "Av. Paulista, 1000", city: "São Paulo", state: "SP" },
      { tenant_id: t1, name: "Filial Campinas", address: "Rua Barão, 500", city: "Campinas", state: "SP" },
      { tenant_id: t2, name: "Ala Norte", address: "Rua da Saúde, 200", city: "Rio de Janeiro", state: "RJ" },
      { tenant_id: t2, name: "Ala Sul", address: "Rua da Saúde, 200", city: "Rio de Janeiro", state: "RJ" },
    ];
    const { data: units } = await supabase.from("units").upsert(unitData, { onConflict: "id" }).select();

    // 5) Customers
    const custData = [
      { tenant_id: t1, name: "Departamento Financeiro", type: "internal", email: "financeiro@techcorp.com" },
      { tenant_id: t1, name: "Cliente Externo ABC", type: "external", email: "contato@abc.com", phone: "(11) 99999-0001" },
      { tenant_id: t2, name: "Dr. Roberto Silva", type: "internal", email: "roberto@hospital.com" },
      { tenant_id: t2, name: "Enfermaria 3B", type: "internal" },
    ];
    const { data: customers } = await supabase.from("customers").upsert(custData, { onConflict: "id" }).select();

    // 6) Assets
    const assetData = [
      { tenant_id: t1, unit_id: units![0].id, name: "Ar condicionado Sala 101", patrimony_code: "AC-001", status: "ativo" },
      { tenant_id: t1, unit_id: units![0].id, name: "Servidor Principal", patrimony_code: "SRV-001", status: "ativo" },
      { tenant_id: t1, unit_id: units![1].id, name: "Gerador de Energia", patrimony_code: "GER-001", status: "em_manutencao" },
      { tenant_id: t2, unit_id: units![2].id, name: "Tomógrafo CT-500", patrimony_code: "MED-001", status: "ativo" },
      { tenant_id: t2, unit_id: units![3].id, name: "Monitor Multiparâmetro", patrimony_code: "MED-002", status: "ativo" },
    ];
    await supabase.from("assets").upsert(assetData, { onConflict: "id" }).select();

    // 7) Stock Items
    const stockData = [
      { tenant_id: t1, name: "Disjuntor 20A", sku: "DJ-20A", min_level: 10, current_level: 25 },
      { tenant_id: t1, name: "Filtro de ar split", sku: "FLT-AR", min_level: 5, current_level: 3 },
      { tenant_id: t1, name: "Cabo de rede Cat6", sku: "CBL-C6", unit: "m", min_level: 100, current_level: 250 },
      { tenant_id: t2, name: "Lâmpada LED 18W", sku: "LED-18W", min_level: 50, current_level: 120 },
      { tenant_id: t2, name: "Sensor SpO2", sku: "SPO2-01", min_level: 5, current_level: 2 },
    ];
    await supabase.from("stock_items").upsert(stockData, { onConflict: "id" }).select();

    // 8) Work Orders for Tenant 1
    const t1Cats = cats!.filter((c: any) => c.tenant_id === t1);
    const t2Cats = cats!.filter((c: any) => c.tenant_id === t2);

    const woData = [
      {
        tenant_id: t1, title: "Ar condicionado não liga na sala 101", description: "O equipamento não responde ao controle remoto e não liga manualmente.",
        priority: "alta", status: "em_execucao", category_id: t1Cats[3]?.id || t1Cats[0]?.id, unit_id: units![0].id,
        assigned_to_id: userIds["tecnico@techcorp.com"], started_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        tenant_id: t1, title: "Vazamento no banheiro do 2º andar", description: "Vazamento constante na torneira do lavatório.",
        priority: "media", status: "aberta", category_id: t1Cats[1]?.id || t1Cats[0]?.id, unit_id: units![0].id,
      },
      {
        tenant_id: t1, title: "Servidor sem acesso à rede", description: "O servidor principal perdeu conectividade após queda de energia.",
        priority: "critica", status: "triagem", category_id: t1Cats[2]?.id || t1Cats[0]?.id, unit_id: units![0].id,
        resolve_due_at: new Date(Date.now() - 7200000).toISOString(), // overdue SLA
      },
      {
        tenant_id: t1, title: "Troca de lâmpadas corredor B", description: "3 lâmpadas queimadas no corredor B da filial.",
        priority: "baixa", status: "concluida", category_id: t1Cats[0]?.id, unit_id: units![1].id,
        assigned_to_id: userIds["tecnico@techcorp.com"],
        started_at: new Date(Date.now() - 86400000).toISOString(),
        resolved_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        tenant_id: t1, title: "Instalação de pontos de rede", description: "Instalar 5 novos pontos de rede na sala de reuniões.",
        priority: "media", status: "aguardando_peca", category_id: t1Cats[2]?.id || t1Cats[0]?.id, unit_id: units![1].id,
        assigned_to_id: userIds["tecnico@techcorp.com"],
      },
      // Tenant 2
      {
        tenant_id: t2, title: "Tomógrafo com erro de calibração", description: "Equipamento exibindo código de erro E-4502 durante exames.",
        priority: "critica", status: "em_execucao", category_id: t2Cats[0]?.id, unit_id: units![2].id,
        assigned_to_id: userIds["tecnico@hospital.com"],
        started_at: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        tenant_id: t2, title: "Goteira no teto da enfermaria 3B", description: "Infiltração causando goteira próximo aos leitos.",
        priority: "alta", status: "aberta", category_id: t2Cats[1]?.id || t2Cats[0]?.id, unit_id: units![3].id,
      },
      {
        tenant_id: t2, title: "Wi-Fi instável na recepção", description: "Pacientes e visitantes relatam quedas frequentes.",
        priority: "media", status: "triagem", category_id: t2Cats[2]?.id || t2Cats[0]?.id, unit_id: units![2].id,
      },
    ];

    const { data: workOrders, error: woErr } = await supabase
      .from("work_orders")
      .insert(woData.map(wo => ({ ...wo, code: "" })))
      .select();
    if (woErr) throw woErr;

    // 9) Work Order Events (timeline)
    const events: any[] = [];
    for (const wo of workOrders!) {
      events.push({
        tenant_id: wo.tenant_id,
        work_order_id: wo.id,
        type: "created",
        actor_user_id: wo.tenant_id === t1 ? userIds["coord@techcorp.com"] : userIds["admin@hospital.com"],
        payload: { title: wo.title },
        created_at: wo.created_at,
      });

      if (wo.assigned_to_id) {
        events.push({
          tenant_id: wo.tenant_id,
          work_order_id: wo.id,
          type: "assigned",
          actor_user_id: wo.tenant_id === t1 ? userIds["coord@techcorp.com"] : userIds["admin@hospital.com"],
          payload: { assigned_to: wo.assigned_to_id },
        });
      }

      if (wo.status !== "aberta") {
        events.push({
          tenant_id: wo.tenant_id,
          work_order_id: wo.id,
          type: "status_changed",
          actor_user_id: wo.assigned_to_id || (wo.tenant_id === t1 ? userIds["coord@techcorp.com"] : userIds["admin@hospital.com"]),
          payload: { from: "aberta", to: wo.status },
        });
      }

      if (wo.status === "em_execucao" || wo.status === "concluida") {
        events.push({
          tenant_id: wo.tenant_id,
          work_order_id: wo.id,
          type: "comment_internal",
          actor_user_id: wo.assigned_to_id || (wo.tenant_id === t1 ? userIds["tecnico@techcorp.com"] : userIds["tecnico@hospital.com"]),
          payload: { text: "Verificação inicial realizada. Diagnóstico em andamento." },
        });
      }

      if (wo.status === "concluida") {
        events.push({
          tenant_id: wo.tenant_id,
          work_order_id: wo.id,
          type: "resolved",
          actor_user_id: wo.assigned_to_id,
          payload: { resolution: "Problema corrigido com sucesso." },
        });
      }
    }

    await supabase.from("work_order_events").insert(events);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Seed data created successfully!",
        summary: {
          tenants: 2,
          users: users.length,
          categories: catData.length,
          units: unitData.length,
          customers: custData.length,
          workOrders: woData.length,
          events: events.length,
        },
        credentials: users.map(u => ({ email: u.email, password: u.password, role: u.role })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
