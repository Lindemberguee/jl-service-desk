import type { Node, Edge } from '@xyflow/react';

// Helper to create a node
function n(id: string, x: number, y: number, nodeType: string, label: string, color: string, description?: string): Node {
  return {
    id,
    type: 'canvasNode',
    position: { x, y },
    data: { label, nodeType, color, description: description || '', emoji: '' },
  };
}

// Helper to create an edge
function e(source: string, target: string, label?: string): Edge {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    type: 'customEdge',
    data: { label: label || '' },
  };
}

// ========== 1. CADASTRO DE ATIVOS ==========
export const assetRegistrationNodes: Node[] = [
  n('a1', 0, 0, 'milestone', '📋 Fluxo de Cadastro de Ativos', '#3b82f6', 'Fluxo completo do ciclo de vida de um ativo no sistema'),
  
  // Start
  n('a2', 0, 120, 'trigger', '🚀 Início', '#22c55e', 'Necessidade de registrar um novo equipamento ou patrimônio'),
  
  // Registration
  n('a3', 0, 250, 'process', '1. Identificar Ativo', '#3b82f6', 'Levantar informações: nome, patrimônio, nº série, marca, modelo'),
  n('a4', 0, 400, 'task', '2. Preencher Cadastro', '#8b5cf6', 'Acessar Ativos → Novo Ativo. Preencher: Nome, Código Patrimônio, Nº Série, Valor de Compra (R$)'),
  n('a5', 0, 560, 'process', '3. Vincular Localização', '#06b6d4', 'Selecionar Unidade e Sala/Local onde o ativo será instalado'),
  n('a6', 0, 710, 'task', '4. Atribuir Categoria', '#f59e0b', 'Classificar o ativo em uma categoria existente (ex: Informática, Elétrico, Mecânico)'),
  n('a7', 0, 860, 'task', '5. Vincular Colaborador', '#ec4899', 'Opcionalmente associar o ativo a um colaborador responsável'),
  
  // Components
  n('a8', 300, 560, 'document', '5a. Cadastrar Componentes', '#14b8a6', 'Registrar subcomponentes: peças, módulos, placas — com marca, modelo e nº série individual'),
  n('a9', 300, 710, 'note', 'Dica: Estoque', '#f59e0b', 'Componentes podem ser vinculados ao estoque para controle de baixa automática'),
  
  // Status flow
  n('a10', 0, 1020, 'process', '6. Status Inicial: Ativo ✅', '#22c55e', 'Ativo criado com status "Ativo" — pronto para operação'),
  n('a11', -280, 1180, 'warning', 'Status: Em Manutenção 🔧', '#f59e0b', 'Quando uma OS é vinculada ao ativo, ele pode ser marcado em manutenção'),
  n('a12', 0, 1180, 'warning', 'Status: Inativo ⛔', '#64748b', 'Ativo desativado temporariamente — não disponível para seleção em novas OS'),
  n('a13', 280, 1180, 'warning', 'Status: Descartado 🗑️', '#ef4444', 'Descarte aprovado via módulo de Descarte — ativo permanentemente fora de uso'),
  
  // End
  n('a14', 0, 1340, 'goal', '✅ Ativo Documentado', '#10b981', 'Ativo totalmente cadastrado, rastreável e pronto para vincular a OS, manutenções e descarte'),
];

export const assetRegistrationEdges: Edge[] = [
  e('a2', 'a3', 'Iniciar'),
  e('a3', 'a4', 'Dados coletados'),
  e('a4', 'a5'),
  e('a5', 'a6'),
  e('a6', 'a7'),
  e('a7', 'a10', 'Salvar'),
  e('a5', 'a8', 'Opcionalmente'),
  e('a8', 'a9'),
  e('a10', 'a11'),
  e('a10', 'a12'),
  e('a10', 'a13'),
  e('a11', 'a14'),
  e('a12', 'a14'),
  e('a13', 'a14'),
];

