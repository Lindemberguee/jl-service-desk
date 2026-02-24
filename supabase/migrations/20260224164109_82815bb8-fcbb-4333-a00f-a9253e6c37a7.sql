
-- Drop the restrictive UPDATE policy and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Authorized can update work_orders" ON public.work_orders;

CREATE POLICY "Authorized can update work_orders"
ON public.work_orders
FOR UPDATE
TO authenticated
USING (
  (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role]))
  OR (assigned_to_id = auth.uid())
)
WITH CHECK (
  (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role]))
  OR (assigned_to_id = auth.uid())
);
