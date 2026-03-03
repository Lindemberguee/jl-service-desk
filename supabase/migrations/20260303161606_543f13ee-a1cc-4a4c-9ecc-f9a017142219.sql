
CREATE OR REPLACE FUNCTION public.check_and_expire_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tenant_subscriptions
  SET status = 'expired', updated_at = now()
  WHERE status = 'trial'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at < now();

  UPDATE tenant_subscriptions
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND current_period_end IS NOT NULL
    AND EXTRACT(YEAR FROM current_period_end) < 2090
    AND current_period_end < now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_subscription_with_expiry_check(p_tenant_id uuid)
RETURNS SETOF tenant_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tenant_subscriptions
  SET status = 'expired', updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND status = 'trial'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at < now();

  UPDATE tenant_subscriptions
  SET status = 'expired', updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND status = 'active'
    AND current_period_end IS NOT NULL
    AND EXTRACT(YEAR FROM current_period_end) < 2090
    AND current_period_end < now();

  RETURN QUERY SELECT * FROM tenant_subscriptions WHERE tenant_id = p_tenant_id;
END;
$$
