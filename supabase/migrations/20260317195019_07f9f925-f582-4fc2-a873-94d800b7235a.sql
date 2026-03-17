
CREATE OR REPLACE FUNCTION public.notify_planner_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _task RECORD;
  _plan RECORD;
  _actor_name TEXT;
BEGIN
  -- Get task info
  SELECT t.title, t.plan_id, t.tenant_id
    INTO _task
    FROM public.planner_tasks t
   WHERE t.id = NEW.task_id;

  IF _task IS NULL THEN RETURN NEW; END IF;

  -- Get plan info and check if it's a team plan
  SELECT p.scope, p.name INTO _plan
    FROM public.planner_plans p
   WHERE p.id = _task.plan_id;

  IF _plan IS NULL OR _plan.scope <> 'team' THEN
    RETURN NEW;
  END IF;

  -- Don't notify if user assigned themselves
  IF NEW.user_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Get actor name
  SELECT name INTO _actor_name FROM public.profiles WHERE id = auth.uid();
  _actor_name := COALESCE(_actor_name, 'Alguém');

  -- Insert notification for the assigned user
  INSERT INTO public.notifications (user_id, tenant_id, type, title, body, icon, link, metadata)
  VALUES (
    NEW.user_id,
    NEW.tenant_id,
    'planner',
    'Tarefa atribuída a você',
    _actor_name || ' atribuiu a tarefa "' || LEFT(_task.title, 80) || '" no plano "' || LEFT(_plan.name, 40) || '".',
    '📌',
    '/planner',
    jsonb_build_object(
      'action', 'task_assigned',
      'task_id', NEW.task_id,
      'plan_name', _plan.name
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_planner_task_assigned
  AFTER INSERT ON public.planner_task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_planner_task_assigned();
