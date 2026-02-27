
-- Fix kpi_entries RLS to allow tecnico and analista (matching OKR tables)
DROP POLICY IF EXISTS "Admins can manage kpi_entries" ON public.kpi_entries;
CREATE POLICY "Authorized can manage kpi_entries" ON public.kpi_entries
  FOR ALL USING (
    get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role, 'analista'::app_role])
  )
  WITH CHECK (
    get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role, 'analista'::app_role])
  );

-- Also fix kpis table RLS
DROP POLICY IF EXISTS "Admins can manage kpis" ON public.kpis;
CREATE POLICY "Authorized can manage kpis" ON public.kpis
  FOR ALL USING (
    get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role, 'analista'::app_role])
  )
  WITH CHECK (
    get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role, 'analista'::app_role])
  );
