
-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Tenant members can view memberships in same tenant" ON public.user_memberships;

-- Recreate using SECURITY DEFINER function to avoid RLS recursion
CREATE POLICY "Tenant members can view memberships in same tenant"
ON public.user_memberships
FOR SELECT
USING (
  get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador')
);
