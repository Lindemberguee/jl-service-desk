
-- Create tenant SMTP settings table
CREATE TABLE public.tenant_smtp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  smtp_host text NOT NULL DEFAULT '',
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_user text NOT NULL DEFAULT '',
  smtp_pass text NOT NULL DEFAULT '',
  smtp_from_email text NOT NULL DEFAULT '',
  smtp_from_name text NOT NULL DEFAULT '',
  use_tls boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT false,
  notify_os_created boolean NOT NULL DEFAULT true,
  notify_os_status_changed boolean NOT NULL DEFAULT true,
  notify_stock_critical boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.tenant_smtp_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage
CREATE POLICY "Admins can manage smtp_settings"
  ON public.tenant_smtp_settings
  FOR ALL
  USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin'))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_tenant_smtp_settings_updated_at
  BEFORE UPDATE ON public.tenant_smtp_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
