
-- Add a second FK from user_memberships.user_id to profiles.id for PostgREST join support
ALTER TABLE public.user_memberships
  ADD CONSTRAINT user_memberships_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (is_super_admin(auth.uid()));
