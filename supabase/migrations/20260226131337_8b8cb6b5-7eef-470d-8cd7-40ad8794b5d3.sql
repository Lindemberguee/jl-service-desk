
-- Add external link field to work orders
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS external_link text DEFAULT NULL;

-- Add resolution quality and time rating fields
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS resolution_quality smallint DEFAULT NULL;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS resolution_time_rating smallint DEFAULT NULL;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS technical_note text DEFAULT NULL;
