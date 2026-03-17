
-- Planner Plans
CREATE TABLE public.planner_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Novo Plano',
  description TEXT DEFAULT '',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planner_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view planner_plans" ON public.planner_plans
  FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Authorized can manage planner_plans" ON public.planner_plans
  FOR ALL TO authenticated
  USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin','admin','coordenador','tecnico','analista']::app_role[]))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin','admin','coordenador','tecnico','analista']::app_role[]));

-- Planner Buckets (columns in kanban)
CREATE TABLE public.planner_buckets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.planner_plans(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'A fazer',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planner_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view planner_buckets" ON public.planner_buckets
  FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Authorized can manage planner_buckets" ON public.planner_buckets
  FOR ALL TO authenticated
  USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin','admin','coordenador','tecnico','analista']::app_role[]))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin','admin','coordenador','tecnico','analista']::app_role[]));

-- Planner Tasks
CREATE TABLE public.planner_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.planner_plans(id) ON DELETE CASCADE,
  bucket_id UUID NOT NULL REFERENCES public.planner_buckets(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planner_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view planner_tasks" ON public.planner_tasks
  FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Authorized can manage planner_tasks" ON public.planner_tasks
  FOR ALL TO authenticated
  USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin','admin','coordenador','tecnico','analista']::app_role[]))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin','admin','coordenador','tecnico','analista']::app_role[]));

-- Task Assignments
CREATE TABLE public.planner_task_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.planner_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

ALTER TABLE public.planner_task_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view planner_task_assignments" ON public.planner_task_assignments
  FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Authorized can manage planner_task_assignments" ON public.planner_task_assignments
  FOR ALL TO authenticated
  USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin','admin','coordenador','tecnico','analista']::app_role[]))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin','admin','coordenador','tecnico','analista']::app_role[]));

-- Task Comments
CREATE TABLE public.planner_task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.planner_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planner_task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view planner_task_comments" ON public.planner_task_comments
  FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Authorized can manage planner_task_comments" ON public.planner_task_comments
  FOR ALL TO authenticated
  USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin','admin','coordenador','tecnico','analista']::app_role[]))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin','admin','coordenador','tecnico','analista']::app_role[]));

-- Triggers for updated_at
CREATE TRIGGER update_planner_plans_updated_at BEFORE UPDATE ON public.planner_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_planner_tasks_updated_at BEFORE UPDATE ON public.planner_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable realtime for tasks (drag-drop sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.planner_tasks;
