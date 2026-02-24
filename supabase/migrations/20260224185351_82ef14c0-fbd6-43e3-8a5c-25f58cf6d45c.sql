-- Allow tenant members to view other memberships in the same tenant
-- This fixes: assignment dropdown, solicitantes list, and profile visibility for coordenadores
CREATE POLICY "Tenant members can view memberships in same tenant"
ON public.user_memberships
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_memberships my_m
    WHERE my_m.user_id = auth.uid()
      AND my_m.tenant_id = user_memberships.tenant_id
      AND my_m.is_active = true
      AND my_m.role IN ('super_admin', 'admin', 'coordenador')
  )
);