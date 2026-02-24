
-- Add extra fields to customers table for richer solicitante profiles
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS position text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS sector text;
