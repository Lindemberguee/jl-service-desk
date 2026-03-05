
-- Drop overly permissive policies and replace with service-role-only write policies
DROP POLICY "Service can manage email_queue" ON public.email_queue;
DROP POLICY "Service can manage email_logs" ON public.email_logs;

-- Insert-only for authenticated (edge functions use service role which bypasses RLS)
-- No client-side write needed, service role bypasses RLS by default
