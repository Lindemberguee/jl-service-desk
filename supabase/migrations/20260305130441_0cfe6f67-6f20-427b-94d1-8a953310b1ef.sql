
-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Helper function to send SMTP notifications via edge function
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
BEGIN
  -- Check if SMTP is active and event is enabled
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
      'apikey', current_setting('request.headers', true)::json->>'apikey',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYWFkaXlkc2ppYWNva2h3Z2pmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg5MjYwOCwiZXhwIjoyMDg3NDY4NjA4fQ.placeholder'
    ),
    body := _body
  );
EXCEPTION WHEN OTHERS THEN
  -- Silently fail to not break the main transaction
  RAISE WARNING 'send_smtp_email_async failed: %', SQLERRM;
END;
$$;

-- Update notify_os_assigned to also send email
CREATE OR REPLACE FUNCTION public.notify_os_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tech_email TEXT;
BEGIN
  IF NEW.assigned_to_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id) THEN
    -- In-app notification
    INSERT INTO public.notifications (user_id, tenant_id, type, title, body, icon, link, metadata)
    VALUES (
      NEW.assigned_to_id,
      NEW.tenant_id,
      'work_order',
      'OS atribuída a você',
      'A ordem de serviço ' || NEW.code || ' — ' || LEFT(NEW.title, 80) || ' foi atribuída a você.',
      '📋',
      '/os/' || NEW.id,
      jsonb_build_object('work_order_id', NEW.id, 'code', NEW.code, 'action', 'assigned')
    );
    
    -- Email notification
    SELECT email INTO _tech_email FROM public.profiles WHERE id = NEW.assigned_to_id;
    IF _tech_email IS NOT NULL AND _tech_email != '' THEN
      PERFORM send_smtp_email_async(
        NEW.tenant_id,
        'os_created',
        _tech_email,
        jsonb_build_object(
          'work_order_code', COALESCE(NEW.code, ''),
          'work_order_title', COALESCE(NEW.title, '')
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Update notify_os_status_changed to also send email
CREATE OR REPLACE FUNCTION public.notify_os_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  status_label TEXT;
  _tech_email TEXT;
  _requester_email TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    status_label := CASE NEW.status
      WHEN 'aberta' THEN 'Aberta'
      WHEN 'triagem' THEN 'Em Triagem'
      WHEN 'em_execucao' THEN 'Em Execução'
      WHEN 'aguardando_peca' THEN 'Aguardando Peça'
      WHEN 'aguardando_solicitante' THEN 'Aguardando Solicitante'
      WHEN 'aguardando_terceiro' THEN 'Aguardando Terceiro'
      WHEN 'concluida' THEN 'Concluída'
      WHEN 'aprovada' THEN 'Aprovada'
      WHEN 'encerrada' THEN 'Encerrada'
      WHEN 'reaberta' THEN 'Reaberta'
      ELSE NEW.status::text
    END;

    -- In-app notification to technician
    IF NEW.assigned_to_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, tenant_id, type, title, body, icon, link, metadata)
      VALUES (
        NEW.assigned_to_id, NEW.tenant_id, 'work_order',
        'Status da OS alterado',
        'A OS ' || NEW.code || ' mudou para "' || status_label || '".',
        '📋', '/os/' || NEW.id,
        jsonb_build_object('work_order_id', NEW.id, 'code', NEW.code, 'action', 'status_changed', 'new_status', NEW.status::text)
      );
    END IF;

    -- In-app notification to requester
    IF NEW.requester_user_id IS NOT NULL AND NEW.requester_user_id IS DISTINCT FROM NEW.assigned_to_id THEN
      INSERT INTO public.notifications (user_id, tenant_id, type, title, body, icon, link, metadata)
      VALUES (
        NEW.requester_user_id, NEW.tenant_id, 'work_order',
        'Atualização da sua solicitação',
        'Sua OS ' || NEW.code || ' agora está "' || status_label || '".',
        '📋', '/portal/os/' || NEW.id,
        jsonb_build_object('work_order_id', NEW.id, 'code', NEW.code, 'action', 'status_changed', 'new_status', NEW.status::text)
      );
    END IF;

    -- Email to technician
    IF NEW.assigned_to_id IS NOT NULL THEN
      SELECT email INTO _tech_email FROM public.profiles WHERE id = NEW.assigned_to_id;
      IF _tech_email IS NOT NULL AND _tech_email != '' THEN
        PERFORM send_smtp_email_async(
          NEW.tenant_id, 'os_status_changed', _tech_email,
          jsonb_build_object('work_order_code', COALESCE(NEW.code, ''), 'work_order_title', COALESCE(NEW.title, ''), 'status_label', status_label)
        );
      END IF;
    END IF;

    -- Email to requester
    IF NEW.requester_user_id IS NOT NULL AND NEW.requester_user_id IS DISTINCT FROM NEW.assigned_to_id THEN
      SELECT email INTO _requester_email FROM public.profiles WHERE id = NEW.requester_user_id;
      IF _requester_email IS NOT NULL AND _requester_email != '' THEN
        PERFORM send_smtp_email_async(
          NEW.tenant_id, 'os_status_changed', _requester_email,
          jsonb_build_object('work_order_code', COALESCE(NEW.code, ''), 'work_order_title', COALESCE(NEW.title, ''), 'status_label', status_label)
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Update notify_stock_min_level to also send email
CREATE OR REPLACE FUNCTION public.notify_stock_min_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
  _admin_email TEXT;
BEGIN
  IF NEW.current_level <= NEW.min_level AND (OLD.current_level > OLD.min_level OR OLD.current_level IS NULL) THEN
    FOR admin_record IN
      SELECT user_id FROM public.user_memberships
      WHERE tenant_id = NEW.tenant_id
        AND is_active = true
        AND role IN ('super_admin', 'admin', 'coordenador', 'analista')
    LOOP
      -- In-app notification
      INSERT INTO public.notifications (user_id, tenant_id, type, title, body, icon, link, metadata)
      VALUES (
        admin_record.user_id, NEW.tenant_id, 'stock',
        'Estoque em nível crítico',
        'O item "' || LEFT(NEW.name, 60) || '" atingiu o nível mínimo (' || NEW.current_level || '/' || NEW.min_level || ').',
        '📦', '/estoque',
        jsonb_build_object('stock_item_id', NEW.id, 'item_name', NEW.name, 'current_level', NEW.current_level, 'min_level', NEW.min_level)
      );
      
      -- Email notification
      SELECT email INTO _admin_email FROM public.profiles WHERE id = admin_record.user_id;
      IF _admin_email IS NOT NULL AND _admin_email != '' THEN
        PERFORM send_smtp_email_async(
          NEW.tenant_id, 'stock_critical', _admin_email,
          jsonb_build_object('item_name', NEW.name, 'current_level', NEW.current_level, 'min_level', NEW.min_level)
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure triggers exist and fire on correct events
DROP TRIGGER IF EXISTS trigger_notify_os_assigned ON work_orders;
CREATE TRIGGER trigger_notify_os_assigned
  AFTER INSERT OR UPDATE OF assigned_to_id ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_os_assigned();

DROP TRIGGER IF EXISTS trigger_notify_os_status_changed ON work_orders;
CREATE TRIGGER trigger_notify_os_status_changed
  AFTER UPDATE OF status ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_os_status_changed();

DROP TRIGGER IF EXISTS trigger_notify_stock_min_level ON stock_items;
CREATE TRIGGER trigger_notify_stock_min_level
  AFTER UPDATE OF current_level ON stock_items
  FOR EACH ROW
  EXECUTE FUNCTION notify_stock_min_level();
