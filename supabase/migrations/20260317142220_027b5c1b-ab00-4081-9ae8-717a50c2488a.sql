
-- KPIs: Replace ALL policy with separate SELECT + write policies
DROP POLICY IF EXISTS "Authorized can manage kpis" ON public.kpis;
CREATE POLICY "Coordinators+ can manage kpis" ON public.kpis
  FOR ALL TO public
  USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]));

-- KPI Entries
DROP POLICY IF EXISTS "Authorized can manage kpi_entries" ON public.kpi_entries;
CREATE POLICY "Coordinators+ can manage kpi_entries" ON public.kpi_entries
  FOR ALL TO public
  USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]));

-- OKR Cycles
DROP POLICY IF EXISTS "Authorized can manage okr_cycles" ON public.okr_cycles;
CREATE POLICY "Coordinators+ can manage okr_cycles" ON public.okr_cycles
  FOR ALL TO public
  USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]));

-- OKR Objectives
DROP POLICY IF EXISTS "Authorized can manage okr_objectives" ON public.okr_objectives;
CREATE POLICY "Coordinators+ can manage okr_objectives" ON public.okr_objectives
  FOR ALL TO public
  USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]));

-- OKR Key Results
DROP POLICY IF EXISTS "Authorized can manage okr_key_results" ON public.okr_key_results;
CREATE POLICY "Coordinators+ can manage okr_key_results" ON public.okr_key_results
  FOR ALL TO public
  USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]));

-- OKR Checkins
DROP POLICY IF EXISTS "Authorized can manage okr_checkins" ON public.okr_checkins;
CREATE POLICY "Coordinators+ can manage okr_checkins" ON public.okr_checkins
  FOR ALL TO public
  USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]));