// ========== 2. FLUXO DE MANUTENÇÃO ==========
export const maintenanceNodes: Node[] = [
  n('m1', 0, 0, 'milestone', '🔧 Fluxo de Manutenção', '#f59e0b', 'Fluxo completo de manutenção preventiva, corretiva e preditiva'),
  
  n('m2', -250, 150, 'trigger', 'Manutenção Preventiva', '#22c55e', 'Agendada com antecedência para prevenir falhas'),
  n('m3', 0, 150, 'trigger', 'Manutenção Corretiva', '#ef4444', 'Executada após falha ou defeito detectado'),
  n('m4', 250, 150, 'trigger', 'Manutenção Preditiva', '#3b82f6', 'Baseada em análise de dados e indicadores de desgaste'),
  
  n('m5', 0, 310, 'process', '1. Criar Registro', '#8b5cf6', 'Acessar Manutenção → Nova. Informar: Título, Tipo, Ativo vinculado, Descrição'),
  n('m6', 0, 460, 'task', '2. Atribuir Técnico', '#0ea5e9', 'Selecionar o técnico responsável pela execução'),
  n('m7', 0, 600, 'task', '3. Agendar Data', '#f59e0b', 'Definir data prevista para execução (obrigatória para preventivas)'),
  n('m8', 0, 740, 'process', '4. Iniciar Execução', '#22c55e', 'Técnico inicia o trabalho — status muda para "Em Andamento"'),
  
  // Parts
  n('m9', 320, 740, 'task', '4a. Instalar Peças', '#14b8a6', 'Vincular peças do estoque → baixa automática no inventário + movimentação registrada'),
  n('m10', 320, 880, 'warning', '⚠️ Estoque Baixo?', '#ef4444', 'Se o item atingir o nível mínimo, gera alerta visual no painel de estoque'),
  
  n('m11', 0, 880, 'task', '5. Registrar Custo', '#f97316', 'Informar custo total da manutenção (R$) — inclui mão de obra e peças'),
  n('m12', 0, 1020, 'task', '6. Observações Técnicas', '#64748b', 'Adicionar notas, diagnósticos e recomendações futuras'),
  n('m13', 0, 1160, 'process', '7. Concluir Manutenção', '#22c55e', 'Status → "Concluída". Registro arquivado no histórico do ativo'),
  
  // OS Integration
  n('m14', -320, 880, 'document', 'Integração com OS', '#3b82f6', 'Quando uma OS com ativo é concluída, gera automaticamente um registro de manutenção corretiva'),
  n('m15', -320, 1020, 'note', 'Herança de Dados', '#f59e0b', 'O registro herda: custos, nota técnica e metadados da OS automaticamente'),
  
  n('m16', 0, 1300, 'goal', '✅ Manutenção Documentada', '#10b981', 'Registro completo com rastreabilidade total: técnico, custo, peças e histórico'),
];

export const maintenanceEdges: Edge[] = [
  e('m2', 'm5'),
  e('m3', 'm5'),
  e('m4', 'm5'),
  e('m5', 'm6'),
  e('m6', 'm7'),
  e('m7', 'm8', 'Data atingida'),
  e('m8', 'm9', 'Peças necessárias'),
  e('m9', 'm10'),
  e('m8', 'm11'),
  e('m11', 'm12'),
  e('m12', 'm13', 'Finalizar'),
  e('m14', 'm15'),
  e('m15', 'm13'),
  e('m13', 'm16'),
];

// ========== 3. FLUXO DE ESTOQUE ==========
export const stockNodes: Node[] = [
  n('s1', 0, 0, 'milestone', '📦 Fluxo de Estoque', '#06b6d4', 'Gestão completa de itens de estoque com controle de entrada, saída e status'),
  
  n('s2', 0, 140, 'trigger', '🚀 Início', '#22c55e', 'Necessidade de controlar itens de inventário'),
  n('s3', 0, 280, 'process', '1. Cadastrar Item', '#3b82f6', 'Nome, SKU, Marca, Modelo, Nº Série, Tipo de Componente, Preço Unitário'),
  n('s4', 0, 430, 'task', '2. Definir Níveis', '#8b5cf6', 'Configurar: Nível Atual (current_level) e Nível Mínimo (min_level) para alertas'),
  
  // Movements
  n('s5', -250, 600, 'process', '📥 Entrada', '#22c55e', 'Compra, devolução ou transferência → incrementa current_level'),
  n('s6', 250, 600, 'process', '📤 Saída', '#ef4444', 'Consumo, transferência ou manutenção → decrementa current_level'),
  
  n('s7', -250, 750, 'task', 'Registrar Movimentação', '#14b8a6', 'Tipo: in | Quantidade | Referência (NF, pedido) | Vinculada a OS (opcional)'),
  n('s8', 250, 750, 'task', 'Registrar Movimentação', '#f97316', 'Tipo: out | Quantidade | Referência | Vinculada a OS ou Manutenção'),
  
  // Auto movements
  n('s9', 250, 900, 'document', 'Baixa Automática', '#3b82f6', '• Instalação de peça em Manutenção\n• Aprovação de Descarte\n→ Gera movimentação automática tipo "out"'),
  
  // Alerts
  n('s10', 0, 900, 'warning', '⚠️ Alerta Estoque Baixo', '#ef4444', 'Quando current_level ≤ min_level → Card "Estoque Baixo" fica vermelho no painel'),
  
  // Status
  n('s11', 0, 1060, 'process', 'Status do Item', '#64748b', 'Ativo → Inativo → Descartado. Mudança manual ou automática via Descarte'),
  
  // Financial
  n('s12', -250, 1060, 'note', '💰 Valor Total', '#f59e0b', 'Calculado automaticamente: unit_price × current_level para cada item ativo'),
  
  // Import/Export
  n('s13', 250, 1060, 'document', '📊 Importar/Exportar', '#8b5cf6', 'Suporte a CSV e Excel para importação em massa e exportação de relatórios'),
  
  n('s14', 0, 1220, 'goal', '✅ Estoque Controlado', '#10b981', 'Inventário atualizado com rastreabilidade completa de movimentações'),
];

