
-- Drop existing triggers to avoid duplicates
DROP TRIGGER IF EXISTS trg_notify_os_assigned ON public.work_orders;
DROP TRIGGER IF EXISTS trg_notify_os_status_changed ON public.work_orders;
DROP TRIGGER IF EXISTS trg_notify_stock_min_level ON public.stock_items;

-- OS assigned: fires on INSERT (new OS) or UPDATE when assigned_to_id changes
CREATE TRIGGER trg_notify_os_assigned
  AFTER INSERT OR UPDATE OF assigned_to_id ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_os_assigned();

-- OS status changed: fires ONLY on UPDATE when status changes (not on INSERT)
CREATE TRIGGER trg_notify_os_status_changed
  AFTER UPDATE OF status ON public.work_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_os_status_changed();

-- Stock critical: fires on UPDATE when current_level changes
CREATE TRIGGER trg_notify_stock_min_level
  AFTER UPDATE OF current_level ON public.stock_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_stock_min_level();
