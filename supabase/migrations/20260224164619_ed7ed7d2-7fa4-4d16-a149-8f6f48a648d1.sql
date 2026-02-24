
-- Fix: Remove deleted_at filter from RLS (handle in app code)
-- PostgreSQL applies SELECT USING to UPDATE's new row, blocking soft-delete

DROP POLICY IF EXISTS "Tenant members can view work_orders" ON public.work_orders;

CREATE POLICY "Tenant members can view work_orders"
ON public.work_orders
FOR SELECT
TO authenticated
USING (is_tenant_member(auth.uid(), tenant_id));
