
-- 1) Add new event toggle columns to tenant_smtp_settings
ALTER TABLE public.tenant_smtp_settings
  ADD COLUMN IF NOT EXISTS notify_new_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_maintenance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_sla_warning boolean NOT NULL DEFAULT false;

-- 2) Add new event toggles + per-event webhook URLs to tenant_teams_settings
ALTER TABLE public.tenant_teams_settings
  ADD COLUMN IF NOT EXISTS notify_new_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_maintenance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_sla_warning boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhook_url_os text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS webhook_url_stock text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS webhook_url_maintenance text DEFAULT NULL;

-- 3) Create notification_preferences table (per-user channel preferences)
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- os_created, os_status_changed, stock_critical, new_user, maintenance, sla_warning
  channel_email boolean NOT NULL DEFAULT true,
  channel_teams boolean NOT NULL DEFAULT true,
  channel_in_app boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id, event_type)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notification preferences"
  ON public.notification_preferences FOR DELETE
  USING (user_id = auth.uid());

-- 4) Trigger: notify when new user is added to tenant
CREATE OR REPLACE FUNCTION public.notify_new_user_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _new_user_name TEXT;
  _new_user_email TEXT;
  _admin RECORD;
  _admin_email TEXT;
BEGIN
  -- Get new user info
  SELECT name, email INTO _new_user_name, _new_user_email
  FROM public.profiles WHERE id = NEW.user_id;

  _new_user_name := COALESCE(_new_user_name, 'Novo usuário');
  _new_user_email := COALESCE(_new_user_email, '');

  -- Notify all admins/super_admins of the tenant
  FOR _admin IN
    SELECT user_id FROM public.user_memberships
    WHERE tenant_id = NEW.tenant_id
      AND is_active = true
      AND role IN ('super_admin', 'admin')
      AND user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, tenant_id, type, title, body, icon, link, metadata)
    VALUES (
      _admin.user_id,
      NEW.tenant_id,
      'system',
      'Novo usuário cadastrado',
      _new_user_name || ' (' || _new_user_email || ') foi adicionado ao departamento.',
      '👤',
      '/admin/usuarios',
      jsonb_build_object('action', 'new_user', 'new_user_id', NEW.user_id, 'new_user_name', _new_user_name)
    );

    -- Email notification
    SELECT email INTO _admin_email FROM public.profiles WHERE id = _admin.user_id;
    IF _admin_email IS NOT NULL AND _admin_email != '' THEN
      PERFORM public.send_smtp_email_async(
        NEW.tenant_id,
        'new_user',
        _admin_email,
        jsonb_build_object('user_name', _new_user_name, 'user_email', _new_user_email, 'role', NEW.role::text)
      );
    END IF;
  END LOOP;

  -- Teams notification (once)
  PERFORM public.send_teams_notification_async(
    NEW.tenant_id,
    'new_user',
    jsonb_build_object('user_name', _new_user_name, 'user_email', _new_user_email, 'role', NEW.role::text)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_user
  AFTER INSERT ON public.user_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_user_added();

-- 5) Update send_smtp_email_async to handle new event types
CREATE OR REPLACE FUNCTION public.send_smtp_email_async(_tenant_id uuid, _type text, _to_email text, _extra jsonb DEFAULT '{}'::jsonb)
RETURNS void
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
  IF _type = 'new_user' AND NOT COALESCE(_smtp.notify_new_user, false) THEN RETURN; END IF;
  IF _type = 'maintenance' AND NOT COALESCE(_smtp.notify_maintenance, false) THEN RETURN; END IF;
  IF _type = 'sla_warning' AND NOT COALESCE(_smtp.notify_sla_warning, false) THEN RETURN; END IF;
  
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

-- 6) Update send_teams_notification_async to handle new event types + per-event webhooks
CREATE OR REPLACE FUNCTION public.send_teams_notification_async(_tenant_id uuid, _type text, _extra jsonb DEFAULT '{}'::jsonb)
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
  IF _type = 'new_user' AND NOT COALESCE(_settings.notify_new_user, false) THEN RETURN; END IF;
  IF _type = 'maintenance' AND NOT COALESCE(_settings.notify_maintenance, false) THEN RETURN; END IF;
  IF _type = 'sla_warning' AND NOT COALESCE(_settings.notify_sla_warning, false) THEN RETURN; END IF;
  
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
