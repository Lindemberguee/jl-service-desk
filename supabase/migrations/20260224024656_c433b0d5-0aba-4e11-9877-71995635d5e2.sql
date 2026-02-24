
-- Fix overly permissive audit_logs INSERT policy
DROP POLICY IF EXISTS "System can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert audit_logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid());