export const stockEdges: Edge[] = [
  e('s2', 's3'),
  e('s3', 's4'),
  e('s4', 's5'),
  e('s4', 's6'),
  e('s5', 's7', 'Entrada'),
  e('s6', 's8', 'Saída'),
  e('s8', 's9'),
  e('s7', 's10'),
  e('s8', 's10'),
  e('s10', 's11'),
  e('s11', 's12'),
  e('s11', 's13'),
  e('s11', 's14'),
];

// ========== 4. CONTROLE DE MATERIAIS ==========
export const materialControlNodes: Node[] = [
  n('mc1', 0, 0, 'milestone', '📊 Fluxo de Controle de Materiais', '#8b5cf6', 'Livro-razão mensal para acompanhamento consolidado de movimentações de estoque'),
  
  n('mc2', 0, 140, 'trigger', '🚀 Início', '#22c55e', 'Necessidade de consultar e analisar movimentações mensais'),
  n('mc3', 0, 280, 'process', '1. Selecionar Período', '#3b82f6', 'Escolher mês/ano para filtrar a visão do livro-razão'),
  
  // Pivot table
  n('mc4', 0, 430, 'document', '2. Tabela Pivô', '#06b6d4', 'Exibe por item: Saldo Anterior | Entradas | Saídas | Saldo Atual — calculados automaticamente'),
  
  // New movement
  n('mc5', -280, 600, 'process', '3. Nova Movimentação', '#22c55e', 'Atalho rápido para registrar entrada/saída direto do módulo'),
  n('mc6', -280, 750, 'task', 'Selecionar Item (Combobox)', '#8b5cf6', 'Busca por nome ou SKU com pré-visualização do saldo projetado em tempo real'),
  n('mc7', -280, 900, 'task', 'Informar Quantidade', '#f59e0b', 'Quantidade + Tipo (Entrada/Saída) + Referência opcional'),
  n('mc8', -280, 1050, 'process', 'Confirmar', '#22c55e', 'Movimentação salva → tabela pivô atualiza instantaneamente'),
  
  // Export
  n('mc9', 280, 600, 'document', '4. Exportar Relatório', '#f97316', 'Gerar CSV ou Excel do período selecionado com todos os saldos e movimentações'),
  
  // Rules
  n('mc10', 280, 430, 'warning', '⚠️ Somente Consulta', '#ef4444', 'Módulo é um RELATÓRIO — não permite edição ou exclusão de movimentações históricas'),
  n('mc11', 280, 750, 'note', 'Integridade Histórica', '#64748b', 'Garante que nenhuma movimentação passada seja alterada ou removida'),
  
  n('mc12', 0, 1050, 'goal', '✅ Controle Consolidado', '#10b981', 'Visão mensal completa com saldos, tendências e rastreabilidade de cada item'),
];

export const materialControlEdges: Edge[] = [
  e('mc2', 'mc3'),
  e('mc3', 'mc4'),
  e('mc4', 'mc5', 'Nova movimentação'),
  e('mc4', 'mc9', 'Exportar'),
  e('mc4', 'mc10'),
  e('mc5', 'mc6'),
  e('mc6', 'mc7'),
  e('mc7', 'mc8', 'Salvar'),
  e('mc9', 'mc11'),
  e('mc8', 'mc12'),
];

