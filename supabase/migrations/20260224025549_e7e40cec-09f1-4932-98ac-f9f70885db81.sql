
-- =============================================
-- FIX: Change all RLS policies from RESTRICTIVE to PERMISSIVE
-- The default CREATE POLICY is PERMISSIVE, but somehow all were created as RESTRICTIVE.
-- With RESTRICTIVE, ALL policies must pass. With PERMISSIVE, at least ONE must pass.
-- =============================================

-- TENANTS
DROP POLICY IF EXISTS "Members can view their tenants" ON public.tenants;
DROP POLICY IF EXISTS "Super admins can manage tenants" ON public.tenants;
CREATE POLICY "Members can view their tenants" ON public.tenants FOR SELECT TO authenticated USING (is_super_admin(auth.uid()) OR is_tenant_member(auth.uid(), id));
CREATE POLICY "Super admins can manage tenants" ON public.tenants FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Members can view tenant profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Members can view tenant profiles" ON public.profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_memberships m1 JOIN user_memberships m2 ON m1.tenant_id = m2.tenant_id WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id AND m1.is_active = true AND m2.is_active = true));

-- USER MEMBERSHIPS
DROP POLICY IF EXISTS "Users can view own memberships" ON public.user_memberships;
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.user_memberships;
CREATE POLICY "Users can view own memberships" ON public.user_memberships FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage memberships" ON public.user_memberships FOR ALL TO authenticated USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin')) WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin'));

-- UNITS
DROP POLICY IF EXISTS "Tenant members can view units" ON public.units;
DROP POLICY IF EXISTS "Admins can manage units" ON public.units;
CREATE POLICY "Tenant members can view units" ON public.units FOR SELECT TO authenticated USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage units" ON public.units FOR ALL TO authenticated USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador')) WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'));

-- LOCATIONS
DROP POLICY IF EXISTS "Tenant members can view locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can manage locations" ON public.locations;
CREATE POLICY "Tenant members can view locations" ON public.locations FOR SELECT TO authenticated USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage locations" ON public.locations FOR ALL TO authenticated USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador')) WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'));

-- CUSTOMERS
DROP POLICY IF EXISTS "Tenant members can view customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
CREATE POLICY "Tenant members can view customers" ON public.customers FOR SELECT TO authenticated USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage customers" ON public.customers FOR ALL TO authenticated USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador')) WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'));

-- CATEGORIES
DROP POLICY IF EXISTS "Tenant members can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Tenant members can view categories" ON public.categories FOR SELECT TO authenticated USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador')) WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'));

-- ASSETS
DROP POLICY IF EXISTS "Tenant members can view assets" ON public.assets;
DROP POLICY IF EXISTS "Admins can manage assets" ON public.assets;
CREATE POLICY "Tenant members can view assets" ON public.assets FOR SELECT TO authenticated USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage assets" ON public.assets FOR ALL TO authenticated USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador')) WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'));

-- SLA POLICIES
DROP POLICY IF EXISTS "Tenant members can view sla_policies" ON public.sla_policies;
DROP POLICY IF EXISTS "Admins can manage sla_policies" ON public.sla_policies;
CREATE POLICY "Tenant members can view sla_policies" ON public.sla_policies FOR SELECT TO authenticated USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage sla_policies" ON public.sla_policies FOR ALL TO authenticated USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin')) WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin'));

-- WORK ORDERS
DROP POLICY IF EXISTS "Tenant members can view work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Members can create work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Authorized can update work_orders" ON public.work_orders;
CREATE POLICY "Tenant members can view work_orders" ON public.work_orders FOR SELECT TO authenticated USING (is_tenant_member(auth.uid(), tenant_id) AND deleted_at IS NULL);
CREATE POLICY "Members can create work_orders" ON public.work_orders FOR INSERT TO authenticated WITH CHECK (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Authorized can update work_orders" ON public.work_orders FOR UPDATE TO authenticated USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador', 'tecnico') OR assigned_to_id = auth.uid());

-- WORK ORDER EVENTS
DROP POLICY IF EXISTS "Tenant members can view events" ON public.work_order_events;
DROP POLICY IF EXISTS "Members can create events" ON public.work_order_events;
CREATE POLICY "Tenant members can view events" ON public.work_order_events FOR SELECT TO authenticated USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Members can create events" ON public.work_order_events FOR INSERT TO authenticated WITH CHECK (is_tenant_member(auth.uid(), tenant_id));

-- WORK ORDER ATTACHMENTS
DROP POLICY IF EXISTS "Tenant members can view attachments" ON public.work_order_attachments;
DROP POLICY IF EXISTS "Members can upload attachments" ON public.work_order_attachments;
CREATE POLICY "Tenant members can view attachments" ON public.work_order_attachments FOR SELECT TO authenticated USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Members can upload attachments" ON public.work_order_attachments FOR INSERT TO authenticated WITH CHECK (is_tenant_member(auth.uid(), tenant_id));

-- CHECKLIST TEMPLATES
DROP POLICY IF EXISTS "Tenant members can view checklist_templates" ON public.checklist_templates;
DROP POLICY IF EXISTS "Admins can manage checklist_templates" ON public.checklist_templates;
CREATE POLICY "Tenant members can view checklist_templates" ON public.checklist_templates FOR SELECT TO authenticated USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage checklist_templates" ON public.checklist_templates FOR ALL TO authenticated USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador')) WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'));

-- WORK ORDER CHECKLIST ITEMS
DROP POLICY IF EXISTS "Tenant members can view checklist_items" ON public.work_order_checklist_items;
DROP POLICY IF EXISTS "Authorized can manage checklist_items" ON public.work_order_checklist_items;
CREATE POLICY "Tenant members can view checklist_items" ON public.work_order_checklist_items FOR SELECT TO authenticated USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Authorized can manage checklist_items" ON public.work_order_checklist_items FOR ALL TO authenticated USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador', 'tecnico')) WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador', 'tecnico'));

-- STOCK ITEMS
DROP POLICY IF EXISTS "Tenant members can view stock_items" ON public.stock_items;
DROP POLICY IF EXISTS "Admins can manage stock_items" ON public.stock_items;
CREATE POLICY "Tenant members can view stock_items" ON public.stock_items FOR SELECT TO authenticated USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Admins can manage stock_items" ON public.stock_items FOR ALL TO authenticated USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador')) WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'));

-- STOCK MOVEMENTS
DROP POLICY IF EXISTS "Tenant members can view stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Authorized can create stock_movements" ON public.stock_movements;
CREATE POLICY "Tenant members can view stock_movements" ON public.stock_movements FOR SELECT TO authenticated USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Authorized can create stock_movements" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador', 'tecnico'));

-- AUDIT LOGS
DROP POLICY IF EXISTS "Admins can view audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin'));
CREATE POLICY "Authenticated can insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_user_id = auth.uid());
