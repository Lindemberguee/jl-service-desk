
-- Table to store tenant iCal calendar URLs
CREATE TABLE public.tenant_calendar_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Calendário Principal',
  ical_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, ical_url)
);

ALTER TABLE public.tenant_calendar_settings ENABLE ROW LEVEL SECURITY;

-- Read: any tenant member
CREATE POLICY "Tenant members can read calendar settings"
ON public.tenant_calendar_settings FOR SELECT TO authenticated
USING (public.is_tenant_member(auth.uid(), tenant_id));

-- Write: admin/super_admin/coordenador only
CREATE POLICY "Admins can manage calendar settings"
ON public.tenant_calendar_settings FOR ALL TO authenticated
USING (
  public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador')
)
WITH CHECK (
  public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador')
);
