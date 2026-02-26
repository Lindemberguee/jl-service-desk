/**
 * Maps foreign key constraint names to user-friendly Portuguese messages.
 * Add new entries as new relationships are created.
 */
const FK_MESSAGES: Record<string, string> = {
  work_order_part_items_stock_item_id_fkey:
    'Este item de estoque está vinculado a peças em Ordens de Serviço. Remova as referências antes de excluir.',
  work_order_attachments_work_order_id_fkey:
    'Esta OS possui anexos vinculados. Remova os anexos antes de excluir.',
  work_orders_asset_id_fkey:
    'Este ativo está vinculado a Ordens de Serviço. Remova as referências antes de excluir.',
  work_orders_category_id_fkey:
    'Esta categoria está vinculada a Ordens de Serviço. Remova as referências antes de excluir.',
  work_orders_location_id_fkey:
    'Este local está vinculado a Ordens de Serviço. Remova as referências antes de excluir.',
  work_orders_unit_id_fkey:
    'Esta unidade está vinculada a Ordens de Serviço. Remova as referências antes de excluir.',
  work_orders_requester_id_fkey:
    'Este solicitante está vinculado a Ordens de Serviço. Remova as referências antes de excluir.',
  work_orders_sla_policy_id_fkey:
    'Esta política de SLA está vinculada a Ordens de Serviço. Remova as referências antes de excluir.',
  asset_components_stock_item_id_fkey:
    'Este item de estoque está instalado como componente em um ativo. Remova o componente antes de excluir.',
  asset_components_asset_id_fkey:
    'Este ativo possui componentes vinculados. Remova os componentes antes de excluir.',
  asset_maintenance_records_asset_id_fkey:
    'Este ativo possui registros de manutenção. Remova os registros antes de excluir.',
  asset_maintenance_records_work_order_id_fkey:
    'Esta OS possui registros de manutenção vinculados.',
  stock_movements_stock_item_id_fkey:
    'Este item de estoque possui movimentações registradas. Exclua as movimentações primeiro.',
  stock_movements_work_order_id_fkey:
    'Esta OS possui movimentações de estoque vinculadas.',
  locations_unit_id_fkey:
    'Esta unidade possui locais cadastrados. Remova os locais antes de excluir.',
  assets_location_id_fkey:
    'Este local possui ativos cadastrados. Remova os ativos antes de excluir.',
  assets_unit_id_fkey:
    'Esta unidade possui ativos cadastrados. Remova os ativos antes de excluir.',
  assets_category_id_fkey:
    'Esta categoria possui ativos vinculados. Remova os ativos antes de excluir.',
  categories_parent_id_fkey:
    'Esta categoria possui subcategorias. Remova as subcategorias antes de excluir.',
};

/**
 * Parses a Supabase/Postgres error and returns a friendly message.
 * Detects foreign key violations and translates them.
 */
export function friendlyErrorMessage(error: unknown, fallback = 'Erro ao processar a operação.'): string {
  const msg = typeof error === 'string' ? error : (error as any)?.message || '';

  // Foreign key violation
  if (msg.includes('violates foreign key constraint')) {
    const match = msg.match(/constraint "([^"]+)"/);
    if (match && FK_MESSAGES[match[1]]) {
      return FK_MESSAGES[match[1]];
    }
    return 'Este registro está vinculado a outros módulos e não pode ser excluído. Remova as dependências primeiro.';
  }

  // Unique constraint
  if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
    return 'Já existe um registro com esses dados. Verifique os campos duplicados.';
  }

  // RLS
  if (msg.includes('row-level security')) {
    return 'Você não tem permissão para realizar esta ação.';
  }

  return fallback;
}
