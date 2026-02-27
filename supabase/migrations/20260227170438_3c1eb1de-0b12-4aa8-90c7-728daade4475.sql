
-- Add activity-level fields to okr_key_results (which serve as "activities" in the plan)
ALTER TABLE public.okr_key_results 
  ADD COLUMN IF NOT EXISTS area TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS support_team TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS delivery_date DATE,
  ADD COLUMN IF NOT EXISTS activity_status TEXT NOT NULL DEFAULT 'a_iniciar',
  ADD COLUMN IF NOT EXISTS responsible_name TEXT DEFAULT '';

-- Add area/department field to okr_objectives  
ALTER TABLE public.okr_objectives
  ADD COLUMN IF NOT EXISTS area TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS indicator TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS target_label TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS responsible_name TEXT DEFAULT '';

-- Allow tecnico and analista to manage okr_key_results (for check-ins and activity updates)
DROP POLICY IF EXISTS "Admins can manage okr_key_results" ON public.okr_key_results;
CREATE POLICY "Authorized can manage okr_key_results"
  ON public.okr_key_results FOR ALL
  USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role, 'analista'::app_role]))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role, 'analista'::app_role]));

-- Allow tecnico and analista to manage okr_objectives 
DROP POLICY IF EXISTS "Admins can manage okr_objectives" ON public.okr_objectives;
CREATE POLICY "Authorized can manage okr_objectives"
  ON public.okr_objectives FOR ALL
  USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role, 'analista'::app_role]))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role, 'analista'::app_role]));

-- Allow tecnico and analista to manage okr_cycles
DROP POLICY IF EXISTS "Admins can manage okr_cycles" ON public.okr_cycles;
CREATE POLICY "Authorized can manage okr_cycles"
  ON public.okr_cycles FOR ALL
  USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role, 'analista'::app_role]))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role, 'analista'::app_role]));
