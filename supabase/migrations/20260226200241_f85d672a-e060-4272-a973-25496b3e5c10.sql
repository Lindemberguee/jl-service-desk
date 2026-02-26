
DROP POLICY "Authorized can create stock_movements" ON public.stock_movements;

CREATE POLICY "Authorized can create stock_movements"
ON public.stock_movements
FOR INSERT
WITH CHECK (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY (
    ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role, 'analista'::app_role]
  )
);
