
-- Table to store global audit configuration
CREATE TABLE public.audit_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  retention_days integer NOT NULL DEFAULT 90,
  enabled_entities text[] NOT NULL DEFAULT ARRAY['auth','user','work_order','membership','asset','stock','customer','unit','location','category','tenant','sla_policy','role_permissions'],
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

-- Insert default row
INSERT INTO public.audit_settings (id, retention_days) VALUES ('00000000-0000-0000-0000-000000000001', 90);

-- Enable RLS
ALTER TABLE public.audit_settings ENABLE ROW LEVEL SECURITY;

-- Only super_admins can read/manage
CREATE POLICY "Super admins can manage audit_settings"
  ON public.audit_settings FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));
