-- Refactor notification flow to prevent duplicate emails and in-app notifications
-- 1) Harden trigger functions with idempotency checks
-- 2) Remove legacy duplicate triggers
-- 3) Recreate canonical triggers with strict conditions
-- 4) Clean historic duplicated notifications

CREATE OR REPLACE FUNCTION public.notify_os_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tech_email TEXT;
  _inserted_rows INTEGER := 0;
BEGIN
  IF NEW.assigned_to_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP <> 'INSERT' AND OLD.assigned_to_id IS NOT DISTINCT FROM NEW.assigned_to_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, tenant_id, type, title, body, icon, link, metadata)
  SELECT
    NEW.assigned_to_id,
    NEW.tenant_id,
    'work_order',
    'OS atribuída a você',
    'A ordem de serviço ' || NEW.code || ' — ' || LEFT(NEW.title, 80) || ' foi atribuída a você.',
    '📋',
    '/os/' || NEW.id,
    jsonb_build_object('work_order_id', NEW.id, 'code', NEW.code, 'action', 'assigned')
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = NEW.assigned_to_id
      AND n.tenant_id = NEW.tenant_id
      AND n.type = 'work_order'
      AND n.metadata @> jsonb_build_object('action', 'assigned', 'work_order_id', NEW.id)
      AND n.created_at > now() - interval '15 seconds'
  );

  GET DIAGNOSTICS _inserted_rows = ROW_COUNT;

  IF _inserted_rows > 0 THEN
    SELECT email INTO _tech_email FROM public.profiles WHERE id = NEW.assigned_to_id;

    IF _tech_email IS NOT NULL AND _tech_email <> '' THEN
      PERFORM public.send_smtp_email_async(
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
  _tech_inserted INTEGER := 0;
  _requester_inserted INTEGER := 0;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

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

  IF NEW.assigned_to_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, tenant_id, type, title, body, icon, link, metadata)
    SELECT
      NEW.assigned_to_id,
      NEW.tenant_id,
      'work_order',
      'Status da OS alterado',
      'A OS ' || NEW.code || ' mudou para "' || status_label || '".',
      '📋',
      '/os/' || NEW.id,
      jsonb_build_object(
        'work_order_id', NEW.id,
        'code', NEW.code,
        'action', 'status_changed',
        'new_status', NEW.status::text
      )
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = NEW.assigned_to_id
        AND n.tenant_id = NEW.tenant_id
        AND n.type = 'work_order'
        AND n.metadata @> jsonb_build_object(
          'action', 'status_changed',
          'work_order_id', NEW.id,
          'new_status', NEW.status::text
        )
        AND n.created_at > now() - interval '15 seconds'
    );

    GET DIAGNOSTICS _tech_inserted = ROW_COUNT;

    IF _tech_inserted > 0 THEN
      SELECT email INTO _tech_email FROM public.profiles WHERE id = NEW.assigned_to_id;
      IF _tech_email IS NOT NULL AND _tech_email <> '' THEN
        PERFORM public.send_smtp_email_async(
          NEW.tenant_id,
          'os_status_changed',
          _tech_email,
          jsonb_build_object(
            'work_order_code', COALESCE(NEW.code, ''),
            'work_order_title', COALESCE(NEW.title, ''),
            'status_label', status_label
          )
        );
      END IF;
    END IF;
  END IF;

  IF NEW.requester_user_id IS NOT NULL AND NEW.requester_user_id IS DISTINCT FROM NEW.assigned_to_id THEN
    INSERT INTO public.notifications (user_id, tenant_id, type, title, body, icon, link, metadata)
    SELECT
      NEW.requester_user_id,
      NEW.tenant_id,
      'work_order',
      'Atualização da sua solicitação',
      'Sua OS ' || NEW.code || ' agora está "' || status_label || '".',
      '📋',
      '/portal/os/' || NEW.id,
      jsonb_build_object(
        'work_order_id', NEW.id,
        'code', NEW.code,
        'action', 'status_changed',
        'new_status', NEW.status::text
      )
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = NEW.requester_user_id
        AND n.tenant_id = NEW.tenant_id
        AND n.type = 'work_order'
        AND n.metadata @> jsonb_build_object(
          'action', 'status_changed',
          'work_order_id', NEW.id,
          'new_status', NEW.status::text
        )
        AND n.created_at > now() - interval '15 seconds'
    );

    GET DIAGNOSTICS _requester_inserted = ROW_COUNT;

    IF _requester_inserted > 0 THEN
      SELECT email INTO _requester_email FROM public.profiles WHERE id = NEW.requester_user_id;
      IF _requester_email IS NOT NULL AND _requester_email <> '' THEN
        PERFORM public.send_smtp_email_async(
          NEW.tenant_id,
          'os_status_changed',
          _requester_email,
          jsonb_build_object(
            'work_order_code', COALESCE(NEW.code, ''),
            'work_order_title', COALESCE(NEW.title, ''),
            'status_label', status_label
          )
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_stock_min_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
  _admin_email TEXT;
  _inserted_rows INTEGER := 0;
BEGIN
  IF NEW.current_level <= NEW.min_level AND (OLD.current_level > OLD.min_level OR OLD.current_level IS NULL) THEN
    FOR admin_record IN
      SELECT user_id
      FROM public.user_memberships
      WHERE tenant_id = NEW.tenant_id
        AND is_active = true
        AND role IN ('super_admin', 'admin', 'coordenador', 'analista')
    LOOP
      INSERT INTO public.notifications (user_id, tenant_id, type, title, body, icon, link, metadata)
      SELECT
        admin_record.user_id,
        NEW.tenant_id,
        'stock',
        'Estoque em nível crítico',
        'O item "' || LEFT(NEW.name, 60) || '" atingiu o nível mínimo (' || NEW.current_level || '/' || NEW.min_level || ').',
        '📦',
        '/estoque',
        jsonb_build_object(
          'action', 'stock_critical',
          'stock_item_id', NEW.id,
          'item_name', NEW.name,
          'current_level', NEW.current_level,
          'min_level', NEW.min_level
        )
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id = admin_record.user_id
          AND n.tenant_id = NEW.tenant_id
          AND n.type = 'stock'
          AND n.metadata @> jsonb_build_object(
            'action', 'stock_critical',
            'stock_item_id', NEW.id,
            'current_level', NEW.current_level
          )
          AND n.created_at > now() - interval '15 seconds'
      );

      GET DIAGNOSTICS _inserted_rows = ROW_COUNT;

      IF _inserted_rows > 0 THEN
        SELECT email INTO _admin_email FROM public.profiles WHERE id = admin_record.user_id;
        IF _admin_email IS NOT NULL AND _admin_email <> '' THEN
          PERFORM public.send_smtp_email_async(
            NEW.tenant_id,
            'stock_critical',
            _admin_email,
            jsonb_build_object(
              'item_name', NEW.name,
              'current_level', NEW.current_level,
              'min_level', NEW.min_level
            )
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Remove duplicate/legacy triggers that call the same functions
DROP TRIGGER IF EXISTS trg_notify_os_assigned ON public.work_orders;
DROP TRIGGER IF EXISTS trigger_notify_os_assigned ON public.work_orders;
DROP TRIGGER IF EXISTS trg_notify_os_status_changed ON public.work_orders;
DROP TRIGGER IF EXISTS trigger_notify_os_status_changed ON public.work_orders;
DROP TRIGGER IF EXISTS trg_notify_stock_min_level ON public.stock_items;
DROP TRIGGER IF EXISTS trigger_notify_stock_min_level ON public.stock_items;

-- Recreate canonical triggers (single source of truth)
CREATE TRIGGER trg_notify_os_assigned
  AFTER INSERT OR UPDATE OF assigned_to_id ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_os_assigned();

CREATE TRIGGER trg_notify_os_status_changed
  AFTER UPDATE OF status ON public.work_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_os_status_changed();

CREATE TRIGGER trg_notify_stock_min_level
  AFTER UPDATE OF current_level ON public.stock_items
  FOR EACH ROW
  WHEN (OLD.current_level IS DISTINCT FROM NEW.current_level)
  EXECUTE FUNCTION public.notify_stock_min_level();

-- Clean historic duplicated notifications caused by duplicated triggers
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        user_id,
        tenant_id,
        type,
        title,
        body,
        COALESCE(link, ''),
        COALESCE(metadata, '{}'::jsonb),
        date_trunc('second', created_at)
      ORDER BY created_at, id
    ) AS rn
  FROM public.notifications
)
DELETE FROM public.notifications n
USING ranked r
WHERE n.id = r.id
  AND r.rn > 1;