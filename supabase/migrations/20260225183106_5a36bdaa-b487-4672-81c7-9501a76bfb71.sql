
-- Update stock_items ALL policy to include analista
DROP POLICY IF EXISTS "Admins can manage stock_items" ON public.stock_items;
CREATE POLICY "Admins can manage stock_items" ON public.stock_items
FOR ALL USING (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'analista'::app_role])
) WITH CHECK (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'analista'::app_role])
);

-- Update stock_movements INSERT policy to include analista
DROP POLICY IF EXISTS "Authorized can create stock_movements" ON public.stock_movements;
CREATE POLICY "Authorized can create stock_movements" ON public.stock_movements
FOR INSERT WITH CHECK (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role, 'analista'::app_role])
);

-- Add stock:manage permission for analista in role_permissions
INSERT INTO public.role_permissions (role, permission, granted)
VALUES ('analista', 'stock:manage', true)
ON CONFLICT DO NOTHING;
