
-- Drop the existing super_admin-only manage policy
DROP POLICY IF EXISTS "Super admins can manage role_permissions" ON public.role_permissions;

-- Create new policy that allows both super_admin and admin to manage role_permissions
CREATE POLICY "Admins can manage role_permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_memberships
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin') AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_memberships
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin') AND is_active = true
  )
);
