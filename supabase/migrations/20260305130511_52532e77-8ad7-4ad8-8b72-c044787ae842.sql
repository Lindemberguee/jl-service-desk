
-- Fix helper function to use anon key for Authorization
CREATE OR REPLACE FUNCTION public.send_smtp_email_async(
  _tenant_id UUID,
  _type TEXT,
  _to_email TEXT,
  _extra JSONB DEFAULT '{}'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _smtp RECORD;
  _body JSONB;
  _anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYWFkaXlkc2ppYWNva2h3Z2pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTI2MDgsImV4cCI6MjA4NzQ2ODYwOH0.Hl3o-NfK1d96cUs09rfLkl6gj5VT0y_7yYEGNCW1_e4';
BEGIN
  SELECT * INTO _smtp FROM public.tenant_smtp_settings
  WHERE tenant_id = _tenant_id AND is_active = true;
  
  IF _smtp IS NULL THEN RETURN; END IF;
  
  IF _type = 'os_created' AND NOT COALESCE(_smtp.notify_os_created, false) THEN RETURN; END IF;
  IF _type = 'os_status_changed' AND NOT COALESCE(_smtp.notify_os_status_changed, false) THEN RETURN; END IF;
  IF _type = 'stock_critical' AND NOT COALESCE(_smtp.notify_stock_critical, false) THEN RETURN; END IF;
  
  _body := jsonb_build_object(
    'type', _type,
    'tenant_id', _tenant_id,
    'to_email', _to_email
  ) || _extra;
  
  PERFORM net.http_post(
    url := 'https://omaadiydsjiacokhwgjf.supabase.co/functions/v1/send-email-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', _anon_key,
      'Authorization', 'Bearer ' || _anon_key,
      'x-internal-trigger', 'true'
    ),
    body := _body
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'send_smtp_email_async failed: %', SQLERRM;
END;
$$;
