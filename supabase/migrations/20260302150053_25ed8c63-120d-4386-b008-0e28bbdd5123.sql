
-- Fix RLS for tenant_api_keys to allow super_admins globally
DROP POLICY IF EXISTS "Admins can manage api_keys" ON public.tenant_api_keys;

CREATE POLICY "Super admins and tenant admins can manage api_keys"
ON public.tenant_api_keys
FOR ALL
USING (
  is_super_admin(auth.uid()) 
  OR get_user_tenant_role(auth.uid(), tenant_id) = 'admin'::app_role
)
WITH CHECK (
  is_super_admin(auth.uid()) 
  OR get_user_tenant_role(auth.uid(), tenant_id) = 'admin'::app_role
);

-- Fix RLS for api_request_logs similarly
DROP POLICY IF EXISTS "Admins can view api_logs" ON public.api_request_logs;

CREATE POLICY "Super admins and tenant admins can view api_logs"
ON public.api_request_logs
FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin'::app_role, 'admin'::app_role)
);

-- Allow service role inserts (from edge function) - fix the insert policy
DROP POLICY IF EXISTS "Authenticated can insert api_logs" ON public.api_request_logs;

CREATE POLICY "Allow insert api_logs"
ON public.api_request_logs
FOR INSERT
WITH CHECK (true);