// ========== 5. FLUXO DE DESCARTE ==========
export const disposalNodes: Node[] = [
  n('d1', 0, 0, 'milestone', '🗑️ Fluxo de Descarte', '#ef4444', 'Workflow completo para descarte de itens de estoque ou ativos'),
  
  n('d2', 0, 140, 'trigger', '🚀 Início', '#22c55e', 'Item obsoleto, quebrado, depreciado ou fora de uso'),
  
  // Origin
  n('d3', -200, 290, 'process', 'Origem: Estoque', '#06b6d4', 'Descarte de item de inventário — afeta current_level'),
  n('d4', 200, 290, 'process', 'Origem: Ativo', '#3b82f6', 'Descarte de equipamento patrimonial — altera status para "descartado"'),
  
  // Form
  n('d5', 0, 440, 'task', '1. Preencher Solicitação', '#8b5cf6', 'Nome do item, descrição, quantidade, unidade, motivo do descarte'),
  n('d6', 0, 590, 'task', '2. Selecionar Motivo', '#f59e0b', 'Depreciação | Obsolescência | Defeito | Vencimento | Outro'),
  n('d7', 0, 730, 'task', '3. Valor Residual (R$)', '#f97316', 'Informar valor residual ou de revenda, se aplicável'),
  n('d8', 0, 870, 'task', '4. Anexar Evidências', '#64748b', 'Fotos do item, laudos técnicos, documentos comprobatórios'),
  
  // Approval
  n('d9', 0, 1020, 'process', '5. Enviar para Aprovação', '#3b82f6', 'Status: "Pendente" — aguardando análise do administrador'),
  
  n('d10', -280, 1180, 'warning', '❌ Rejeitado', '#ef4444', 'Admin rejeita com nota explicativa → Solicitante notificado'),
  n('d11', 280, 1180, 'process', '✅ Aprovado', '#22c55e', 'Admin aprova → Efeitos automáticos são disparados'),
  
  // Auto effects
  n('d12', 280, 1340, 'document', 'Efeitos Automáticos', '#14b8a6', '• Estoque: decrementa current_level + gera movimentação "out"\n• Se saldo = 0: status → "descartado"\n• Ativo: status → "descartado" imediatamente'),
  
  // Reopen
  n('d13', -280, 1340, 'trigger', '🔄 Reabrir', '#d946ef', 'Admin pode reabrir mesmo após efetivação'),
  n('d14', -280, 1490, 'document', 'Reversão Automática', '#f59e0b', '• Reincrementa estoque\n• Remove movimentação de saída\n• Restaura status do ativo para "ativo"'),
  
  n('d15', 0, 1490, 'goal', '✅ Descarte Documentado', '#10b981', 'Registro permanente com rastreabilidade: quem solicitou, quem aprovou, evidências e motivo'),
];

export const disposalEdges: Edge[] = [
  e('d2', 'd3'),
  e('d2', 'd4'),
  e('d3', 'd5'),
  e('d4', 'd5'),
  e('d5', 'd6'),
  e('d6', 'd7'),
  e('d7', 'd8'),
  e('d8', 'd9', 'Enviar'),
  e('d9', 'd10', 'Rejeitar'),
  e('d9', 'd11', 'Aprovar'),
  e('d11', 'd12', 'Automático'),
  e('d10', 'd13', 'Reabrir'),
  e('d13', 'd14', 'Automático'),
  e('d12', 'd15'),
  e('d14', 'd15'),
];

// ========== EXPORT ALL TEMPLATES ==========
export interface CanvasTemplate {
  name: string;
  nodes: Node[];
  edges: Edge[];
}

export const INFRA_TEMPLATES: CanvasTemplate[] = [
  { name: '📋 Fluxo — Cadastro de Ativos', nodes: assetRegistrationNodes, edges: assetRegistrationEdges },
  { name: '🔧 Fluxo — Manutenção', nodes: maintenanceNodes, edges: maintenanceEdges },
  { name: '📦 Fluxo — Estoque', nodes: stockNodes, edges: stockEdges },
  { name: '📊 Fluxo — Controle de Materiais', nodes: materialControlNodes, edges: materialControlEdges },
  { name: '🗑️ Fluxo — Descarte', nodes: disposalNodes, edges: disposalEdges },
];
