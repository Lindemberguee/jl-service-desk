
-- Add user_id to customers to link them to portal accounts
ALTER TABLE public.customers ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create unique index (a user can only be linked to one customer per tenant)
CREATE UNIQUE INDEX idx_customers_tenant_user ON public.customers(tenant_id, user_id) WHERE user_id IS NOT NULL;

-- Index for fast lookup
CREATE INDEX idx_customers_user_id ON public.customers(user_id) WHERE user_id IS NOT NULL;
