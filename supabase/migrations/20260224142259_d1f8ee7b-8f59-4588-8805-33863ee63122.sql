
-- Add requester_user_id to track which auth user created the work order
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS requester_user_id uuid;

-- Backfill from existing events (the actor of the 'created' event)
UPDATE public.work_orders wo
SET requester_user_id = (
  SELECT actor_user_id FROM public.work_order_events
  WHERE work_order_id = wo.id AND type = 'created'
  ORDER BY created_at ASC LIMIT 1
)
WHERE requester_user_id IS NULL;
