
-- Trigger function: notify on new comment events
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wo RECORD;
  _actor_name TEXT;
  _target_user_id UUID;
  _comment_text TEXT;
  _wo_code TEXT;
  _wo_title TEXT;
  _is_public BOOLEAN;
BEGIN
  -- Only fire for comment events
  IF NEW.type NOT IN ('comment_public', 'comment_internal') THEN
    RETURN NEW;
  END IF;

  _is_public := (NEW.type = 'comment_public');

  -- Get work order info
  SELECT wo.assigned_to_id, wo.requester_user_id, wo.code, wo.title, wo.tenant_id
    INTO _wo
    FROM work_orders wo
   WHERE wo.id = NEW.work_order_id;

  IF _wo IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get actor name
  SELECT name INTO _actor_name FROM profiles WHERE id = NEW.actor_user_id;
  _actor_name := COALESCE(_actor_name, 'Alguém');

  _comment_text := COALESCE((NEW.payload->>'text')::TEXT, '');
  _wo_code := COALESCE(_wo.code, '');
  _wo_title := COALESCE(_wo.title, '');

  -- If commenter is the technician → notify requester
  IF NEW.actor_user_id = _wo.assigned_to_id AND _wo.requester_user_id IS NOT NULL AND _wo.requester_user_id != NEW.actor_user_id AND _is_public THEN
    INSERT INTO notifications (user_id, tenant_id, type, title, body, link)
    VALUES (
      _wo.requester_user_id,
      _wo.tenant_id,
      'work_order',
      _wo_code || ' — Nova resposta',
      _actor_name || ': ' || LEFT(_comment_text, 120),
      '/portal/os/' || NEW.work_order_id
    );
  END IF;

  -- If commenter is the requester → notify technician
  IF NEW.actor_user_id = _wo.requester_user_id AND _wo.assigned_to_id IS NOT NULL AND _wo.assigned_to_id != NEW.actor_user_id THEN
    INSERT INTO notifications (user_id, tenant_id, type, title, body, link)
    VALUES (
      _wo.assigned_to_id,
      _wo.tenant_id,
      'work_order',
      _wo_code || ' — Mensagem do solicitante',
      _actor_name || ': ' || LEFT(_comment_text, 120),
      '/os/' || NEW.work_order_id
    );
  END IF;

  -- If commenter is neither tech nor requester (e.g. coordinator), notify both
  IF NEW.actor_user_id IS DISTINCT FROM _wo.assigned_to_id AND NEW.actor_user_id IS DISTINCT FROM _wo.requester_user_id THEN
    -- Notify technician
    IF _wo.assigned_to_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, tenant_id, type, title, body, link)
      VALUES (
        _wo.assigned_to_id,
        _wo.tenant_id,
        'work_order',
        _wo_code || ' — Novo comentário',
        _actor_name || ': ' || LEFT(_comment_text, 120),
        '/os/' || NEW.work_order_id
      );
    END IF;

    -- Notify requester (only public comments)
    IF _wo.requester_user_id IS NOT NULL AND _is_public THEN
      INSERT INTO notifications (user_id, tenant_id, type, title, body, link)
      VALUES (
        _wo.requester_user_id,
        _wo.tenant_id,
        'work_order',
        _wo_code || ' — Nova resposta',
        _actor_name || ': ' || LEFT(_comment_text, 120),
        '/portal/os/' || NEW.work_order_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.work_order_events;
CREATE TRIGGER trg_notify_on_comment
  AFTER INSERT ON public.work_order_events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment();
