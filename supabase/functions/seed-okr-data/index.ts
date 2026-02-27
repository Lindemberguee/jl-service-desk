import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user } } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { tenant_id } = await req.json();
    if (!tenant_id) throw new Error("tenant_id required");

    // 1. Create Cycle
    const { data: cycle, error: cycleErr } = await supabase
      .from("okr_cycles")
      .insert({
        tenant_id,
        name: "Plano de Ação 2026 - Inovação & Tecnologia",
        type: "annual",
        starts_at: "2026-01-01",
        ends_at: "2026-12-31",
        status: "active",
        created_by: user.id,
      })
      .select()
      .single();
    if (cycleErr) throw cycleErr;

    const cid = cycle.id;

    // 2. Create Objectives
    const objectivesData = [
      {
        title: "Aumentar o uso e pertencimento tecnológico e a infraestrutura digital do Verdescola visando a operação de forma eficiente, segura e inovadora.",
        category: "Operacional",
        priority: "alta",
        area: "Inovação e Tech",
        sort_order: 1,
      },
      {
        title: "Participar de editais alinhados com a missão do instituto nas áreas de igualdade, tecnologia e meio ambiente, visando captação de recursos e aumentando o destaque institucional em sustentabilidade e tecnologia.",
        category: "Estratégico",
        priority: "alta",
        area: "Inovação e Tech",
        sort_order: 2,
      },
      {
        title: "Melhorar a gestão de informações, fluxos e processos institucionais através da centralização, padronização e sistematização.",
        category: "Operacional",
        priority: "alta",
        area: "Inovação e Tech",
        sort_order: 3,
      },
      {
        title: "Implantar políticas de proteção de dados, boas práticas de cibersegurança e uso dos ativos e espaços de TI.",
        category: "Qualidade",
        priority: "alta",
        area: "Inovação e Tech",
        sort_order: 4,
      },
    ];

    const { data: objectives, error: objErr } = await supabase
      .from("okr_objectives")
      .insert(objectivesData.map(o => ({ ...o, cycle_id: cid, tenant_id, status: "on_track", progress: 0 })))
      .select()
      .order("sort_order");
    if (objErr) throw objErr;

    const [obj1, obj2, obj3, obj4] = objectives;

    // 3. Create Key Results (Activities)
    const activities = [
      // === OBJECTIVE 1 ===
      // KR: Gestão da infraestrutura de TI
      { objective_id: obj1.id, title: "Correlacionar ativo ao colaborador/setor", unit: "%", target_value: 100, start_value: 0, current_value: 100, responsible_name: "Beto", support_team: "", area: "Inovação e Tech", start_date: "2026-01-16", end_date: "2026-01-23", delivery_date: "2026-01-30", activity_status: "finalizado_com_atraso", description: "KR: Gestão da infraestrutura de TI - % dos ativos com controle patrimonial", sort_order: 1 },
      { objective_id: obj1.id, title: "Atualização do termo de uso", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Beto", support_team: "Jurídico", area: "Inovação e Tech", start_date: "2026-02-02", end_date: "2026-03-20", delivery_date: null, activity_status: "no_prazo", description: "KR: Gestão da infraestrutura de TI", sort_order: 2 },
      { objective_id: obj1.id, title: "Sistema para monitoramento de manutenção", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Beto", support_team: "", area: "Inovação e Tech", start_date: "2026-02-02", end_date: "2026-03-31", delivery_date: null, activity_status: "no_prazo", description: "KR: Gestão da infraestrutura de TI", sort_order: 3 },
      // KR: Implementar ações educativas
      { objective_id: obj1.id, title: "Elaboração de material informativo", unit: "un", target_value: 6, start_value: 0, current_value: 0, responsible_name: "Beto", support_team: "Comunicação", area: "Inovação e Tech", start_date: "2026-01-13", end_date: "2026-03-22", delivery_date: null, activity_status: "no_prazo", description: "KR: Implementar ações educativas de proteção de dados e cibersegurança", sort_order: 4 },
      { objective_id: obj1.id, title: "Realização de formação para os colaboradores", unit: "un", target_value: 6, start_value: 0, current_value: 0, responsible_name: "Michel/Beto/Welton", support_team: "Comunicação", area: "Inovação e Tech", start_date: "2026-02-23", end_date: "2026-03-13", delivery_date: null, activity_status: "no_prazo", description: "KR: Implementar ações educativas de proteção de dados e cibersegurança", sort_order: 5 },
      { objective_id: obj1.id, title: "Ações de reforço (grupo Teams) I", unit: "un", target_value: 6, start_value: 0, current_value: 0, responsible_name: "Michel/Beto/Welton", support_team: "Comunicação", area: "Inovação e Tech", start_date: "2026-08-01", end_date: "2026-08-07", delivery_date: null, activity_status: "a_iniciar", description: "KR: Implementar ações educativas de proteção de dados e cibersegurança", sort_order: 6 },
      { objective_id: obj1.id, title: "Ações de reforço (grupo Teams) II", unit: "un", target_value: 6, start_value: 0, current_value: 0, responsible_name: "Michel/Beto/Welton", support_team: "Comunicação", area: "Inovação e Tech", start_date: "2026-10-26", end_date: "2026-10-30", delivery_date: null, activity_status: "a_iniciar", description: "KR: Implementar ações educativas de proteção de dados e cibersegurança", sort_order: 7 },
      // KR: Suporte técnico
      { objective_id: obj1.id, title: "Monitoramento e atendimento das OS", unit: "%", target_value: 95, start_value: 0, current_value: 0, responsible_name: "Beto", support_team: "", area: "Inovação e Tech", start_date: "2026-01-01", end_date: "2026-12-31", delivery_date: null, activity_status: "no_prazo", description: "KR: Suporte técnico - % de resolução das demandas", sort_order: 8 },
      // KR: Implementar a metodologia de desenvolvimento/implantação
      { objective_id: obj1.id, title: "Desenhar fluxo de validação (metodologia dev)", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Beto", support_team: "", area: "Inovação e Tech", start_date: "2026-03-02", end_date: "2026-03-06", delivery_date: null, activity_status: "a_iniciar", description: "KR: Implementar a metodologia de desenvolvimento/implantação de soluções", sort_order: 9 },
      { objective_id: obj1.id, title: "Elaborar formulário de requisição (metodologia dev)", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Beto", support_team: "", area: "Inovação e Tech", start_date: "2026-03-02", end_date: "2026-03-06", delivery_date: null, activity_status: "a_iniciar", description: "KR: Implementar a metodologia de desenvolvimento/implantação de soluções", sort_order: 10 },
      { objective_id: obj1.id, title: "Aprovar metodologia com a gerência (dev)", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel", support_team: "", area: "Inovação e Tech", start_date: "2026-03-09", end_date: "2026-03-13", delivery_date: null, activity_status: "a_iniciar", description: "KR: Implementar a metodologia de desenvolvimento/implantação de soluções", sort_order: 11 },
      { objective_id: obj1.id, title: "Apresentar a metodologia para os demais setores (dev)", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel", support_team: "", area: "Inovação e Tech", start_date: "2026-03-09", end_date: "2026-03-13", delivery_date: null, activity_status: "a_iniciar", description: "KR: Implementar a metodologia de desenvolvimento/implantação de soluções", sort_order: 12 },
      // KR: Organização e reestruturação de rede
      { objective_id: obj1.id, title: "Desenvolver solução de monitoramento de disponibilidade da rede", unit: "%", target_value: 90, start_value: 0, current_value: 90, responsible_name: "Beto", support_team: "", area: "Inovação e Tech", start_date: "2026-01-19", end_date: "2026-01-31", delivery_date: "2026-01-30", activity_status: "finalizado", description: "KR: Organização e reestruturação de rede de internet", sort_order: 13 },
      { objective_id: obj1.id, title: "Acompanhamento da disponibilidade da rede de internet", unit: "%", target_value: 90, start_value: 0, current_value: 0, responsible_name: "Beto", support_team: "", area: "Inovação e Tech", start_date: "2026-01-01", end_date: "2026-12-31", delivery_date: null, activity_status: "no_prazo", description: "KR: Organização e reestruturação de rede de internet", sort_order: 14 },
      // KR: Orçamento
      { objective_id: obj1.id, title: "Acompanhamento mensal do orçamento executado", unit: "%", target_value: 5, start_value: 0, current_value: 0, responsible_name: "Michel/Beto", support_team: "", area: "Inovação e Tech", start_date: "2026-01-01", end_date: "2026-12-31", delivery_date: null, activity_status: "no_prazo", description: "KR: Garantir que a variação entre o orçamento planejado e executado esteja controlada", sort_order: 15 },

      // === OBJECTIVE 2 ===
      // KR: Banco de projetos sociais
      { objective_id: obj2.id, title: "Escrita do novo FUMCAD", unit: "un", target_value: 8, start_value: 0, current_value: 0, responsible_name: "Michel", support_team: "Pedagógico/Gerência", area: "Inovação e Tech", start_date: "2026-01-12", end_date: "2026-03-12", delivery_date: null, activity_status: "no_prazo", description: "KR: Criar banco de projetos sociais - nº de projetos escritos e aprovados", sort_order: 1 },
      { objective_id: obj2.id, title: "Escrita do projeto de Cultura", unit: "un", target_value: 8, start_value: 0, current_value: 0, responsible_name: "Michel", support_team: "Pedagógico/Gerência", area: "Inovação e Tech", start_date: "2026-02-12", end_date: "2026-03-31", delivery_date: null, activity_status: "no_prazo", description: "KR: Criar banco de projetos sociais", sort_order: 2 },
      { objective_id: obj2.id, title: "Escrita do projeto de Esportes", unit: "un", target_value: 8, start_value: 0, current_value: 0, responsible_name: "Michel", support_team: "Pedagógico/Gerência", area: "Inovação e Tech", start_date: "2026-03-15", end_date: "2026-05-01", delivery_date: null, activity_status: "a_iniciar", description: "KR: Criar banco de projetos sociais", sort_order: 3 },
      { objective_id: obj2.id, title: "Escrita do projeto de Reciclagem", unit: "un", target_value: 8, start_value: 0, current_value: 0, responsible_name: "Michel", support_team: "Pedagógico/Gerência", area: "Inovação e Tech", start_date: "2026-04-01", end_date: "2026-05-10", delivery_date: null, activity_status: "a_iniciar", description: "KR: Criar banco de projetos sociais", sort_order: 4 },
      { objective_id: obj2.id, title: "Edital Petrobras Ambiental", unit: "un", target_value: 8, start_value: 0, current_value: 0, responsible_name: "Michel", support_team: "Pedagógico/Gerência", area: "Inovação e Tech", start_date: "2026-04-10", end_date: "2026-05-20", delivery_date: null, activity_status: "a_iniciar", description: "KR: Criar banco de projetos sociais", sort_order: 5 },
      { objective_id: obj2.id, title: "Emenda Parlamentar (sob demanda)", unit: "un", target_value: 8, start_value: 0, current_value: 0, responsible_name: "Michel", support_team: "Pedagógico/Gerência", area: "Inovação e Tech", start_date: null, end_date: null, delivery_date: null, activity_status: "atrasado", description: "KR: Criar banco de projetos sociais", sort_order: 6 },
      { objective_id: obj2.id, title: "Edital privado (sob demanda)", unit: "un", target_value: 8, start_value: 0, current_value: 0, responsible_name: "Michel", support_team: "Pedagógico/Gerência", area: "Inovação e Tech", start_date: null, end_date: null, delivery_date: null, activity_status: "atrasado", description: "KR: Criar banco de projetos sociais", sort_order: 7 },
      // KR: Identificar e mapear editais
      { objective_id: obj2.id, title: "Monitoramento das fontes de editais", unit: "un", target_value: 140, start_value: 0, current_value: 0, responsible_name: "Michel", support_team: "", area: "Inovação e Tech", start_date: "2026-01-13", end_date: "2026-12-31", delivery_date: null, activity_status: "no_prazo", description: "KR: Identificar e mapear editais relevantes - nº de editais mapeados anualmente", sort_order: 8 },
      // KR: Aumentar propostas submetidas
      { objective_id: obj2.id, title: "Submissão de propostas", unit: "un", target_value: 80, start_value: 0, current_value: 0, responsible_name: "Michel", support_team: "", area: "Inovação e Tech", start_date: "2026-01-13", end_date: "2026-12-31", delivery_date: null, activity_status: "no_prazo", description: "KR: Aumentar o número de propostas submetidas", sort_order: 9 },
      // KR: Aumentar propostas aprovadas
      { objective_id: obj2.id, title: "Acompanhamento das propostas submetidas", unit: "un", target_value: 5, start_value: 0, current_value: 0, responsible_name: "Michel", support_team: "", area: "Inovação e Tech", start_date: "2026-01-13", end_date: "2026-12-31", delivery_date: null, activity_status: "no_prazo", description: "KR: Aumentar o número de propostas aprovadas", sort_order: 10 },

      // === OBJECTIVE 3 ===
      // KR: Implementar metodologia de Dashboards
      { objective_id: obj3.id, title: "Desenhar fluxo de validação (Dashboards)", unit: "%", target_value: 100, start_value: 0, current_value: 100, responsible_name: "Michel/Welton", support_team: "", area: "Inovação e Tech", start_date: "2026-03-02", end_date: "2026-03-06", delivery_date: "2026-01-29", activity_status: "finalizado", description: "KR: Implementar a metodologia de criação e gestão de Dashboards", sort_order: 1 },
      { objective_id: obj3.id, title: "Elaborar formulário de requisição (Dashboards)", unit: "%", target_value: 100, start_value: 0, current_value: 100, responsible_name: "Michel/Welton", support_team: "", area: "Inovação e Tech", start_date: "2026-03-02", end_date: "2026-03-06", delivery_date: "2026-02-11", activity_status: "finalizado", description: "KR: Implementar a metodologia de criação e gestão de Dashboards", sort_order: 2 },
      { objective_id: obj3.id, title: "Aprovar metodologia com a gerência (Dashboards)", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel", support_team: "", area: "Inovação e Tech", start_date: "2026-03-09", end_date: "2026-03-13", delivery_date: null, activity_status: "a_iniciar", description: "KR: Implementar a metodologia de criação e gestão de Dashboards", sort_order: 3 },
      { objective_id: obj3.id, title: "Apresentar a metodologia para os demais setores (Dashboards)", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel", support_team: "", area: "Inovação e Tech", start_date: "2026-03-09", end_date: "2026-03-13", delivery_date: null, activity_status: "a_iniciar", description: "KR: Implementar a metodologia de criação e gestão de Dashboards", sort_order: 4 },
      // KR: Padronizar Teams
      { objective_id: obj3.id, title: "Elaborar e aprovar a estrutura dos sites no SharePoint", unit: "%", target_value: 100, start_value: 0, current_value: 100, responsible_name: "Michel/Beto/Welton", support_team: "", area: "Inovação e Tech", start_date: "2026-01-13", end_date: "2026-02-20", delivery_date: "2026-01-14", activity_status: "finalizado", description: "KR: Padronizar o Teams como ferramenta de comunicação interna", sort_order: 5 },
      { objective_id: obj3.id, title: "Montar os sites", unit: "%", target_value: 100, start_value: 0, current_value: 100, responsible_name: "Beto", support_team: "", area: "Inovação e Tech", start_date: "2026-01-13", end_date: "2026-02-20", delivery_date: "2026-02-10", activity_status: "finalizado", description: "KR: Padronizar o Teams como ferramenta de comunicação interna", sort_order: 6 },
      { objective_id: obj3.id, title: "Elaborar página com tutoriais de uso", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "", support_team: "", area: "Inovação e Tech", start_date: "2026-01-13", end_date: "2026-02-20", delivery_date: null, activity_status: "atrasado", description: "KR: Padronizar o Teams como ferramenta de comunicação interna", sort_order: 7 },
      { objective_id: obj3.id, title: "Treinar colaboradores para uso do Teams", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel/Beto/Welton", support_team: "", area: "Inovação e Tech", start_date: "2026-02-23", end_date: "2026-03-06", delivery_date: null, activity_status: "no_prazo", description: "KR: Padronizar o Teams como ferramenta de comunicação interna", sort_order: 8 },
      { objective_id: obj3.id, title: "Aplicar formulário monitoramento da adesão (Teams)", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Welton", support_team: "", area: "Inovação e Tech", start_date: "2026-09-08", end_date: "2026-09-11", delivery_date: null, activity_status: "a_iniciar", description: "KR: Padronizar o Teams como ferramenta de comunicação interna", sort_order: 9 },
      // KR: Padronizar SharePoint
      { objective_id: obj3.id, title: "Elaborar e aprovar a estrutura dos chats do Teams", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel/Welton", support_team: "", area: "Inovação e Tech", start_date: "2026-01-13", end_date: "2026-02-20", delivery_date: null, activity_status: "atrasado", description: "KR: Padronizar o armazenamento no SharePoint", sort_order: 10 },
      { objective_id: obj3.id, title: "Treinar colaboradores para uso do SharePoint", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel/Welton", support_team: "", area: "Inovação e Tech", start_date: "2026-02-23", end_date: "2026-03-06", delivery_date: null, activity_status: "no_prazo", description: "KR: Padronizar o armazenamento no SharePoint", sort_order: 11 },
      { objective_id: obj3.id, title: "Aplicar formulário monitoramento da adesão (SharePoint)", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Welton", support_team: "", area: "Inovação e Tech", start_date: "2026-09-01", end_date: "2026-09-04", delivery_date: null, activity_status: "a_iniciar", description: "KR: Padronizar o armazenamento no SharePoint", sort_order: 12 },
      // KR: Revisar fluxos
      { objective_id: obj3.id, title: "Revisão e atualização dos fluxos", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel/Beto/Welton", support_team: "", area: "Inovação e Tech", start_date: "2026-05-04", end_date: "2026-05-15", delivery_date: null, activity_status: "a_iniciar", description: "KR: Revisar e atualizar os fluxos e processos internos críticos", sort_order: 13 },
      // KR: Reestruturar site institucional
      { objective_id: obj3.id, title: "Planejamento das páginas, conteúdo e definição dos responsáveis", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel/Beto", support_team: "Gerência", area: "Inovação e Tech", start_date: "2026-02-01", end_date: "2026-02-28", delivery_date: null, activity_status: "no_prazo", description: "KR: Reestruturar o site institucional", sort_order: 14 },
      { objective_id: obj3.id, title: "Elaboração dos textos e aquisição das imagens", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel/Beto", support_team: "Gerência/Coordenadores", area: "Inovação e Tech", start_date: "2026-03-02", end_date: "2026-04-30", delivery_date: null, activity_status: "a_iniciar", description: "KR: Reestruturar o site institucional", sort_order: 15 },
      { objective_id: obj3.id, title: "Desenvolvimento UI (Figma)", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Beto", support_team: "Comunicação", area: "Inovação e Tech", start_date: "2026-04-01", end_date: "2026-04-17", delivery_date: null, activity_status: "a_iniciar", description: "KR: Reestruturar o site institucional", sort_order: 16 },
      { objective_id: obj3.id, title: "Desenvolvimento Web", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Beto", support_team: "", area: "Inovação e Tech", start_date: "2026-04-17", end_date: "2026-05-01", delivery_date: null, activity_status: "a_iniciar", description: "KR: Reestruturar o site institucional", sort_order: 17 },
      { objective_id: obj3.id, title: "Monitoramento de atualizações com os responsáveis", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Beto", support_team: "", area: "Inovação e Tech", start_date: "2026-05-01", end_date: "2026-12-31", delivery_date: null, activity_status: "a_iniciar", description: "KR: Reestruturar o site institucional", sort_order: 18 },

      // === OBJECTIVE 4 ===
      // KR: LGPD
      { objective_id: obj4.id, title: "Elaborar escopo da política de LGPD", unit: "%", target_value: 100, start_value: 0, current_value: 100, responsible_name: "Michel", support_team: "", area: "Inovação e Tech", start_date: "2026-02-13", end_date: "2026-03-20", delivery_date: "2026-02-07", activity_status: "finalizado", description: "KR: LGPD - Política de Proteção de Dados e Privacidade", sort_order: 1 },
      { objective_id: obj4.id, title: "Validação jurídica (LGPD)", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel", support_team: "Jurídico", area: "Inovação e Tech", start_date: "2026-03-20", end_date: "2026-04-20", delivery_date: null, activity_status: "a_iniciar", description: "KR: LGPD - Política de Proteção de Dados e Privacidade", sort_order: 2 },
      { objective_id: obj4.id, title: "Apresentação LGPD para os colaboradores", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel/Beto/Welton", support_team: "Comitê de proteção de dados", area: "Inovação e Tech", start_date: "2026-03-23", end_date: "2026-03-27", delivery_date: null, activity_status: "a_iniciar", description: "KR: LGPD - Política de Proteção de Dados e Privacidade", sort_order: 3 },
      // KR: Política de Armazenamento
      { objective_id: obj4.id, title: "Revisar e atualizar escopo da política de armazenamento", unit: "%", target_value: 100, start_value: 0, current_value: 100, responsible_name: "Michel/Beto", support_team: "", area: "Inovação e Tech", start_date: "2026-01-13", end_date: "2026-01-21", delivery_date: "2026-02-07", activity_status: "finalizado_com_atraso", description: "KR: Política de Armazenamento, Ciclo de Vida e Retenção de Dados", sort_order: 4 },
      { objective_id: obj4.id, title: "Validação jurídica (Armazenamento)", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel", support_team: "Jurídico", area: "Inovação e Tech", start_date: "2026-01-19", end_date: "2026-02-19", delivery_date: null, activity_status: "atrasado", description: "KR: Política de Armazenamento, Ciclo de Vida e Retenção de Dados", sort_order: 5 },
      { objective_id: obj4.id, title: "Apresentação Armazenamento para os colaboradores", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel/Beto/Welton", support_team: "Comitê de proteção de dados", area: "Inovação e Tech", start_date: "2026-02-23", end_date: "2026-03-06", delivery_date: null, activity_status: "no_prazo", description: "KR: Política de Armazenamento, Ciclo de Vida e Retenção de Dados", sort_order: 6 },
      // KR: Política de Comunicação
      { objective_id: obj4.id, title: "Revisar e atualizar escopo da política de Comunicação", unit: "%", target_value: 100, start_value: 0, current_value: 100, responsible_name: "Michel/Beto", support_team: "", area: "Inovação e Tech", start_date: "2026-01-13", end_date: "2026-01-21", delivery_date: "2026-02-07", activity_status: "finalizado_com_atraso", description: "KR: Política de Diretrizes de Comunicação e Uso de Ferramentas", sort_order: 7 },
      { objective_id: obj4.id, title: "Validação jurídica (Comunicação)", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel", support_team: "Jurídico", area: "Inovação e Tech", start_date: "2026-01-19", end_date: "2026-02-19", delivery_date: null, activity_status: "atrasado", description: "KR: Política de Diretrizes de Comunicação e Uso de Ferramentas", sort_order: 8 },
      { objective_id: obj4.id, title: "Apresentação Comunicação para os colaboradores", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel/Beto/Welton", support_team: "Comitê de proteção de dados", area: "Inovação e Tech", start_date: "2026-02-23", end_date: "2026-03-06", delivery_date: null, activity_status: "no_prazo", description: "KR: Política de Diretrizes de Comunicação e Uso de Ferramentas", sort_order: 9 },
      // KR: Infraestrutura TI Política
      { objective_id: obj4.id, title: "Revisar e atualizar escopo da política de Gestão de Infraestrutura", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel/Beto", support_team: "", area: "Inovação e Tech", start_date: "2026-04-01", end_date: "2026-04-10", delivery_date: null, activity_status: "a_iniciar", description: "KR: Infraestrutura de TI - Política de Gestão e Segurança", sort_order: 10 },
      { objective_id: obj4.id, title: "Validação jurídica (Infraestrutura)", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel", support_team: "Jurídico", area: "Inovação e Tech", start_date: "2026-04-10", end_date: "2026-05-10", delivery_date: null, activity_status: "a_iniciar", description: "KR: Infraestrutura de TI - Política de Gestão e Segurança", sort_order: 11 },
      { objective_id: obj4.id, title: "Apresentação Infraestrutura para os colaboradores", unit: "%", target_value: 100, start_value: 0, current_value: 0, responsible_name: "Michel/Beto/Welton", support_team: "Comitê de proteção de dados", area: "Inovação e Tech", start_date: "2026-05-11", end_date: "2026-05-15", delivery_date: null, activity_status: "a_iniciar", description: "KR: Infraestrutura de TI - Política de Gestão e Segurança", sort_order: 12 },
    ];

    const { error: krErr } = await supabase
      .from("okr_key_results")
      .insert(activities.map(a => ({ ...a, tenant_id, confidence_level: 70 })));
    if (krErr) throw krErr;

    // 4. Recalculate objective progress for finalized activities
    for (const obj of objectives) {
      const objActivities = activities.filter(a => a.objective_id === obj.id);
      const totalProgress = objActivities.reduce((sum, a) => {
        const range = a.target_value - a.start_value;
        if (range === 0) return sum;
        const pct = Math.min(((a.current_value - a.start_value) / range) * 100, 100);
        return sum + Math.max(pct, 0);
      }, 0);
      const avgProgress = objActivities.length > 0 ? Math.round(totalProgress / objActivities.length) : 0;

      await supabase
        .from("okr_objectives")
        .update({ progress: avgProgress })
        .eq("id", obj.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        cycle_id: cid,
        objectives_count: objectives.length,
        activities_count: activities.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
