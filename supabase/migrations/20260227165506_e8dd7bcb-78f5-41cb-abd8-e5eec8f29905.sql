
-- =============================================
-- KPIs & OKRs Module - Complete Schema
-- =============================================

-- KPI Definitions
CREATE TABLE public.kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  unit TEXT NOT NULL DEFAULT '%',
  category TEXT NOT NULL DEFAULT 'Operacional',
  direction TEXT NOT NULL DEFAULT 'higher_is_better' CHECK (direction IN ('higher_is_better', 'lower_is_better', 'target_is_best')),
  target_value NUMERIC NOT NULL DEFAULT 0,
  warning_threshold NUMERIC,
  critical_threshold NUMERIC,
  data_source TEXT NOT NULL DEFAULT 'manual' CHECK (data_source IN ('manual', 'auto_os', 'auto_stock', 'auto_maintenance', 'auto_sla')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'BarChart3',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- KPI Entries (historical data points)
CREATE TABLE public.kpi_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_id UUID NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OKR Cycles (quarterly, semester, annual)
CREATE TABLE public.okr_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'quarterly' CHECK (type IN ('monthly', 'quarterly', 'semester', 'annual', 'custom')),
  starts_at DATE NOT NULL,
  ends_at DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OKR Objectives
CREATE TABLE public.okr_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.okr_cycles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  owner_user_id UUID,
  category TEXT NOT NULL DEFAULT 'Operacional',
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'critica')),
  progress NUMERIC NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status TEXT NOT NULL DEFAULT 'on_track' CHECK (status IN ('on_track', 'at_risk', 'behind', 'completed', 'cancelled')),
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OKR Key Results
CREATE TABLE public.okr_key_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objective_id UUID NOT NULL REFERENCES public.okr_objectives(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  unit TEXT NOT NULL DEFAULT '%',
  start_value NUMERIC NOT NULL DEFAULT 0,
  target_value NUMERIC NOT NULL DEFAULT 100,
  current_value NUMERIC NOT NULL DEFAULT 0,
  confidence_level NUMERIC DEFAULT 70 CHECK (confidence_level >= 0 AND confidence_level <= 100),
  owner_user_id UUID,
  kpi_id UUID REFERENCES public.kpis(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'on_track' CHECK (status IN ('on_track', 'at_risk', 'behind', 'completed', 'cancelled')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OKR Check-ins (periodic updates on key results)
CREATE TABLE public.okr_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_result_id UUID NOT NULL REFERENCES public.okr_key_results(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  confidence_level NUMERIC DEFAULT 70,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policies: KPIs
CREATE POLICY "Tenant members can view kpis" ON public.kpis FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage kpis" ON public.kpis FOR ALL USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])) WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]));

-- RLS Policies: KPI Entries
CREATE POLICY "Tenant members can view kpi_entries" ON public.kpi_entries FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage kpi_entries" ON public.kpi_entries FOR ALL USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])) WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]));

-- RLS Policies: OKR Cycles
CREATE POLICY "Tenant members can view okr_cycles" ON public.okr_cycles FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage okr_cycles" ON public.okr_cycles FOR ALL USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])) WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]));

-- RLS Policies: OKR Objectives
CREATE POLICY "Tenant members can view okr_objectives" ON public.okr_objectives FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage okr_objectives" ON public.okr_objectives FOR ALL USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])) WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]));

-- RLS Policies: OKR Key Results
CREATE POLICY "Tenant members can view okr_key_results" ON public.okr_key_results FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage okr_key_results" ON public.okr_key_results FOR ALL USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])) WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]));

-- RLS Policies: OKR Check-ins
CREATE POLICY "Tenant members can view okr_checkins" ON public.okr_checkins FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Authorized can manage okr_checkins" ON public.okr_checkins FOR ALL USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role, 'analista'::app_role])) WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role, 'analista'::app_role]));

-- Triggers for updated_at
CREATE TRIGGER update_kpis_updated_at BEFORE UPDATE ON public.kpis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_okr_cycles_updated_at BEFORE UPDATE ON public.okr_cycles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_okr_objectives_updated_at BEFORE UPDATE ON public.okr_objectives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_okr_key_results_updated_at BEFORE UPDATE ON public.okr_key_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed KPI/OKR permissions for all roles
INSERT INTO public.role_permissions (role, permission, granted) VALUES
  ('super_admin', 'kpis:read', true), ('super_admin', 'kpis:manage', true),
  ('admin', 'kpis:read', true), ('admin', 'kpis:manage', true),
  ('coordenador', 'kpis:read', true), ('coordenador', 'kpis:manage', true),
  ('tecnico', 'kpis:read', true), ('tecnico', 'kpis:manage', false),
  ('analista', 'kpis:read', true), ('analista', 'kpis:manage', false),
  ('solicitante', 'kpis:read', false), ('solicitante', 'kpis:manage', false),
  ('leitura', 'kpis:read', true), ('leitura', 'kpis:manage', false)
ON CONFLICT (role, permission) DO NOTHING;
