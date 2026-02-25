
-- Drop the overly permissive policy
DROP POLICY "Service role can delete audit_logs" ON public.audit_logs;

-- Replace with super_admin-only delete (service_role bypasses RLS anyway)
CREATE POLICY "Super admins can delete audit_logs"
  ON public.audit_logs FOR DELETE
  USING (is_super_admin(auth.uid()));
