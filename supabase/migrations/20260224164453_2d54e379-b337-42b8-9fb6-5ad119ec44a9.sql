
-- Fix: Convert all work_orders policies from RESTRICTIVE to PERMISSIVE
-- PostgreSQL requires at least one PERMISSIVE policy to grant access

DROP POLICY IF EXISTS "Authorized can update work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Members can create work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Tenant members can view work_orders" ON public.work_orders;

-- SELECT: tenant members can view non-deleted work orders
CREATE POLICY "Tenant members can view work_orders"
ON public.work_orders
FOR SELECT
TO authenticated
USING (is_tenant_member(auth.uid(), tenant_id) AND deleted_at IS NULL);

-- INSERT: tenant members can create work orders
CREATE POLICY "Members can create work_orders"
ON public.work_orders
FOR INSERT
TO authenticated
WITH CHECK (is_tenant_member(auth.uid(), tenant_id));

-- UPDATE: authorized roles or assigned user can update
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
