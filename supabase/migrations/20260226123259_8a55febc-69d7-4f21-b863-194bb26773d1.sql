
-- Add new columns to stock_items for richer item data
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS component_type text;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS patrimony_code text;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS serial_number text;

-- Index on patrimony_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_stock_items_patrimony ON public.stock_items(patrimony_code) WHERE patrimony_code IS NOT NULL;
