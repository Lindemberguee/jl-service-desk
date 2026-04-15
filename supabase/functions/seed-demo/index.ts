import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function upsertRow(sb: any, table: string, tenantId: string, matchField: string, matchValue: string, data: any) {
  const { data: ex } = await sb.from(table).select("id").eq("tenant_id", tenantId).eq(matchField, matchValue).maybeSingle();
  if (ex) return ex.id;
  const { data: row, error } = await sb.from(table).insert({ tenant_id: tenantId, ...data }).select("id").single();
  if (error) throw error;
  return row.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. TENANT
    const { data: existingTenant } = await sb.from("tenants").select("id").eq("slug", "demo-polietileno").maybeSingle();
    let T: string;
    if (existingTenant) { T = existingTenant.id; }
    else {
      const { data, error } = await sb.from("tenants").insert({ name: "Demo - Polietileno Reciclavel", slug: "demo-polietileno", primary_color: "#16A34A", accent_color: "#0D9488", plan: "pro" }).select("id").single();
      if (error) throw error;
      T = data.id;
    }

    // 2. USERS
    const usersSpec = [
      { email: "demo@ordfy", password: "Demo1234!", name: "Admin Demo", role: "super_admin" },
      { email: "coord.demo@ordfy", password: "Coord1234!", name: "Ricardo Coordenador", role: "coordenador" },
      { email: "tecnico.demo@ordfy", password: "Tecnico1234!", name: "Marcos Tecnico", role: "tecnico" },
      { email: "tecnico2.demo@ordfy", password: "Tecnico1234!", name: "Juliana Tecnica", role: "tecnico" },
      { email: "analista.demo@ordfy", password: "Analista1234!", name: "Camila Analista", role: "analista" },
      { email: "solicitante.demo@ordfy", password: "Solic1234!", name: "Fernando Solicitante", role: "solicitante" },
    ];
    const userIds: Record<string, string> = {};
    for (const u of usersSpec) {
      const { data: allUsers } = await sb.auth.admin.listUsers();
      const found = allUsers?.users?.find((eu: any) => eu.email === u.email);
      let uid: string;
      if (found) { uid = found.id; }
      else {
        const { data, error } = await sb.auth.admin.createUser({ email: u.email, password: u.password, user_metadata: { name: u.name }, email_confirm: true });
        if (error) throw error;
        uid = data.user.id;
      }
      userIds[u.email] = uid;
      await sb.from("profiles").upsert({ id: uid, name: u.name, email: u.email });
      const { data: mem } = await sb.from("user_memberships").select("id").eq("user_id", uid).eq("tenant_id", T).maybeSingle();
      if (!mem) await sb.from("user_memberships").insert({ user_id: uid, tenant_id: T, role: u.role });
    }
    const adminId = userIds["demo@ordfy"];
    const coordId = userIds["coord.demo@ordfy"];
    const tecId = userIds["tecnico.demo@ordfy"];
    const tec2Id = userIds["tecnico2.demo@ordfy"];

    // 3. CATEGORIES
    const categoryNames = ["Extrusao","Reciclagem","Moagem","Lavagem","Granulacao","Eletrica Industrial","Hidraulica","Refrigeracao","Instrumentacao","Seguranca do Trabalho"];
    const catIds: Record<string, string> = {};
    for (const name of categoryNames) { catIds[name] = await upsertRow(sb, "categories", T, "name", name, { name }); }

    // 4. UNITS & LOCATIONS
    const unitsSpec = [
      { name: "Planta Industrial - Matriz", city: "Recife", state: "PE", address: "Rod. BR-101 km 62, Distrito Industrial" },
      { name: "Galpao de Reciclagem", city: "Jaboatao dos Guararapes", state: "PE", address: "Rua dos Recicladores, 450" },
      { name: "Centro de Distribuicao", city: "Cabo de Santo Agostinho", state: "PE", address: "Via Portuaria, 1200" },
    ];
    const unitIds: Record<string, string> = {};
    for (const u of unitsSpec) { unitIds[u.name] = await upsertRow(sb, "units", T, "name", u.name, u); }

    const locationsSpec = [
      { unit: "Planta Industrial - Matriz", name: "Linha de Extrusao 01", description: "Extrusora principal de PE reciclado" },
      { unit: "Planta Industrial - Matriz", name: "Linha de Extrusao 02", description: "Extrusora secundaria de filme PEBD" },
      { unit: "Planta Industrial - Matriz", name: "Sala de Maquinas", description: "Compressores, chillers e bombas" },
      { unit: "Planta Industrial - Matriz", name: "Almoxarifado Central", description: "Estoque de pecas e insumos" },
      { unit: "Planta Industrial - Matriz", name: "Laboratorio de Qualidade", description: "Testes de MFI, tracao e cor" },
      { unit: "Planta Industrial - Matriz", name: "Subestacao Eletrica", description: "Cabine primaria 13.8kV" },
      { unit: "Galpao de Reciclagem", name: "Area de Triagem", description: "Separacao de plasticos por tipo e cor" },
      { unit: "Galpao de Reciclagem", name: "Moinho de Facas", description: "Moagem de fardos de PE" },
      { unit: "Galpao de Reciclagem", name: "Tanque de Lavagem", description: "Lavagem e flotacao do material moido" },
      { unit: "Galpao de Reciclagem", name: "Secador Centrifugo", description: "Secagem pos-lavagem" },
      { unit: "Centro de Distribuicao", name: "Doca de Expedicao", description: "Carregamento de big bags e paletes" },
      { unit: "Centro de Distribuicao", name: "Estoque de Produto Acabado", description: "Granulado e pellets prontos" },
    ];
    const locIds: Record<string, string> = {};
    for (const l of locationsSpec) {
      const { data: ex } = await sb.from("locations").select("id").eq("tenant_id", T).eq("name", l.name).maybeSingle();
      if (ex) { locIds[l.name] = ex.id; continue; }
      const { data, error } = await sb.from("locations").insert({ tenant_id: T, unit_id: unitIds[l.unit], name: l.name, description: l.description }).select("id").single();
      if (error) throw error;
      locIds[l.name] = data.id;
    }

    // 5. COLLABORATORS
    const collabsSpec = [
      { full_name: "Ricardo Almeida", department: "Producao", email: "ricardo@demo.com", phone: "(81) 99900-1111", matricula: "COL-001" },
      { full_name: "Marcos Oliveira", department: "Manutencao", email: "marcos@demo.com", phone: "(81) 99900-2222", matricula: "COL-002" },
      { full_name: "Juliana Santos", department: "Manutencao", email: "juliana@demo.com", phone: "(81) 99900-3333", matricula: "COL-003" },
      { full_name: "Camila Ferreira", department: "Qualidade", email: "camila@demo.com", phone: "(81) 99900-4444", matricula: "COL-004" },
      { full_name: "Fernando Costa", department: "Producao", email: "fernando@demo.com", phone: "(81) 99900-5555", matricula: "COL-005" },
      { full_name: "Thiago Barbosa", department: "Logistica", email: "thiago@demo.com", phone: "(81) 99900-6666", matricula: "COL-006" },
      { full_name: "Patricia Lima", department: "Seguranca", email: "patricia@demo.com", phone: "(81) 99900-7777", matricula: "COL-007" },
      { full_name: "Lucas Mendes", department: "Reciclagem", email: "lucas@demo.com", phone: "(81) 99900-8888", matricula: "COL-008" },
      { full_name: "Aline Souza", department: "Administrativo", email: "aline@demo.com", phone: "(81) 99900-9999", matricula: "COL-009" },
      { full_name: "Roberto Nascimento", department: "Producao", email: "roberto@demo.com", phone: "(81) 99901-0000", matricula: "COL-010" },
    ];
    for (const c of collabsSpec) {
      const { data: ex } = await sb.from("collaborators").select("id").eq("tenant_id", T).eq("matricula", c.matricula).maybeSingle();
      if (!ex) await sb.from("collaborators").insert({ tenant_id: T, ...c });
    }

    // 6. ASSETS
    const assetsSpec = [
      { name: "Extrusora Dupla Rosca ZSK-70", serial_number: "EXT-2021-001", patrimony_code: "PAT-001", unit: "Planta Industrial - Matriz", location: "Linha de Extrusao 01", category: "Extrusao", status: "ativo", purchase_value: 850000 },
      { name: "Extrusora Mono Rosca L/D 30:1", serial_number: "EXT-2019-002", patrimony_code: "PAT-002", unit: "Planta Industrial - Matriz", location: "Linha de Extrusao 02", category: "Extrusao", status: "ativo", purchase_value: 420000 },
      { name: "Moinho de Facas MF-800", serial_number: "MOI-2020-001", patrimony_code: "PAT-003", unit: "Galpao de Reciclagem", location: "Moinho de Facas", category: "Moagem", status: "ativo", purchase_value: 175000 },
      { name: "Tanque de Lavagem TL-5000", serial_number: "TLV-2020-001", patrimony_code: "PAT-004", unit: "Galpao de Reciclagem", location: "Tanque de Lavagem", category: "Lavagem", status: "ativo", purchase_value: 95000 },
      { name: "Granulador Subaquatico GSA-200", serial_number: "GRA-2022-001", patrimony_code: "PAT-005", unit: "Planta Industrial - Matriz", location: "Linha de Extrusao 01", category: "Granulacao", status: "ativo", purchase_value: 320000 },
      { name: "Chiller Industrial 150TR", serial_number: "CHL-2021-001", patrimony_code: "PAT-006", unit: "Planta Industrial - Matriz", location: "Sala de Maquinas", category: "Refrigeracao", status: "ativo", purchase_value: 280000 },
      { name: "Compressor Parafuso Atlas GA-90", serial_number: "CMP-2020-001", patrimony_code: "PAT-007", unit: "Planta Industrial - Matriz", location: "Sala de Maquinas", category: "Instrumentacao", status: "ativo", purchase_value: 195000 },
      { name: "Secador Centrifugo SC-600", serial_number: "SEC-2020-001", patrimony_code: "PAT-008", unit: "Galpao de Reciclagem", location: "Secador Centrifugo", category: "Reciclagem", status: "em_manutencao", purchase_value: 120000 },
      { name: "Transformador 500kVA", serial_number: "TRF-2018-001", patrimony_code: "PAT-009", unit: "Planta Industrial - Matriz", location: "Subestacao Eletrica", category: "Eletrica Industrial", status: "ativo", purchase_value: 85000 },
      { name: "Empilhadeira Eletrica Still RX20", serial_number: "EMP-2023-001", patrimony_code: "PAT-010", unit: "Centro de Distribuicao", location: "Doca de Expedicao", category: "Seguranca do Trabalho", status: "ativo", purchase_value: 165000 },
      { name: "Detector de Metais Sesotec", serial_number: "DET-2021-001", patrimony_code: "PAT-011", unit: "Galpao de Reciclagem", location: "Area de Triagem", category: "Reciclagem", status: "ativo", purchase_value: 78000 },
      { name: "Balanca Rodoviaria 80t", serial_number: "BAL-2019-001", patrimony_code: "PAT-012", unit: "Centro de Distribuicao", location: "Doca de Expedicao", category: "Instrumentacao", status: "ativo", purchase_value: 95000 },
    ];
    const assetIds: Record<string, string> = {};
    for (const a of assetsSpec) {
      const { data: ex } = await sb.from("assets").select("id").eq("tenant_id", T).eq("patrimony_code", a.patrimony_code).maybeSingle();
      if (ex) { assetIds[a.name] = ex.id; continue; }
      const { data, error } = await sb.from("assets").insert({
        tenant_id: T, name: a.name, serial_number: a.serial_number,
        patrimony_code: a.patrimony_code, unit_id: unitIds[a.unit],
        location_id: locIds[a.location], category_id: catIds[a.category],
        status: a.status, purchase_value: a.purchase_value,
      }).select("id").single();
      if (error) throw error;
      assetIds[a.name] = data.id;
    }

    // 7. STOCK ITEMS
    const stockSpec = [
      { name: "Correia Transportadora EP200 (metro)", sku: "STK-001", unit: "m", min_level: 20, current_level: 45, unit_price: 85, brand: "Continental" },
      { name: "Rolamento 6312-2RS", sku: "STK-002", unit: "un", min_level: 10, current_level: 25, unit_price: 120, brand: "SKF" },
      { name: "Oleo Lubrificante ISO 220 (litro)", sku: "STK-003", unit: "L", min_level: 50, current_level: 180, unit_price: 28, brand: "Shell Omala" },
      { name: "Facas para Moinho (jogo 12un)", sku: "STK-004", unit: "jg", min_level: 3, current_level: 8, unit_price: 2800, brand: "Rone" },
      { name: "Resistencia Ceramica Extrusora", sku: "STK-005", unit: "un", min_level: 5, current_level: 12, unit_price: 450, brand: "Watlow" },
      { name: "Filtro Tela Inox Mesh 80", sku: "STK-006", unit: "un", min_level: 20, current_level: 65, unit_price: 35, brand: "GKD" },
      { name: "Parafuso Extrusora Bimetalico", sku: "STK-007", unit: "un", min_level: 1, current_level: 2, unit_price: 18500, brand: "Rulli" },
      { name: "Sensor de Temperatura PT100", sku: "STK-008", unit: "un", min_level: 8, current_level: 15, unit_price: 95, brand: "Wika" },
      { name: "Contator Tripolar 150A", sku: "STK-009", unit: "un", min_level: 4, current_level: 6, unit_price: 380, brand: "Siemens" },
      { name: "Inversor de Frequencia 75kW", sku: "STK-010", unit: "un", min_level: 1, current_level: 2, unit_price: 12500, brand: "WEG CFW11" },
      { name: "Graxa Especial Alta Temp (kg)", sku: "STK-011", unit: "kg", min_level: 10, current_level: 35, unit_price: 65, brand: "Mobilux EP" },
      { name: "Mangueira Hidraulica 1/2pol", sku: "STK-012", unit: "m", min_level: 15, current_level: 40, unit_price: 48, brand: "Parker" },
      { name: "Valvula Solenoide 1pol", sku: "STK-013", unit: "un", min_level: 3, current_level: 5, unit_price: 520, brand: "Asco" },
      { name: "Pigmento Master PE Verde 25kg", sku: "STK-014", unit: "sc", min_level: 5, current_level: 18, unit_price: 340, brand: "Cromex" },
      { name: "Aditivo UV Estabilizante 25kg", sku: "STK-015", unit: "sc", min_level: 3, current_level: 10, unit_price: 890, brand: "Basf" },
    ];
    const stockIds: Record<string, string> = {};
    for (const s of stockSpec) {
      const { data: ex } = await sb.from("stock_items").select("id").eq("tenant_id", T).eq("sku", s.sku).maybeSingle();
      if (ex) { stockIds[s.sku] = ex.id; continue; }
      const { data, error } = await sb.from("stock_items").insert({ tenant_id: T, name: s.name, sku: s.sku, unit: s.unit, min_level: s.min_level, current_level: s.current_level, unit_price: s.unit_price, brand: s.brand, status: "ativo" }).select("id").single();
      if (error) throw error;
      stockIds[s.sku] = data.id;
    }
    for (const s of stockSpec) {
      const sid = stockIds[s.sku];
      const { data: ex } = await sb.from("stock_movements").select("id").eq("stock_item_id", sid).limit(1).maybeSingle();
      if (!ex) await sb.from("stock_movements").insert({ tenant_id: T, stock_item_id: sid, type: "in", qty: s.current_level, reference: "Estoque inicial", created_by: adminId });
    }

    // 8. WORK ORDERS (27 total - varied dates, statuses, priorities)
    const now = Date.now();
    const H = 3600000; const D = 86400000;
    const allWos = [
      // Original 12
      { title: "Troca de facas do moinho MF-800", priority: "alta", status: "em_execucao", cat: "Moagem", unit: "Galpao de Reciclagem", assigned: tecId, daysAgo: 1 },
      { title: "Vazamento no circuito hidraulico da prensa", priority: "critica", status: "em_execucao", cat: "Hidraulica", unit: "Galpao de Reciclagem", assigned: tecId, daysAgo: 0 },
      { title: "Manutencao preventiva Chiller 150TR", priority: "media", status: "aberta", cat: "Refrigeracao", unit: "Planta Industrial - Matriz", assigned: null, daysAgo: 2 },
      { title: "Calibracao de sensores PT100 zona 3-5", priority: "alta", status: "triagem", cat: "Instrumentacao", unit: "Planta Industrial - Matriz", assigned: null, daysAgo: 3 },
      { title: "Substituicao de rolamentos do secador centrifugo", priority: "critica", status: "aguardando_peca", cat: "Reciclagem", unit: "Galpao de Reciclagem", assigned: tec2Id, daysAgo: 4 },
      { title: "Inspecao eletrica Subestacao 13.8kV", priority: "alta", status: "aberta", cat: "Eletrica Industrial", unit: "Planta Industrial - Matriz", assigned: coordId, daysAgo: 1 },
      { title: "Reparo esteira transportadora linha 01", priority: "media", status: "concluida", cat: "Extrusao", unit: "Planta Industrial - Matriz", assigned: tecId, daysAgo: 8 },
      { title: "Troca do trocador de tela automatico", priority: "alta", status: "concluida", cat: "Extrusao", unit: "Planta Industrial - Matriz", assigned: tec2Id, daysAgo: 12 },
      { title: "Instalacao de novo detector de metais", priority: "media", status: "triagem", cat: "Reciclagem", unit: "Galpao de Reciclagem", assigned: null, daysAgo: 5 },
      { title: "Revisao empilhadeira eletrica Still RX20", priority: "baixa", status: "aberta", cat: "Seguranca do Trabalho", unit: "Centro de Distribuicao", assigned: null, daysAgo: 6 },
      { title: "Vazamento de agua no tanque de lavagem", priority: "alta", status: "em_execucao", cat: "Lavagem", unit: "Galpao de Reciclagem", assigned: tecId, daysAgo: 0 },
      { title: "Atualizacao do CLP da granuladora", priority: "media", status: "aguardando_terceiro", cat: "Granulacao", unit: "Planta Industrial - Matriz", assigned: null, daysAgo: 7 },
      // 15 NEW work orders
      { title: "Troca de oleo redutor extrusora ZSK-70", priority: "media", status: "concluida", cat: "Extrusao", unit: "Planta Industrial - Matriz", assigned: tecId, daysAgo: 15 },
      { title: "Alinhamento de acoplamento bomba refrigeracao", priority: "alta", status: "concluida", cat: "Refrigeracao", unit: "Planta Industrial - Matriz", assigned: tec2Id, daysAgo: 20 },
      { title: "Reparo no painel eletrico QG-02", priority: "critica", status: "encerrada", cat: "Eletrica Industrial", unit: "Planta Industrial - Matriz", assigned: tecId, daysAgo: 25 },
      { title: "Lubrificacao geral esteira de alimentacao", priority: "baixa", status: "concluida", cat: "Moagem", unit: "Galpao de Reciclagem", assigned: tecId, daysAgo: 30 },
      { title: "Calibracao balanca rodoviaria INMETRO", priority: "alta", status: "aprovada", cat: "Instrumentacao", unit: "Centro de Distribuicao", assigned: coordId, daysAgo: 18 },
      { title: "Troca de filtro separador compressor Atlas", priority: "media", status: "concluida", cat: "Instrumentacao", unit: "Planta Industrial - Matriz", assigned: tec2Id, daysAgo: 35 },
      { title: "Reparo vazamento valvula torre resfriamento", priority: "alta", status: "em_execucao", cat: "Hidraulica", unit: "Planta Industrial - Matriz", assigned: tecId, daysAgo: 1 },
      { title: "Substituicao correia moinho secundario", priority: "media", status: "aberta", cat: "Moagem", unit: "Galpao de Reciclagem", assigned: null, daysAgo: 2 },
      { title: "Limpeza tanque decantacao efluentes", priority: "baixa", status: "triagem", cat: "Lavagem", unit: "Galpao de Reciclagem", assigned: null, daysAgo: 4 },
      { title: "Inspecao NR-13 vaso de pressao", priority: "critica", status: "aguardando_terceiro", cat: "Seguranca do Trabalho", unit: "Planta Industrial - Matriz", assigned: coordId, daysAgo: 10 },
      { title: "Troca de resistencias zona 1-2 extrusora mono", priority: "alta", status: "concluida", cat: "Extrusao", unit: "Planta Industrial - Matriz", assigned: tecId, daysAgo: 22 },
      { title: "Revisao preventiva 1000h granulador GSA-200", priority: "media", status: "concluida", cat: "Granulacao", unit: "Planta Industrial - Matriz", assigned: tec2Id, daysAgo: 40 },
      { title: "Reparo pneumatico cilindro troca-tela", priority: "alta", status: "reaberta", cat: "Extrusao", unit: "Planta Industrial - Matriz", assigned: tecId, daysAgo: 3 },
      { title: "Instalacao sensor de nivel tanque lavagem", priority: "baixa", status: "concluida", cat: "Instrumentacao", unit: "Galpao de Reciclagem", assigned: tec2Id, daysAgo: 45 },
      { title: "Manutencao preventiva empilhadeira 1000h", priority: "media", status: "encerrada", cat: "Seguranca do Trabalho", unit: "Centro de Distribuicao", assigned: tecId, daysAgo: 50 },
    ];

    let woCount = 0;
    for (const wo of allWos) {
      const { data: ex } = await sb.from("work_orders").select("id").eq("tenant_id", T).eq("title", wo.title).maybeSingle();
      if (ex) continue;

      const createdAt = new Date(now - wo.daysAgo * D);
      const insert: any = {
        tenant_id: T, title: wo.title, description: `Ordem de servico: ${wo.title}`,
        priority: wo.priority, status: wo.status,
        category_id: catIds[wo.cat], unit_id: unitIds[wo.unit],
        code: `DEMO-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        response_due_at: new Date(createdAt.getTime() + 4 * H).toISOString(),
        resolve_due_at: new Date(createdAt.getTime() + 24 * H).toISOString(),
        assigned_to_id: wo.assigned || null,
        created_at: createdAt.toISOString(),
      };
      if (["em_execucao","reaberta"].includes(wo.status)) insert.started_at = new Date(createdAt.getTime() + 2*H).toISOString();
      if (["concluida","aprovada","encerrada"].includes(wo.status)) {
        insert.started_at = new Date(createdAt.getTime() + 1*H).toISOString();
        insert.resolved_at = new Date(createdAt.getTime() + 8*H).toISOString();
      }
      if (wo.status === "encerrada") insert.closed_at = new Date(createdAt.getTime() + 12*H).toISOString();
      if (["aguardando_peca","aguardando_terceiro","aguardando_solicitante"].includes(wo.status)) {
        insert.started_at = new Date(createdAt.getTime() + 1*H).toISOString();
        insert.paused_at = new Date(createdAt.getTime() + 3*H).toISOString();
      }

      const { data: woRes, error } = await sb.from("work_orders").insert(insert).select("id, code").single();
      if (error) throw error;
      woCount++;
      await sb.from("work_order_events").insert({ tenant_id: T, work_order_id: woRes.id, type: "created", actor_user_id: adminId, payload: { text: `OS ${woRes.code} criada` } });
    }

    // 9. MAINTENANCE RECORDS
    const maintSpec = [
      { asset: "Extrusora Dupla Rosca ZSK-70", title: "Preventiva 2000h - Extrusora ZSK-70", type: "preventiva", status: "concluida", cost: 4500, daysAgo: 30 },
      { asset: "Moinho de Facas MF-800", title: "Troca de facas - Moinho MF-800", type: "corretiva", status: "em_andamento", cost: 3200, daysAgo: 2 },
      { asset: "Chiller Industrial 150TR", title: "Preventiva trimestral - Chiller", type: "preventiva", status: "agendada", cost: 2800, daysAgo: -7 },
      { asset: "Compressor Parafuso Atlas GA-90", title: "Troca oleo separador compressor", type: "preventiva", status: "concluida", cost: 6200, daysAgo: 60 },
      { asset: "Secador Centrifugo SC-600", title: "Substituicao rolamentos Secador", type: "corretiva", status: "em_andamento", cost: 1800, daysAgo: 1 },
      { asset: "Balanca Rodoviaria 80t", title: "Calibracao anual Balanca INMETRO", type: "preditiva", status: "agendada", cost: 3500, daysAgo: -15 },
    ];
    for (const m of maintSpec) {
      const aId = assetIds[m.asset]; if (!aId) continue;
      const { data: ex } = await sb.from("asset_maintenance_records").select("id").eq("tenant_id", T).eq("title", m.title).maybeSingle();
      if (ex) continue;
      const schedDate = new Date(now - m.daysAgo * D);
      await sb.from("asset_maintenance_records").insert({
        tenant_id: T, asset_id: aId, title: m.title, type: m.type, status: m.status, cost: m.cost,
        scheduled_at: schedDate.toISOString(),
        started_at: m.status !== "agendada" ? new Date(schedDate.getTime() + D).toISOString() : null,
        completed_at: m.status === "concluida" ? new Date(schedDate.getTime() + 2*D).toISOString() : null,
        technician_id: tecId, created_by: coordId,
      });
    }

    // 10. DISPOSALS
    const disposalSpec = [
      { item_name: "Jogo de Facas Moinho - Desgastadas", reason: "obsoleto", status: "aprovado", quantity: 2, category: "Moagem", origin_type: "manual", residual_value: 150 },
      { item_name: "Sensor PT100 - Queimado", reason: "queimado", status: "efetivado", quantity: 3, category: "Instrumentacao", origin_type: "manual", residual_value: 0 },
      { item_name: "Mangueira Hidraulica - Rompida", reason: "defeituoso", status: "pendente", quantity: 5, category: "Hidraulica", origin_type: "estoque", residual_value: 0 },
      { item_name: "Inversor WEG CFW09 - Obsoleto", reason: "obsoleto", status: "aprovado", quantity: 1, category: "Eletrica", origin_type: "ativo", residual_value: 800 },
    ];
    for (const d of disposalSpec) {
      const { data: ex } = await sb.from("disposals").select("id").eq("tenant_id", T).eq("item_name", d.item_name).maybeSingle();
      if (ex) continue;
      await sb.from("disposals").insert({
        tenant_id: T, item_name: d.item_name, reason: d.reason, status: d.status,
        quantity: d.quantity, category: d.category, origin_type: d.origin_type,
        residual_value: d.residual_value, created_by: coordId,
        approved_by: ["aprovado","efetivado"].includes(d.status) ? adminId : null,
        approved_at: ["aprovado","efetivado"].includes(d.status) ? new Date().toISOString() : null,
      });
    }

    // 11. CUSTOMERS
    const customersSpec = [
      { name: "Departamento de Producao", email: "producao@demo.com", type: "internal", sector: "Producao", position: "Gerente" },
      { name: "Departamento de Qualidade", email: "qualidade@demo.com", type: "internal", sector: "Qualidade", position: "Coordenador" },
      { name: "Logistica e Expedicao", email: "logistica@demo.com", type: "internal", sector: "Logistica", position: "Supervisor" },
      { name: "Plasticos Nordeste Ltda", email: "contato@plasticosnordeste.com", type: "external", sector: "Comercial", position: "Comprador" },
      { name: "EcoPlast Reciclagem SA", email: "compras@ecoplast.com", type: "external", sector: "Fornecimento", position: "Gerente" },
    ];
    for (const c of customersSpec) {
      const { data: ex } = await sb.from("customers").select("id").eq("tenant_id", T).eq("email", c.email).maybeSingle();
      if (!ex) await sb.from("customers").insert({ tenant_id: T, ...c });
    }

    // 12. SLA POLICIES
    const { data: exSla } = await sb.from("sla_policies").select("id").eq("tenant_id", T).limit(1).maybeSingle();
    if (!exSla) {
      await sb.from("sla_policies").insert({
        tenant_id: T, name: "SLA Padrao Industrial",
        pause_statuses: ["aguardando_peca","aguardando_solicitante","aguardando_terceiro"],
        rules: [
          { priority: "critica", response_minutes: 30, resolve_minutes: 240 },
          { priority: "alta", response_minutes: 60, resolve_minutes: 480 },
          { priority: "media", response_minutes: 240, resolve_minutes: 1440 },
          { priority: "baixa", response_minutes: 480, resolve_minutes: 2880 },
        ],
      });
    }

    // ──────────────────────────────────────────────
    // 13. KPIs
    // ──────────────────────────────────────────────
    const kpisSpec = [
      { name: "Taxa de Disponibilidade de Equipamentos", unit: "%", category: "Operacional", direction: "higher_is_better", target_value: 95, warning_threshold: 90, critical_threshold: 85, color: "#16A34A", icon: "Activity", data_source: "manual", description: "Percentual de tempo que os equipamentos estao disponiveis para producao" },
      { name: "MTBF - Tempo Medio Entre Falhas", unit: "horas", category: "Manutencao", direction: "higher_is_better", target_value: 720, warning_threshold: 500, critical_threshold: 300, color: "#3B82F6", icon: "Clock", data_source: "manual", description: "Media de horas entre falhas de equipamentos criticos" },
      { name: "MTTR - Tempo Medio de Reparo", unit: "horas", category: "Manutencao", direction: "lower_is_better", target_value: 4, warning_threshold: 6, critical_threshold: 8, color: "#F59E0B", icon: "Wrench", data_source: "manual", description: "Tempo medio para reparar equipamentos apos falha" },
      { name: "Taxa de Reciclagem Efetiva", unit: "%", category: "Producao", direction: "higher_is_better", target_value: 92, warning_threshold: 85, critical_threshold: 78, color: "#10B981", icon: "Recycle", data_source: "manual", description: "Percentual de material reciclado aproveitado vs entrada" },
      { name: "Indice de Rejeicao de Qualidade", unit: "%", category: "Qualidade", direction: "lower_is_better", target_value: 2, warning_threshold: 4, critical_threshold: 6, color: "#EF4444", icon: "AlertTriangle", data_source: "manual", description: "Percentual de lotes rejeitados no controle de qualidade" },
      { name: "Consumo Energetico por Tonelada", unit: "kWh/t", category: "Sustentabilidade", direction: "lower_is_better", target_value: 350, warning_threshold: 400, critical_threshold: 450, color: "#8B5CF6", icon: "Zap", data_source: "manual", description: "Energia consumida por tonelada de PE produzido" },
      { name: "OS Concluidas no Prazo SLA", unit: "%", category: "Operacional", direction: "higher_is_better", target_value: 90, warning_threshold: 80, critical_threshold: 70, color: "#0891B2", icon: "CheckCircle", data_source: "manual", description: "Percentual de OS concluidas dentro do prazo de SLA" },
      { name: "Producao Mensal de Granulado", unit: "toneladas", category: "Producao", direction: "higher_is_better", target_value: 500, warning_threshold: 400, critical_threshold: 300, color: "#059669", icon: "BarChart3", data_source: "manual", description: "Volume mensal de granulado de PE reciclado produzido" },
    ];

    const kpiIds: Record<string, string> = {};
    for (const k of kpisSpec) {
      const { data: ex } = await sb.from("kpis").select("id").eq("tenant_id", T).eq("name", k.name).maybeSingle();
      if (ex) { kpiIds[k.name] = ex.id; continue; }
      const { data, error } = await sb.from("kpis").insert({ tenant_id: T, ...k, created_by: adminId }).select("id").single();
      if (error) throw error;
      kpiIds[k.name] = data.id;
    }

    // KPI ENTRIES (last 6 months)
    const months = 6;
    const kpiValues: Record<string, number[]> = {
      "Taxa de Disponibilidade de Equipamentos": [93.2, 94.5, 91.8, 95.1, 93.7, 96.2],
      "MTBF - Tempo Medio Entre Falhas": [580, 620, 510, 690, 720, 750],
      "MTTR - Tempo Medio de Reparo": [5.2, 4.8, 6.1, 4.3, 3.9, 3.5],
      "Taxa de Reciclagem Efetiva": [88.5, 89.2, 90.1, 91.3, 92.0, 91.8],
      "Indice de Rejeicao de Qualidade": [3.8, 3.2, 2.9, 2.5, 2.1, 1.8],
      "Consumo Energetico por Tonelada": [420, 405, 395, 380, 365, 355],
      "OS Concluidas no Prazo SLA": [78, 82, 85, 88, 91, 93],
      "Producao Mensal de Granulado": [380, 410, 430, 460, 485, 510],
    };

    for (const [kpiName, values] of Object.entries(kpiValues)) {
      const kpiId = kpiIds[kpiName]; if (!kpiId) continue;
      for (let i = 0; i < months; i++) {
        const monthOffset = months - 1 - i;
        const d = new Date();
        d.setMonth(d.getMonth() - monthOffset);
        const periodStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
        const periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];

        const { data: ex } = await sb.from("kpi_entries").select("id").eq("kpi_id", kpiId).eq("period_start", periodStart).maybeSingle();
        if (ex) continue;
        await sb.from("kpi_entries").insert({
          tenant_id: T, kpi_id: kpiId, value: values[i],
          period_start: periodStart, period_end: periodEnd,
          recorded_by: adminId,
        });
      }
    }

    // ──────────────────────────────────────────────
    // 14. OKR CYCLE + OBJECTIVES + KEY RESULTS
    // ──────────────────────────────────────────────
    let cycleId: string;
    const { data: exCycle } = await sb.from("okr_cycles").select("id").eq("tenant_id", T).eq("name", "Q2 2026 - Excelencia Operacional").maybeSingle();
    if (exCycle) { cycleId = exCycle.id; }
    else {
      const { data, error } = await sb.from("okr_cycles").insert({
        tenant_id: T, name: "Q2 2026 - Excelencia Operacional",
        type: "quarterly", starts_at: "2026-04-01", ends_at: "2026-06-30",
        status: "active", created_by: adminId,
      }).select("id").single();
      if (error) throw error;
      cycleId = data.id;
    }

    const objectivesSpec = [
      {
        title: "Maximizar disponibilidade do parque industrial",
        category: "Operacional", priority: "alta", description: "Garantir que 95%+ dos equipamentos estejam operacionais",
        area: "Manutencao", responsible_name: "Ricardo Coordenador",
        keyResults: [
          { title: "Atingir 95% de disponibilidade de equipamentos", unit: "%", target_value: 95, start_value: 91, current_value: 93.7 },
          { title: "Reduzir MTTR para menos de 4h", unit: "horas", target_value: 4, start_value: 6, current_value: 4.3 },
          { title: "Zerar OS criticas pendentes ha mais de 48h", unit: "un", target_value: 0, start_value: 5, current_value: 2 },
        ],
      },
      {
        title: "Elevar eficiencia do processo de reciclagem",
        category: "Producao", priority: "alta", description: "Aumentar taxa de aproveitamento e reducao de perdas",
        area: "Producao", responsible_name: "Camila Analista",
        keyResults: [
          { title: "Taxa de reciclagem efetiva acima de 92%", unit: "%", target_value: 92, start_value: 88, current_value: 91.8 },
          { title: "Producao mensal acima de 500t", unit: "t", target_value: 500, start_value: 380, current_value: 485 },
          { title: "Indice de rejeicao abaixo de 2%", unit: "%", target_value: 2, start_value: 4, current_value: 2.1 },
        ],
      },
      {
        title: "Reduzir impacto ambiental da operacao",
        category: "Sustentabilidade", priority: "media", description: "Diminuir consumo energetico e melhorar gestao de residuos",
        area: "Gestao", responsible_name: "Admin Demo",
        keyResults: [
          { title: "Consumo energetico abaixo de 360 kWh/t", unit: "kWh/t", target_value: 360, start_value: 420, current_value: 365 },
          { title: "100% dos descartes com rastreabilidade", unit: "%", target_value: 100, start_value: 60, current_value: 85 },
        ],
      },
    ];

    for (let oi = 0; oi < objectivesSpec.length; oi++) {
      const obj = objectivesSpec[oi];
      const { data: exObj } = await sb.from("okr_objectives").select("id").eq("tenant_id", T).eq("title", obj.title).maybeSingle();
      let objId: string;
      if (exObj) { objId = exObj.id; }
      else {
        const avgProgress = obj.keyResults.reduce((sum, kr) => {
          const range = Math.abs(kr.target_value - kr.start_value);
          const done = Math.abs(kr.current_value - kr.start_value);
          return sum + (range > 0 ? Math.min(100, (done / range) * 100) : 0);
        }, 0) / obj.keyResults.length;

        const { data, error } = await sb.from("okr_objectives").insert({
          tenant_id: T, cycle_id: cycleId, title: obj.title, description: obj.description,
          category: obj.category, priority: obj.priority, area: obj.area,
          responsible_name: obj.responsible_name, sort_order: oi,
          progress: Math.round(avgProgress), status: avgProgress >= 70 ? "on_track" : "at_risk",
          created_by: adminId,
        }).select("id").single();
        if (error) throw error;
        objId = data.id;
      }

      for (let ki = 0; ki < obj.keyResults.length; ki++) {
        const kr = obj.keyResults[ki];
        const { data: exKr } = await sb.from("okr_key_results").select("id").eq("tenant_id", T).eq("title", kr.title).maybeSingle();
        if (exKr) continue;
        await sb.from("okr_key_results").insert({
          tenant_id: T, objective_id: objId, title: kr.title,
          unit: kr.unit, target_value: kr.target_value,
          start_value: kr.start_value, current_value: kr.current_value,
          sort_order: ki, status: kr.current_value >= kr.target_value * 0.9 ? "on_track" : "at_risk",
          confidence_level: 70 + Math.random() * 25,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      tenant: "Demo - Polietileno Reciclavel",
      data_seeded: {
        work_orders: `${allWos.length} (${woCount} new)`,
        kpis: kpisSpec.length,
        kpi_entries: `${kpisSpec.length * months} datapoints`,
        okr_cycle: 1, okr_objectives: objectivesSpec.length,
        okr_key_results: objectivesSpec.reduce((s, o) => s + o.keyResults.length, 0),
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
