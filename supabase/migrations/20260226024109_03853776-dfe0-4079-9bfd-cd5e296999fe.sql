
-- 1) Trigger: OS assigned → notify assigned user
CREATE OR REPLACE FUNCTION public.notify_os_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when assigned_to_id changes to a non-null value
  IF NEW.assigned_to_id IS NOT NULL AND (OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id) THEN
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
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_os_assigned
  AFTER UPDATE OF assigned_to_id ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_os_assigned();

-- 2) Trigger: OS status changed → notify assigned user + requester_user_id
CREATE OR REPLACE FUNCTION public.notify_os_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  status_label TEXT;
  target_user UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Human-readable status
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

    -- Notify assigned technician (if not the one who changed it)
    IF NEW.assigned_to_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, tenant_id, type, title, body, icon, link, metadata)
      VALUES (
        NEW.assigned_to_id,
        NEW.tenant_id,
        'work_order',
        'Status da OS alterado',
        'A OS ' || NEW.code || ' mudou para "' || status_label || '".',
        '📋',
        '/os/' || NEW.id,
        jsonb_build_object('work_order_id', NEW.id, 'code', NEW.code, 'action', 'status_changed', 'new_status', NEW.status::text)
      );
    END IF;

    -- Notify requester user (if exists and different from assigned)
    IF NEW.requester_user_id IS NOT NULL AND NEW.requester_user_id IS DISTINCT FROM NEW.assigned_to_id THEN
      INSERT INTO public.notifications (user_id, tenant_id, type, title, body, icon, link, metadata)
      VALUES (
        NEW.requester_user_id,
        NEW.tenant_id,
        'work_order',
        'Atualização da sua solicitação',
        'Sua OS ' || NEW.code || ' agora está "' || status_label || '".',
        '📋',
        '/portal/os/' || NEW.id,
        jsonb_build_object('work_order_id', NEW.id, 'code', NEW.code, 'action', 'status_changed', 'new_status', NEW.status::text)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_os_status_changed
  AFTER UPDATE OF status ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_os_status_changed();

-- 3) Trigger: Stock item reaches minimum level → notify admins/coordinators of that tenant
CREATE OR REPLACE FUNCTION public.notify_stock_min_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Only fire when current_level drops to or below min_level
  IF NEW.current_level <= NEW.min_level AND (OLD.current_level > OLD.min_level OR OLD.current_level IS NULL) THEN
    -- Notify all admins/coordinators/analysts of that tenant
    FOR admin_record IN
      SELECT user_id FROM public.user_memberships
      WHERE tenant_id = NEW.tenant_id
        AND is_active = true
        AND role IN ('super_admin', 'admin', 'coordenador', 'analista')
    LOOP
      INSERT INTO public.notifications (user_id, tenant_id, type, title, body, icon, link, metadata)
      VALUES (
        admin_record.user_id,
        NEW.tenant_id,
        'stock',
        'Estoque em nível crítico',
        'O item "' || LEFT(NEW.name, 60) || '" atingiu o nível mínimo (' || NEW.current_level || '/' || NEW.min_level || ').',
        '📦',
        '/estoque',
        jsonb_build_object('stock_item_id', NEW.id, 'item_name', NEW.name, 'current_level', NEW.current_level, 'min_level', NEW.min_level)
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_stock_min_level
  AFTER UPDATE OF current_level ON public.stock_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_stock_min_level();
