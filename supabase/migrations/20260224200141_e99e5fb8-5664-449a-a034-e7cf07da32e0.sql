
-- Fix profiles RLS policies: change from RESTRICTIVE to PERMISSIVE
-- Currently all SELECT policies are RESTRICTIVE which means ALL must be satisfied
-- They should be PERMISSIVE so that ANY one being true grants access

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Members can view tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Members can view tenant profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_memberships m1
      JOIN user_memberships m2 ON m1.tenant_id = m2.tenant_id
      WHERE m1.user_id = auth.uid()
        AND m2.user_id = profiles.id
        AND m1.is_active = true
        AND m2.is_active = true
    )
  );

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (is_super_admin(auth.uid()));
