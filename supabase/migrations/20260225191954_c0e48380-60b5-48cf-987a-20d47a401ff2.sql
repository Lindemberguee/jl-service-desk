
-- Allow service-role delete on audit_logs (for purge function)
CREATE POLICY "Service role can delete audit_logs"
  ON public.audit_logs FOR DELETE
  USING (true);
