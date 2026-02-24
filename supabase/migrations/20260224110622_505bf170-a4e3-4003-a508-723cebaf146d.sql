
-- ============================================================
-- 1. DROP ALL RESTRICTIVE POLICIES AND RECREATE AS PERMISSIVE
-- ============================================================

-- TENANTS
DROP POLICY IF EXISTS "Members can view their tenants" ON public.tenants;
DROP POLICY IF EXISTS "Super admins can manage tenants" ON public.tenants;
CREATE POLICY "Members can view their tenants" ON public.tenants FOR SELECT USING (is_super_admin(auth.uid()) OR is_tenant_member(auth.uid(), id));
CREATE POLICY "Super admins can manage tenants" ON public.tenants FOR ALL USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Members can view tenant profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Members can view tenant profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_memberships m1 JOIN user_memberships m2 ON m1.tenant_id = m2.tenant_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id AND m1.is_active = true AND m2.is_active = true)
);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- USER_MEMBERSHIPS
DROP POLICY IF EXISTS "Users can view own memberships" ON public.user_memberships;
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.user_memberships;
CREATE POLICY "Users can view own memberships" ON public.user_memberships FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage memberships" ON public.user_memberships FOR ALL USING (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role])
) WITH CHECK (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role])
);

-- UNITS
DROP POLICY IF EXISTS "Tenant members can view units" ON public.units;
DROP POLICY IF EXISTS "Admins can manage units" ON public.units;
CREATE POLICY "Tenant members can view units" ON public.units FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage units" ON public.units FOR ALL USING (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])
) WITH CHECK (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])
);

-- CATEGORIES
DROP POLICY IF EXISTS "Tenant members can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Tenant members can view categories" ON public.categories FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])
) WITH CHECK (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])
);

-- LOCATIONS
DROP POLICY IF EXISTS "Tenant members can view locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can manage locations" ON public.locations;
CREATE POLICY "Tenant members can view locations" ON public.locations FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage locations" ON public.locations FOR ALL USING (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])
) WITH CHECK (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])
);

-- CUSTOMERS
DROP POLICY IF EXISTS "Tenant members can view customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
CREATE POLICY "Tenant members can view customers" ON public.customers FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage customers" ON public.customers FOR ALL USING (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])
) WITH CHECK (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])
);

-- ASSETS
DROP POLICY IF EXISTS "Tenant members can view assets" ON public.assets;
DROP POLICY IF EXISTS "Admins can manage assets" ON public.assets;
CREATE POLICY "Tenant members can view assets" ON public.assets FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage assets" ON public.assets FOR ALL USING (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])
) WITH CHECK (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])
);

-- WORK_ORDERS
DROP POLICY IF EXISTS "Tenant members can view work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Members can create work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Authorized can update work_orders" ON public.work_orders;
CREATE POLICY "Tenant members can view work_orders" ON public.work_orders FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id) AND deleted_at IS NULL);
CREATE POLICY "Members can create work_orders" ON public.work_orders FOR INSERT WITH CHECK (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Authorized can update work_orders" ON public.work_orders FOR UPDATE USING (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role])
  OR assigned_to_id = auth.uid()
);

-- WORK_ORDER_EVENTS
DROP POLICY IF EXISTS "Tenant members can view events" ON public.work_order_events;
DROP POLICY IF EXISTS "Members can create events" ON public.work_order_events;
CREATE POLICY "Tenant members can view events" ON public.work_order_events FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Members can create events" ON public.work_order_events FOR INSERT WITH CHECK (is_tenant_member(auth.uid(), tenant_id));

-- WORK_ORDER_ATTACHMENTS
DROP POLICY IF EXISTS "Tenant members can view attachments" ON public.work_order_attachments;
DROP POLICY IF EXISTS "Members can upload attachments" ON public.work_order_attachments;
CREATE POLICY "Tenant members can view attachments" ON public.work_order_attachments FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Members can upload attachments" ON public.work_order_attachments FOR INSERT WITH CHECK (is_tenant_member(auth.uid(), tenant_id));

-- WORK_ORDER_CHECKLIST_ITEMS
DROP POLICY IF EXISTS "Tenant members can view checklist_items" ON public.work_order_checklist_items;
DROP POLICY IF EXISTS "Authorized can manage checklist_items" ON public.work_order_checklist_items;
CREATE POLICY "Tenant members can view checklist_items" ON public.work_order_checklist_items FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Authorized can manage checklist_items" ON public.work_order_checklist_items FOR ALL USING (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role])
) WITH CHECK (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role])
);

-- STOCK_ITEMS
DROP POLICY IF EXISTS "Tenant members can view stock_items" ON public.stock_items;
DROP POLICY IF EXISTS "Admins can manage stock_items" ON public.stock_items;
CREATE POLICY "Tenant members can view stock_items" ON public.stock_items FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage stock_items" ON public.stock_items FOR ALL USING (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])
) WITH CHECK (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])
);

-- STOCK_MOVEMENTS
DROP POLICY IF EXISTS "Tenant members can view stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Authorized can create stock_movements" ON public.stock_movements;
CREATE POLICY "Tenant members can view stock_movements" ON public.stock_movements FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Authorized can create stock_movements" ON public.stock_movements FOR INSERT WITH CHECK (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role])
);

-- SLA_POLICIES
DROP POLICY IF EXISTS "Tenant members can view sla_policies" ON public.sla_policies;
DROP POLICY IF EXISTS "Admins can manage sla_policies" ON public.sla_policies;
CREATE POLICY "Tenant members can view sla_policies" ON public.sla_policies FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage sla_policies" ON public.sla_policies FOR ALL USING (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role])
) WITH CHECK (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role])
);

-- CHECKLIST_TEMPLATES
DROP POLICY IF EXISTS "Tenant members can view checklist_templates" ON public.checklist_templates;
DROP POLICY IF EXISTS "Admins can manage checklist_templates" ON public.checklist_templates;
CREATE POLICY "Tenant members can view checklist_templates" ON public.checklist_templates FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage checklist_templates" ON public.checklist_templates FOR ALL USING (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])
) WITH CHECK (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role])
);

-- AUDIT_LOGS
DROP POLICY IF EXISTS "Admins can view audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit_logs" ON public.audit_logs FOR SELECT USING (
  get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role])
);
CREATE POLICY "Authenticated can insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (actor_user_id = auth.uid());

-- ============================================================
-- 2. CREATE STORAGE BUCKET FOR WORK ORDER ATTACHMENTS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('work-order-attachments', 'work-order-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'work-order-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'work-order-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete own attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'work-order-attachments' AND auth.role() = 'authenticated');

-- ============================================================
-- 3. ENABLE REALTIME FOR WORK_ORDERS
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_orders;
