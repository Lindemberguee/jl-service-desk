
CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT 'true'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admins_manage_platform_settings" ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "all_users_read_public_settings" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (key IN ('whatsapp_button_enabled'));

INSERT INTO public.platform_settings (key, value) VALUES ('whatsapp_button_enabled', 'true'::jsonb);
