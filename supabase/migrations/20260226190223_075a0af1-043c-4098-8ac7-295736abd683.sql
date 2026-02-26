
-- Remove analista from stock_items ALL policy (keep only admin roles)
DROP POLICY IF EXISTS "Admins can manage stock_items" ON public.stock_items;
CREATE POLICY "Admins can manage stock_items"
ON public.stock_items FOR ALL
USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]))
WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]));

-- Remove analista from stock_movements INSERT policy
DROP POLICY IF EXISTS "Authorized can create stock_movements" ON public.stock_movements;
CREATE POLICY "Authorized can create stock_movements"
ON public.stock_movements FOR INSERT
WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role]));
