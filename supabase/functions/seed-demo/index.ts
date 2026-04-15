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
    const sb = createClient(supabaseUrl, serviceRoleKey);

    // ──────────────────────────────────────────────
    // 1. TENANT
    // ──────────────────────────────────────────────
    const { data: existingTenant } = await sb.from("tenants").select("id").eq("slug", "demo-polietileno").maybeSingle();
    let tenantId: string;
    if (existingTenant) {
      tenantId = existingTenant.id;
    } else {
      const { data, error } = await sb.from("tenants").insert({
        name: "Demo - Polietileno Reciclavel",
        slug: "demo-polietileno",
        primary_color: "#16A34A",
        accent_color: "#0D9488",
        plan: "pro",
      }).select("id").single();
      if (error) throw error;
      tenantId = data.id;
    }
    const T = tenantId;

    // ──────────────────────────────────────────────
    // 2. USERS
    // ──────────────────────────────────────────────
    const usersSpec = [
      { email: "demo@ordfy", password: "Demo1234!", name: "Admin Demo", role: "super_admin" as const },
      { email: "coord.demo@ordfy", password: "Coord1234!", name: "Ricardo Coordenador", role: "coordenador" as const },
      { email: "tecnico.demo@ordfy", password: "Tecnico1234!", name: "Marcos Tecnico", role: "tecnico" as const },
      { email: "tecnico2.demo@ordfy", password: "Tecnico1234!", name: "Juliana Tecnica", role: "tecnico" as const },
      { email: "analista.demo@ordfy", password: "Analista1234!", name: "Camila Analista", role: "analista" as const },
      { email: "solicitante.demo@ordfy", password: "Solic1234!", name: "Fernando Solicitante", role: "solicitante" as const },
    ];

    const userIds: Record<string, string> = {};
    for (const u of usersSpec) {
      const { data: existingUsers } = await sb.auth.admin.listUsers();
      const found = existingUsers?.users?.find((eu: any) => eu.email === u.email);
      let uid: string;
      if (found) {
        uid = found.id;
      } else {
        const { data, error } = await sb.auth.admin.createUser({
          email: u.email, password: u.password,
          user_metadata: { name: u.name }, email_confirm: true,
        });
        if (error) throw error;
        uid = data.user.id;
      }
      userIds[u.email] = uid;
      await sb.from("profiles").upsert({ id: uid, name: u.name, email: u.email });

      const { data: mem } = await sb.from("user_memberships")
        .select("id").eq("user_id", uid).eq("tenant_id", T).maybeSingle();
      if (!mem) {
        await sb.from("user_memberships").insert({ user_id: uid, tenant_id: T, role: u.role });
      }
    }

    const adminId = userIds["demo@ordfy"];
    const coordId = userIds["coord.demo@ordfy"];
    const tecId = userIds["tecnico.demo@ordfy"];
    const tec2Id = userIds["tecnico2.demo@ordfy"];

    // ──────────────────────────────────────────────
    // 3. CATEGORIES
    // ──────────────────────────────────────────────
    const categoryNames = [
      "Extrusao", "Reciclagem", "Moagem", "Lavagem", "Granulacao",
      "Eletrica Industrial", "Hidraulica", "Refrigeracao", "Instrumentacao", "Seguranca do Trabalho",
    ];
    const catIds: Record<string, string> = {};
    for (const name of categoryNames) {
      const { data: ex } = await sb.from("categories").select("id").eq("tenant_id", T).eq("name", name).maybeSingle();
      if (ex) { catIds[name] = ex.id; continue; }
      const { data, error } = await sb.from("categories").insert({ tenant_id: T, name }).select("id").single();
      if (error) throw error;
      catIds[name] = data.id;
    }

    // ──────────────────────────────────────────────
    // 4. UNITS & LOCATIONS
    // ──────────────────────────────────────────────
    const unitsSpec = [
      { name: "Planta Industrial - Matriz", city: "Recife", state: "PE", address: "Rod. BR-101 km 62, Distrito Industrial" },
      { name: "Galpao de Reciclagem", city: "Jaboatao dos Guararapes", state: "PE", address: "Rua dos Recicladores, 450" },
      { name: "Centro de Distribuicao", city: "Cabo de Santo Agostinho", state: "PE", address: "Via Portuaria, 1200" },
    ];
    const unitIds: Record<string, string> = {};
    for (const u of unitsSpec) {
      const { data: ex } = await sb.from("units").select("id").eq("tenant_id", T).eq("name", u.name).maybeSingle();
      if (ex) { unitIds[u.name] = ex.id; continue; }
      const { data, error } = await sb.from("units").insert({ tenant_id: T, ...u }).select("id").single();
      if (error) throw error;
      unitIds[u.name] = data.id;
    }

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
      const uid = unitIds[l.unit];
      const { data: ex } = await sb.from("locations").select("id").eq("tenant_id", T).eq("name", l.name).maybeSingle();
      if (ex) { locIds[l.name] = ex.id; continue; }
      const { data, error } = await sb.from("locations").insert({ tenant_id: T, unit_id: uid, name: l.name, description: l.description }).select("id").single();
      if (error) throw error;
      locIds[l.name] = data.id;
    }

    // ──────────────────────────────────────────────
    // 5. COLLABORATORS
    // ──────────────────────────────────────────────
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
      if (ex) continue;
      await sb.from("collaborators").insert({ tenant_id: T, ...c });
    }

    // ──────────────────────────────────────────────
    // 6. ASSETS
    // ──────────────────────────────────────────────
    const assetsSpec = [
      { name: "Extrusora Dupla Rosca ZSK-70", serial_number: "EXT-2021-001", patrimony_code: "PAT-001", unit: "Planta Industrial - Matriz", location: "Linha de Extrusao 01", category: "Extrusao", status: "ativo", purchase_value: 850000, metadata: { potencia_kw: 160, fabricante: "Coperion", ano: 2021 } },
      { name: "Extrusora Mono Rosca L/D 30:1", serial_number: "EXT-2019-002", patrimony_code: "PAT-002", unit: "Planta Industrial - Matriz", location: "Linha de Extrusao 02", category: "Extrusao", status: "ativo", purchase_value: 420000, metadata: { potencia_kw: 90, fabricante: "Rulli Standard", ano: 2019 } },
      { name: "Moinho de Facas MF-800", serial_number: "MOI-2020-001", patrimony_code: "PAT-003", unit: "Galpao de Reciclagem", location: "Moinho de Facas", category: "Moagem", status: "ativo", purchase_value: 175000, metadata: { capacidade_kg_h: 800, fabricante: "Rone", ano: 2020, num_facas: 12 } },
      { name: "Tanque de Lavagem TL-5000", serial_number: "TLV-2020-001", patrimony_code: "PAT-004", unit: "Galpao de Reciclagem", location: "Tanque de Lavagem", category: "Lavagem", status: "ativo", purchase_value: 95000, metadata: { volume_litros: 5000, fabricante: "Tecnotri", ano: 2020 } },
      { name: "Granulador Subaquatico GSA-200", serial_number: "GRA-2022-001", patrimony_code: "PAT-005", unit: "Planta Industrial - Matriz", location: "Linha de Extrusao 01", category: "Granulacao", status: "ativo", purchase_value: 320000, metadata: { capacidade_kg_h: 200, fabricante: "Gala Industries", ano: 2022 } },
      { name: "Chiller Industrial 150TR", serial_number: "CHL-2021-001", patrimony_code: "PAT-006", unit: "Planta Industrial - Matriz", location: "Sala de Maquinas", category: "Refrigeracao", status: "ativo", purchase_value: 280000, metadata: { capacidade_tr: 150, fabricante: "Carrier", fluido: "R-134a" } },
      { name: "Compressor Parafuso Atlas GA-90", serial_number: "CMP-2020-001", patrimony_code: "PAT-007", unit: "Planta Industrial - Matriz", location: "Sala de Maquinas", category: "Instrumentacao", status: "ativo", purchase_value: 195000, metadata: { vazao_cfm: 510, pressao_bar: 10, fabricante: "Atlas Copco" } },
      { name: "Secador Centrifugo SC-600", serial_number: "SEC-2020-001", patrimony_code: "PAT-008", unit: "Galpao de Reciclagem", location: "Secador Centrifugo", category: "Reciclagem", status: "em_manutencao", purchase_value: 120000, metadata: { capacidade_kg_h: 600, fabricante: "Herbold", rpm: 1800 } },
      { name: "Transformador 500kVA", serial_number: "TRF-2018-001", patrimony_code: "PAT-009", unit: "Planta Industrial - Matriz", location: "Subestacao Eletrica", category: "Eletrica Industrial", status: "ativo", purchase_value: 85000, metadata: { potencia_kva: 500, tensao_primaria: "13.8kV", tensao_secundaria: "380V" } },
      { name: "Empilhadeira Eletrica Still RX20", serial_number: "EMP-2023-001", patrimony_code: "PAT-010", unit: "Centro de Distribuicao", location: "Doca de Expedicao", category: "Seguranca do Trabalho", status: "ativo", purchase_value: 165000, metadata: { capacidade_kg: 2000, fabricante: "Still", tipo: "eletrica" } },
      { name: "Detector de Metais Sesotec", serial_number: "DET-2021-001", patrimony_code: "PAT-011", unit: "Galpao de Reciclagem", location: "Area de Triagem", category: "Reciclagem", status: "ativo", purchase_value: 78000, metadata: { fabricante: "Sesotec", tipo: "indutivo", abertura_mm: 400 } },
      { name: "Balanca Rodoviaria 80t", serial_number: "BAL-2019-001", patrimony_code: "PAT-012", unit: "Centro de Distribuicao", location: "Doca de Expedicao", category: "Instrumentacao", status: "ativo", purchase_value: 95000, metadata: { capacidade_t: 80, fabricante: "Toledo", plataforma_m: "18x3" } },
    ];

    const assetIds: Record<string, string> = {};
    for (const a of assetsSpec) {
      const { data: ex } = await sb.from("assets").select("id").eq("tenant_id", T).eq("patrimony_code", a.patrimony_code).maybeSingle();
      if (ex) { assetIds[a.name] = ex.id; continue; }
      const { data, error } = await sb.from("assets").insert({
        tenant_id: T, name: a.name, serial_number: a.serial_number,
        patrimony_code: a.patrimony_code, unit_id: unitIds[a.unit],
        location_id: locIds[a.location], category_id: catIds[a.category],
        status: a.status, purchase_value: a.purchase_value, metadata: a.metadata,
      }).select("id").single();
      if (error) throw error;
      assetIds[a.name] = data.id;
    }

    // ──────────────────────────────────────────────
    // 7. STOCK ITEMS
    // ──────────────────────────────────────────────
    const stockSpec = [
      { name: "Correia Transportadora EP200 (metro)", sku: "STK-001", unit: "m", min_level: 20, current_level: 45, unit_price: 85, brand: "Continental", description: "Correia para transporte de material moido" },
      { name: "Rolamento 6312-2RS", sku: "STK-002", unit: "un", min_level: 10, current_level: 25, unit_price: 120, brand: "SKF", description: "Rolamento de esferas blindado" },
      { name: "Oleo Lubrificante ISO 220 (litro)", sku: "STK-003", unit: "L", min_level: 50, current_level: 180, unit_price: 28, brand: "Shell Omala", description: "Oleo para caixas de engrenagens" },
      { name: "Facas para Moinho (jogo 12un)", sku: "STK-004", unit: "jg", min_level: 3, current_level: 8, unit_price: 2800, brand: "Rone", description: "Jogo de facas rotativas para moinho MF-800" },
      { name: "Resistencia Ceramica para Extrusora (un)", sku: "STK-005", unit: "un", min_level: 5, current_level: 12, unit_price: 450, brand: "Watlow", description: "Resistencia 5kW zona de aquecimento" },
      { name: "Filtro Tela Inox Mesh 80 (un)", sku: "STK-006", unit: "un", min_level: 20, current_level: 65, unit_price: 35, brand: "GKD", description: "Tela filtrante para troca-tela da extrusora" },
      { name: "Parafuso Extrusora Bimetallico L/D 30", sku: "STK-007", unit: "un", min_level: 1, current_level: 2, unit_price: 18500, brand: "Rulli", description: "Parafuso bimetalico reserva" },
      { name: "Sensor de Temperatura PT100", sku: "STK-008", unit: "un", min_level: 8, current_level: 15, unit_price: 95, brand: "Wika", description: "Sensor para zonas de aquecimento" },
      { name: "Contator Tripolar 150A", sku: "STK-009", unit: "un", min_level: 4, current_level: 6, unit_price: 380, brand: "Siemens", description: "Contator para partida de motores" },
      { name: "Inversor de Frequencia 75kW", sku: "STK-010", unit: "un", min_level: 1, current_level: 2, unit_price: 12500, brand: "WEG CFW11", description: "Inversor reserva para extrusoras" },
      { name: "Graxa Especial Alta Temp (kg)", sku: "STK-011", unit: "kg", min_level: 10, current_level: 35, unit_price: 65, brand: "Mobilux EP 023", description: "Graxa para rolamentos de alta temperatura" },
      { name: "Mangueira Hidraulica 1/2pol (metro)", sku: "STK-012", unit: "m", min_level: 15, current_level: 40, unit_price: 48, brand: "Parker", description: "Mangueira alta pressao para circuitos hidraulicos" },
      { name: "Valvula Solenoide 1pol", sku: "STK-013", unit: "un", min_level: 3, current_level: 5, unit_price: 520, brand: "Asco", description: "Valvula para controle de agua de refrigeracao" },
      { name: "Pigmento Master PE Verde (saco 25kg)", sku: "STK-014", unit: "sc", min_level: 5, current_level: 18, unit_price: 340, brand: "Cromex", description: "Masterbatch verde para coloracao de granulado" },
      { name: "Aditivo UV Estabilizante (saco 25kg)", sku: "STK-015", unit: "sc", min_level: 3, current_level: 10, unit_price: 890, brand: "Basf Tinuvin", description: "Estabilizante UV para PE reciclado outdoor" },
    ];

    const stockIds: Record<string, string> = {};
    for (const s of stockSpec) {
      const { data: ex } = await sb.from("stock_items").select("id").eq("tenant_id", T).eq("sku", s.sku).maybeSingle();
      if (ex) { stockIds[s.sku] = ex.id; continue; }
      const { data, error } = await sb.from("stock_items").insert({
        tenant_id: T, name: s.name, sku: s.sku, unit: s.unit,
        min_level: s.min_level, current_level: s.current_level,
        unit_price: s.unit_price, brand: s.brand, description: s.description, status: "ativo",
      }).select("id").single();
      if (error) throw error;
      stockIds[s.sku] = data.id;
    }

    // Stock movements (initial entries)
    for (const s of stockSpec) {
      const sid = stockIds[s.sku];
      const { data: ex } = await sb.from("stock_movements").select("id").eq("stock_item_id", sid).limit(1).maybeSingle();
      if (ex) continue;
      await sb.from("stock_movements").insert({
        tenant_id: T, stock_item_id: sid, type: "in",
        qty: s.current_level, reference: "Estoque inicial - inventario",
        created_by: adminId,
      });
    }

    // ──────────────────────────────────────────────
    // 8. WORK ORDERS
    // ──────────────────────────────────────────────
    const now = Date.now();
    const H = 3600000; const D = 86400000;
    const woSpec = [
      { title: "Troca de facas do moinho MF-800", desc: "Facas com desgaste acentuado apos 1200h de operacao, vibracoes anormais detectadas. Substituir jogo completo.", priority: "alta", status: "em_execucao", cat: "Moagem", unit: "Galpao de Reciclagem", asset: "Moinho de Facas MF-800", assigned: tecId },
      { title: "Vazamento no circuito hidraulico da prensa", desc: "Identificado vazamento de oleo na conexao da mangueira principal. Risco de contaminacao do material reciclado.", priority: "critica", status: "em_execucao", cat: "Hidraulica", unit: "Galpao de Reciclagem", asset: null, assigned: tecId },
      { title: "Manutencao preventiva Chiller 150TR", desc: "Limpeza do condensador, verificacao do nivel de fluido refrigerante e troca dos filtros de ar.", priority: "media", status: "aberta", cat: "Refrigeracao", unit: "Planta Industrial - Matriz", asset: "Chiller Industrial 150TR", assigned: null },
      { title: "Calibracao de sensores PT100 zona 3-5", desc: "Temperaturas com leitura inconsistente nas zonas 3 a 5 da extrusora. Calibrar ou substituir sensores.", priority: "alta", status: "triagem", cat: "Instrumentacao", unit: "Planta Industrial - Matriz", asset: "Extrusora Dupla Rosca ZSK-70", assigned: null },
      { title: "Substituicao de rolamentos do secador centrifugo", desc: "Rolamentos com ruido excessivo. Secador parado para manutencao corretiva. Previsao de 8h de servico.", priority: "critica", status: "aguardando_peca", cat: "Reciclagem", unit: "Galpao de Reciclagem", asset: "Secador Centrifugo SC-600", assigned: tec2Id },
      { title: "Inspecao eletrica Subestacao 13.8kV", desc: "Inspecao termografica anual obrigatoria. Verificar conexoes, disjuntores e cabos de media tensao.", priority: "alta", status: "aberta", cat: "Eletrica Industrial", unit: "Planta Industrial - Matriz", asset: "Transformador 500kVA", assigned: coordId },
      { title: "Reparo esteira transportadora linha 01", desc: "Correia com corte lateral de 30cm. Necessario emenda a quente no local.", priority: "media", status: "concluida", cat: "Extrusao", unit: "Planta Industrial - Matriz", asset: "Extrusora Dupla Rosca ZSK-70", assigned: tecId },
      { title: "Troca do trocador de tela automatico", desc: "Trocador de tela com falha no atuador pneumatico. Peca reserva em estoque.", priority: "alta", status: "concluida", cat: "Extrusao", unit: "Planta Industrial - Matriz", asset: "Extrusora Mono Rosca L/D 30:1", assigned: tec2Id },
      { title: "Instalacao de novo detector de metais", desc: "Instalar segundo detector de metais na saida do moinho para duplicar seguranca.", priority: "media", status: "triagem", cat: "Reciclagem", unit: "Galpao de Reciclagem", asset: "Detector de Metais Sesotec", assigned: null },
      { title: "Revisao empilhadeira eletrica Still RX20", desc: "Revisao de 500h: troca de oleo do redutor, verificacao de garfos, teste de bateria.", priority: "baixa", status: "aberta", cat: "Seguranca do Trabalho", unit: "Centro de Distribuicao", asset: "Empilhadeira Eletrica Still RX20", assigned: null },
      { title: "Vazamento de agua no tanque de lavagem", desc: "Junta de vedacao do dreno principal com folga. Material com excesso de umidade na saida.", priority: "alta", status: "em_execucao", cat: "Lavagem", unit: "Galpao de Reciclagem", asset: "Tanque de Lavagem TL-5000", assigned: tecId },
      { title: "Atualizacao do CLP da granuladora", desc: "Upgrade de firmware do CLP Siemens S7-1200 para nova versao com controle de velocidade otimizado.", priority: "media", status: "aguardando_terceiro", cat: "Granulacao", unit: "Planta Industrial - Matriz", asset: "Granulador Subaquatico GSA-200", assigned: null },
    ];

    for (const wo of woSpec) {
      const { data: ex } = await sb.from("work_orders").select("id").eq("tenant_id", T).eq("title", wo.title).maybeSingle();
      if (ex) continue;

      const insert: any = {
        tenant_id: T, title: wo.title, description: wo.desc,
        priority: wo.priority, status: wo.status,
        category_id: catIds[wo.cat], unit_id: unitIds[wo.unit],
        code: `DEMO-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        response_due_at: new Date(now + 4 * H).toISOString(),
        resolve_due_at: new Date(now + 24 * H).toISOString(),
        assigned_to_id: wo.assigned || null,
        asset_id: wo.asset ? assetIds[wo.asset] || null : null,
      };

      if (wo.status === "em_execucao") insert.started_at = new Date(now - 3 * H).toISOString();
      if (wo.status === "concluida") {
        insert.started_at = new Date(now - 2 * D).toISOString();
        insert.resolved_at = new Date(now - 4 * H).toISOString();
      }
      if (wo.status === "aguardando_peca" || wo.status === "aguardando_terceiro") {
        insert.started_at = new Date(now - 5 * H).toISOString();
        insert.paused_at = new Date(now - 2 * H).toISOString();
      }

      const { data: woRes, error } = await sb.from("work_orders").insert(insert).select("id, code").single();
      if (error) throw error;

      await sb.from("work_order_events").insert({
        tenant_id: T, work_order_id: woRes.id, type: "created",
        actor_user_id: adminId, payload: { text: `OS ${woRes.code} criada` },
      });
      if (wo.status !== "aberta" && wo.status !== "triagem") {
        await sb.from("work_order_events").insert({
          tenant_id: T, work_order_id: woRes.id, type: "status_changed",
          actor_user_id: adminId, payload: { from: "aberta", to: wo.status },
        });
      }
    }

    // ──────────────────────────────────────────────
    // 9. ASSET MAINTENANCE RECORDS
    // ──────────────────────────────────────────────
    const maintSpec = [
      { asset: "Extrusora Dupla Rosca ZSK-70", title: "Preventiva 2000h - Extrusora ZSK-70", type: "preventiva", status: "concluida", desc: "Lubrificacao geral, troca de filtros, verificacao de parafusos e cilindro.", cost: 4500, scheduled: -30*D, completed: -28*D },
      { asset: "Moinho de Facas MF-800", title: "Troca de facas - Moinho MF-800", type: "corretiva", status: "em_andamento", desc: "Substituicao do jogo de facas por desgaste. Afiacao das facas antigas para reserva.", cost: 3200, scheduled: -2*D, completed: null },
      { asset: "Chiller Industrial 150TR", title: "Preventiva trimestral - Chiller", type: "preventiva", status: "agendada", desc: "Limpeza de condensador, verificacao de pressoes, recarga de gas se necessario.", cost: 2800, scheduled: 7*D, completed: null },
      { asset: "Compressor Parafuso Atlas GA-90", title: "Troca de oleo e elemento separador", type: "preventiva", status: "concluida", desc: "Troca de oleo mineral por sintetico, substituicao do elemento separador de ar/oleo.", cost: 6200, scheduled: -60*D, completed: -58*D },
      { asset: "Secador Centrifugo SC-600", title: "Substituicao de rolamentos - Secador", type: "corretiva", status: "em_andamento", desc: "Rolamentos 6312 com folga excessiva. Parada nao programada.", cost: 1800, scheduled: -1*D, completed: null },
      { asset: "Balanca Rodoviaria 80t", title: "Calibracao anual - Balanca rodoviaria", type: "preditiva", status: "agendada", desc: "Calibracao com padroes rastreados INMETRO. Certificado obrigatorio.", cost: 3500, scheduled: 15*D, completed: null },
    ];

    for (const m of maintSpec) {
      const aId = assetIds[m.asset];
      if (!aId) continue;
      const { data: ex } = await sb.from("asset_maintenance_records").select("id").eq("tenant_id", T).eq("title", m.title).maybeSingle();
      if (ex) continue;
      await sb.from("asset_maintenance_records").insert({
        tenant_id: T, asset_id: aId, title: m.title,
        type: m.type, status: m.status, description: m.desc, cost: m.cost,
        scheduled_at: new Date(now + m.scheduled).toISOString(),
        started_at: m.status !== "agendada" ? new Date(now + m.scheduled + D).toISOString() : null,
        completed_at: m.completed ? new Date(now + m.completed).toISOString() : null,
        technician_id: tecId, created_by: coordId,
      });
    }

    // ──────────────────────────────────────────────
    // 10. DISPOSALS
    // ──────────────────────────────────────────────
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
        tenant_id: T, item_name: d.item_name, reason: d.reason,
        status: d.status, quantity: d.quantity, category: d.category,
        origin_type: d.origin_type, residual_value: d.residual_value,
        created_by: coordId,
        approved_by: d.status === "aprovado" || d.status === "efetivado" ? adminId : null,
        approved_at: d.status === "aprovado" || d.status === "efetivado" ? new Date().toISOString() : null,
      });
    }

    // ──────────────────────────────────────────────
    // 11. CUSTOMERS (solicitantes internos)
    // ──────────────────────────────────────────────
    const customersSpec = [
      { name: "Departamento de Producao", email: "producao@demo.com", type: "internal", sector: "Producao", position: "Gerente de Producao" },
      { name: "Departamento de Qualidade", email: "qualidade@demo.com", type: "internal", sector: "Qualidade", position: "Coordenador QA" },
      { name: "Logistica e Expedicao", email: "logistica@demo.com", type: "internal", sector: "Logistica", position: "Supervisor" },
      { name: "Plasticos Nordeste Ltda", email: "contato@plasticosnordeste.com", type: "external", sector: "Comercial", position: "Comprador" },
      { name: "EcoPlast Reciclagem SA", email: "compras@ecoplast.com", type: "external", sector: "Fornecimento", position: "Gerente de Compras" },
    ];
    for (const c of customersSpec) {
      const { data: ex } = await sb.from("customers").select("id").eq("tenant_id", T).eq("email", c.email).maybeSingle();
      if (ex) continue;
      await sb.from("customers").insert({ tenant_id: T, ...c });
    }

    // ──────────────────────────────────────────────
    // 12. SLA POLICIES
    // ──────────────────────────────────────────────
    const { data: exSla } = await sb.from("sla_policies").select("id").eq("tenant_id", T).limit(1).maybeSingle();
    if (!exSla) {
      await sb.from("sla_policies").insert({
        tenant_id: T, name: "SLA Padrao Industrial",
        pause_statuses: ["aguardando_peca", "aguardando_solicitante", "aguardando_terceiro"],
        rules: [
          { priority: "critica", response_minutes: 30, resolve_minutes: 240 },
          { priority: "alta", response_minutes: 60, resolve_minutes: 480 },
          { priority: "media", response_minutes: 240, resolve_minutes: 1440 },
          { priority: "baixa", response_minutes: 480, resolve_minutes: 2880 },
        ],
      });
    }

    // ──────────────────────────────────────────────
    // DONE
    // ──────────────────────────────────────────────
    return new Response(JSON.stringify({
      success: true,
      tenant: "Demo - Polietileno Reciclavel",
      credentials: [
        { email: "demo@ordfy", password: "Demo1234!", role: "Super Admin" },
        { email: "coord.demo@ordfy", password: "Coord1234!", role: "Coordenador" },
        { email: "tecnico.demo@ordfy", password: "Tecnico1234!", role: "Tecnico" },
        { email: "tecnico2.demo@ordfy", password: "Tecnico1234!", role: "Tecnico" },
        { email: "analista.demo@ordfy", password: "Analista1234!", role: "Analista" },
        { email: "solicitante.demo@ordfy", password: "Solic1234!", role: "Solicitante" },
      ],
      data_seeded: {
        categories: categoryNames.length,
        units: unitsSpec.length,
        locations: locationsSpec.length,
        collaborators: collabsSpec.length,
        assets: assetsSpec.length,
        stock_items: stockSpec.length,
        work_orders: woSpec.length,
        maintenance_records: maintSpec.length,
        disposals: disposalSpec.length,
        customers: customersSpec.length,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
