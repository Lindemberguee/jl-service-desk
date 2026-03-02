
-- Tornar a policy de insert mais restritiva (apenas autenticados)
DROP POLICY "System can insert api_logs" ON public.api_request_logs;
CREATE POLICY "Authenticated can insert api_logs"
  ON public.api_request_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
