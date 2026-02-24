
-- Fix: Allow super_admins to manage memberships in ANY tenant
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.user_memberships;

CREATE POLICY "Admins can manage memberships"
ON public.user_memberships
FOR ALL
USING (
  is_super_admin(auth.uid())
  OR get_user_tenant_role(auth.uid(), tenant_id) IN ('admin'::app_role)
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR get_user_tenant_role(auth.uid(), tenant_id) IN ('admin'::app_role)
);
