import { supabase } from '@/integrations/supabase/client';

export type StockMovementType = 'in' | 'out' | 'adjust';

interface RegisterStockMovementInput {
  tenantId: string;
  stockItemId: string;
  type: StockMovementType;
  qty: number;
  userId?: string | null;
  reference?: string | null;
  workOrderId?: string | null;
  createdAt?: string;
  allowNegative?: boolean;
}

interface RegisterStockMovementResult {
  movementId: string | null;
  previousLevel: number;
  newLevel: number;
}

export async function registerStockMovement({
  tenantId,
  stockItemId,
  type,
  qty,
  userId,
  reference,
  workOrderId,
  createdAt,
  allowNegative = false,
}: RegisterStockMovementInput): Promise<RegisterStockMovementResult> {
  const normalizedQty = Math.abs(Number(qty || 0));

  if (!tenantId) throw new Error('Tenant inválido');
  if (!stockItemId) throw new Error('Item de estoque inválido');
  if (!normalizedQty && type !== 'adjust') throw new Error('Quantidade inválida');

  const { data: stockItem, error: fetchError } = await (supabase.from as any)('stock_items')
    .select('id,current_level')
    .eq('id', stockItemId)
    .single();

  if (fetchError || !stockItem) throw new Error('Item de estoque não encontrado');

  const previousLevel = Number(stockItem.current_level || 0);

  let newLevel = previousLevel;
  if (type === 'in') {
    newLevel = previousLevel + normalizedQty;
  } else if (type === 'out') {
    newLevel = previousLevel - normalizedQty;
    if (!allowNegative && newLevel < 0) throw new Error('INSUFFICIENT_STOCK');
    newLevel = Math.max(0, newLevel);
  } else if (type === 'adjust') {
    newLevel = normalizedQty;
  }

  const { data: movementData, error: movementError } = await (supabase.from as any)('stock_movements')
    .insert({
      tenant_id: tenantId,
      stock_item_id: stockItemId,
      type,
      qty: normalizedQty,
      reference: reference || null,
      work_order_id: workOrderId || null,
      created_by: userId || null,
      created_at: createdAt || new Date().toISOString(),
    })
    .select('id')
    .single();

  if (movementError) throw movementError;

  const { error: updateError } = await (supabase.from as any)('stock_items')
    .update({ current_level: newLevel })
    .eq('id', stockItemId);

  if (updateError) throw updateError;

  return {
    movementId: movementData?.id || null,
    previousLevel,
    newLevel,
  };
}
