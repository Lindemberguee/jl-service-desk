
-- Teams integration settings per tenant
CREATE TABLE public.tenant_teams_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  webhook_url text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  notify_os_created boolean NOT NULL DEFAULT true,
  notify_os_status_changed boolean NOT NULL DEFAULT true,
  notify_stock_critical boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_teams_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage
CREATE POLICY "Admins can manage teams_settings" ON public.tenant_teams_settings
  FOR ALL USING (
    get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin')
  )
  WITH CHECK (
    get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin')
  );

-- Async helper function for triggers
CREATE OR REPLACE FUNCTION public.send_teams_notification_async(
  _tenant_id uuid,
  _type text,
  _extra jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _settings RECORD;
  _body JSONB;
  _anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYWFkaXlkc2ppYWNva2h3Z2pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTI2MDgsImV4cCI6MjA4NzQ2ODYwOH0.Hl3o-NfK1d96cUs09rfLkl6gj5VT0y_7yYEGNCW1_e4';
BEGIN
  SELECT * INTO _settings FROM public.tenant_teams_settings
  WHERE tenant_id = _tenant_id AND is_active = true;
  
  IF _settings IS NULL THEN RETURN; END IF;
  
  IF _type = 'os_created' AND NOT COALESCE(_settings.notify_os_created, false) THEN RETURN; END IF;
  IF _type = 'os_status_changed' AND NOT COALESCE(_settings.notify_os_status_changed, false) THEN RETURN; END IF;
  IF _type = 'stock_critical' AND NOT COALESCE(_settings.notify_stock_critical, false) THEN RETURN; END IF;
  
  _body := jsonb_build_object(
    'type', _type,
    'tenant_id', _tenant_id
  ) || _extra;
  
  PERFORM net.http_post(
    url := 'https://omaadiydsjiacokhwgjf.supabase.co/functions/v1/send-teams-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', _anon_key,
      'Authorization', 'Bearer ' || _anon_key,
      'x-internal-trigger', 'true'
    ),
    body := _body
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'send_teams_notification_async failed: %', SQLERRM;
END;
$$;
