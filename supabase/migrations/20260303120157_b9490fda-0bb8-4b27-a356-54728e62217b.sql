
-- Plan type enum
CREATE TYPE public.subscription_plan AS ENUM ('starter', 'professional', 'enterprise', 'custom', 'trial');
CREATE TYPE public.subscription_status AS ENUM ('active', 'trial', 'expired', 'suspended', 'cancelled');

-- Tenant subscriptions table
CREATE TABLE public.tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'trial',
  status subscription_status NOT NULL DEFAULT 'trial',
  max_users INTEGER NOT NULL DEFAULT 5,
  enabled_modules TEXT[] NOT NULL DEFAULT ARRAY['os', 'dashboard', 'assets', 'stock', 'portal', 'notifications'],
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_start DATE,
  current_period_end DATE,
  monthly_price NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- Only super_admins can manage subscriptions
CREATE POLICY "Super admins can manage subscriptions"
  ON public.tenant_subscriptions FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Tenant admins can view their own subscription
CREATE POLICY "Tenant admins can view own subscription"
  ON public.tenant_subscriptions FOR SELECT
  USING (
    get_user_tenant_role(auth.uid(), tenant_id) IN ('admin', 'coordenador')
  );

-- Function to count active users per tenant
CREATE OR REPLACE FUNCTION public.get_tenant_user_count(_tenant_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER 
  FROM public.user_memberships 
  WHERE tenant_id = _tenant_id AND is_active = true;
$$;

-- Function to check if tenant can add more users
CREATE OR REPLACE FUNCTION public.can_tenant_add_user(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT get_tenant_user_count(_tenant_id) < ts.max_users
     FROM public.tenant_subscriptions ts
     WHERE ts.tenant_id = _tenant_id AND ts.status IN ('active', 'trial')),
    true  -- If no subscription exists, allow (legacy tenants)
  );
$$;

-- Function to check if a module is enabled for a tenant
CREATE OR REPLACE FUNCTION public.is_module_enabled(_tenant_id UUID, _module TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT _module = ANY(ts.enabled_modules)
     FROM public.tenant_subscriptions ts
     WHERE ts.tenant_id = _tenant_id AND ts.status IN ('active', 'trial')),
    true  -- If no subscription exists, allow (legacy tenants)
  );
$$;

-- Updated_at trigger
CREATE TRIGGER update_tenant_subscriptions_updated_at
  BEFORE UPDATE ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
