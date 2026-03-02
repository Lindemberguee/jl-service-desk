-- Create stock_item_status enum
CREATE TYPE public.stock_item_status AS ENUM ('ativo', 'inativo', 'descartado');

-- Add status column to stock_items
ALTER TABLE public.stock_items 
ADD COLUMN status public.stock_item_status NOT NULL DEFAULT 'ativo';
