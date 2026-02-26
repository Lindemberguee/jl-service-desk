-- Ensure triggers are attached (they may have been lost)
DROP TRIGGER IF EXISTS trg_notify_os_assigned ON public.work_orders;
DROP TRIGGER IF EXISTS trg_notify_os_status_changed ON public.work_orders;
DROP TRIGGER IF EXISTS trg_notify_stock_min_level ON public.stock_items;

CREATE TRIGGER trg_notify_os_assigned
  AFTER UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_os_assigned();

CREATE TRIGGER trg_notify_os_status_changed
  AFTER UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_os_status_changed();

CREATE TRIGGER trg_notify_stock_min_level
  AFTER UPDATE ON public.stock_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_stock_min_level();

-- Enable full replica identity for realtime DELETE tracking
ALTER TABLE public.notifications REPLICA IDENTITY FULL;