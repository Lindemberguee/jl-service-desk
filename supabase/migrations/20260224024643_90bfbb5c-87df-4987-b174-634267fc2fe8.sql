
-- =============================================
-- SISTEMA DE ORDEM DE SERVIÇO - MULTI-TENANT
-- =============================================

-- Enum types
CREATE TYPE public.tenant_plan AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'coordenador', 'tecnico', 'solicitante', 'leitura');
CREATE TYPE public.customer_type AS ENUM ('internal', 'external');
CREATE TYPE public.asset_status AS ENUM ('ativo', 'inativo', 'em_manutencao', 'descartado');
CREATE TYPE public.os_priority AS ENUM ('baixa', 'media', 'alta', 'critica');
CREATE TYPE public.os_status AS ENUM ('aberta', 'triagem', 'em_execucao', 'aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro', 'concluida', 'aprovada', 'encerrada', 'reaberta');
CREATE TYPE public.os_visibility AS ENUM ('internal', 'customer');
CREATE TYPE public.os_event_type AS ENUM ('created', 'assigned', 'status_changed', 'comment_internal', 'comment_public', 'attachment_added', 'checklist_updated', 'time_started', 'time_paused', 'time_resumed', 'resolved', 'closed', 'reopened');
CREATE TYPE public.stock_movement_type AS ENUM ('in', 'out', 'adjust');

-- 1) TENANTS
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan tenant_plan NOT NULL DEFAULT 'free',
  is_active BOOLEAN NOT NULL DEFAULT true,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  accent_color TEXT DEFAULT '#8B5CF6',
  dark_mode_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2) PROFILES (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3) USER MEMBERSHIPS (multi-tenant roles)
CREATE TABLE public.user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'solicitante',
  permissions TEXT[] DEFAULT '{}',
  team_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);
CREATE INDEX idx_memberships_tenant_user ON public.user_memberships(tenant_id, user_id);
CREATE INDEX idx_memberships_user ON public.user_memberships(user_id);
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;

-- 4) UNITS
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_units_tenant ON public.units(tenant_id);
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- 5) LOCATIONS
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_locations_tenant ON public.locations(tenant_id);
CREATE INDEX idx_locations_unit ON public.locations(tenant_id, unit_id);
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- 6) CUSTOMERS
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type customer_type NOT NULL DEFAULT 'internal',
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_tenant ON public.customers(tenant_id);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 7) CATEGORIES
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_tenant ON public.categories(tenant_id);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 8) ASSETS
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  patrimony_code TEXT,
  serial_number TEXT,
  status asset_status NOT NULL DEFAULT 'ativo',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assets_tenant ON public.assets(tenant_id);
CREATE INDEX idx_assets_tenant_unit ON public.assets(tenant_id, unit_id);
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- 9) SLA POLICIES
CREATE TABLE public.sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rules JSONB NOT NULL DEFAULT '{}',
  pause_statuses TEXT[] DEFAULT '{"aguardando_peca","aguardando_solicitante","aguardando_terceiro"}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sla_policies_tenant ON public.sla_policies(tenant_id);
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;

-- 10) WORK ORDERS
CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  requester_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  requester_contact JSONB DEFAULT '{}',
  priority os_priority NOT NULL DEFAULT 'media',
  status os_status NOT NULL DEFAULT 'aberta',
  assigned_team_id UUID,
  assigned_to_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sla_policy_id UUID REFERENCES public.sla_policies(id) ON DELETE SET NULL,
  response_due_at TIMESTAMPTZ,
  resolve_due_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  total_paused_ms BIGINT DEFAULT 0,
  started_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  labor_cost NUMERIC(12,2) DEFAULT 0,
  parts_cost NUMERIC(12,2) DEFAULT 0,
  total_cost NUMERIC(12,2) DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  visibility os_visibility NOT NULL DEFAULT 'internal',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);
CREATE INDEX idx_wo_tenant ON public.work_orders(tenant_id);
CREATE INDEX idx_wo_tenant_status ON public.work_orders(tenant_id, status);
CREATE INDEX idx_wo_tenant_priority ON public.work_orders(tenant_id, priority);
CREATE INDEX idx_wo_tenant_assigned ON public.work_orders(tenant_id, assigned_to_id);
CREATE INDEX idx_wo_tenant_created ON public.work_orders(tenant_id, created_at DESC);
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- 11) WORK ORDER EVENTS (timeline)
CREATE TABLE public.work_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  type os_event_type NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_woe_wo ON public.work_order_events(work_order_id, created_at);
CREATE INDEX idx_woe_tenant ON public.work_order_events(tenant_id);
ALTER TABLE public.work_order_events ENABLE ROW LEVEL SECURITY;

-- 12) WORK ORDER ATTACHMENTS
CREATE TABLE public.work_order_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT DEFAULT 0,
  url TEXT,
  storage_key TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_woa_wo ON public.work_order_attachments(work_order_id);
ALTER TABLE public.work_order_attachments ENABLE ROW LEVEL SECURITY;

-- 13) CHECKLIST TEMPLATES
CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklist_tpl_tenant ON public.checklist_templates(tenant_id);
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

-- 14) WORK ORDER CHECKLIST ITEMS
CREATE TABLE public.work_order_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ,
  checked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  observation TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_woci_wo ON public.work_order_checklist_items(work_order_id);
ALTER TABLE public.work_order_checklist_items ENABLE ROW LEVEL SECURITY;

-- 15) STOCK ITEMS
CREATE TABLE public.stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'un',
  min_level INT DEFAULT 0,
  current_level INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_items_tenant ON public.stock_items(tenant_id);
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

-- 16) STOCK MOVEMENTS
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  type stock_movement_type NOT NULL,
  qty INT NOT NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  reference TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_mov_item ON public.stock_movements(stock_item_id);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- 17) AUDIT LOG
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  diff JSONB DEFAULT '{}',
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tenant ON public.audit_logs(tenant_id, created_at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTIONS
-- =============================================

-- Check membership in tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant_role(_user_id UUID, _tenant_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_memberships
  WHERE user_id = _user_id AND tenant_id = _tenant_id AND is_active = true
  LIMIT 1;
$$;

-- Check if user is member of tenant
CREATE OR REPLACE FUNCTION public.is_tenant_member(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_memberships
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND is_active = true
  );
$$;

-- Check if user is super_admin in any tenant
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_memberships
    WHERE user_id = _user_id AND role = 'super_admin' AND is_active = true
  );
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- TENANTS: members can read their tenants, super_admin can read all
CREATE POLICY "Members can view their tenants" ON public.tenants
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    public.is_tenant_member(auth.uid(), id)
  );

CREATE POLICY "Super admins can manage tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Members can view profiles of same tenant
CREATE POLICY "Members can view tenant profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_memberships m1
      JOIN public.user_memberships m2 ON m1.tenant_id = m2.tenant_id
      WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id
      AND m1.is_active = true AND m2.is_active = true
    )
  );

-- USER MEMBERSHIPS
CREATE POLICY "Users can view own memberships" ON public.user_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage memberships" ON public.user_memberships
  FOR ALL TO authenticated
  USING (
    public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin')
  )
  WITH CHECK (
    public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin')
  );

-- GENERIC TENANT-SCOPED POLICIES (for units, locations, customers, categories, assets, etc.)
-- Units
CREATE POLICY "Tenant members can view units" ON public.units
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage units" ON public.units
  FOR ALL TO authenticated
  USING (public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'))
  WITH CHECK (public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'));

-- Locations
CREATE POLICY "Tenant members can view locations" ON public.locations
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage locations" ON public.locations
  FOR ALL TO authenticated
  USING (public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'))
  WITH CHECK (public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'));

-- Customers
CREATE POLICY "Tenant members can view customers" ON public.customers
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage customers" ON public.customers
  FOR ALL TO authenticated
  USING (public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'))
  WITH CHECK (public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'));

-- Categories
CREATE POLICY "Tenant members can view categories" ON public.categories
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'))
  WITH CHECK (public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'));

-- Assets
CREATE POLICY "Tenant members can view assets" ON public.assets
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage assets" ON public.assets
  FOR ALL TO authenticated
  USING (public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'))
  WITH CHECK (public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'));

-- SLA Policies
CREATE POLICY "Tenant members can view sla_policies" ON public.sla_policies
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage sla_policies" ON public.sla_policies
  FOR ALL TO authenticated
  USING (public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin'))
  WITH CHECK (public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin'));

-- Work Orders
CREATE POLICY "Tenant members can view work_orders" ON public.work_orders
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id) AND deleted_at IS NULL);

CREATE POLICY "Members can create work_orders" ON public.work_orders
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Authorized can update work_orders" ON public.work_orders
  FOR UPDATE TO authenticated
  USING (
    public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador', 'tecnico')
    OR assigned_to_id = auth.uid()
  );

-- Work Order Events
CREATE POLICY "Tenant members can view events" ON public.work_order_events
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Members can create events" ON public.work_order_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id));

-- Work Order Attachments
CREATE POLICY "Tenant members can view attachments" ON public.work_order_attachments
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Members can upload attachments" ON public.work_order_attachments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id));

-- Checklist Templates
CREATE POLICY "Tenant members can view checklist_templates" ON public.checklist_templates
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage checklist_templates" ON public.checklist_templates
  FOR ALL TO authenticated
  USING (public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'))
  WITH CHECK (public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'));

-- Work Order Checklist Items
CREATE POLICY "Tenant members can view checklist_items" ON public.work_order_checklist_items
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Authorized can manage checklist_items" ON public.work_order_checklist_items
  FOR ALL TO authenticated
  USING (
    public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador', 'tecnico')
  )
  WITH CHECK (
    public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador', 'tecnico')
  );

-- Stock Items
CREATE POLICY "Tenant members can view stock_items" ON public.stock_items
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage stock_items" ON public.stock_items
  FOR ALL TO authenticated
  USING (public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'))
  WITH CHECK (public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador'));

-- Stock Movements
CREATE POLICY "Tenant members can view stock_movements" ON public.stock_movements
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Authorized can create stock_movements" ON public.stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin', 'coordenador', 'tecnico')
  );

-- Audit Logs (read-only for admins)
CREATE POLICY "Admins can view audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin')
  );

CREATE POLICY "System can insert audit_logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-generate work order code
CREATE OR REPLACE FUNCTION public.generate_work_order_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_num INT;
  year_str TEXT;
BEGIN
  year_str := TO_CHAR(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(code FROM 'OS-\d{4}-(\d+)') AS INT)
  ), 0) + 1
  INTO next_num
  FROM public.work_orders
  WHERE tenant_id = NEW.tenant_id AND code LIKE 'OS-' || year_str || '-%';
  
  NEW.code := 'OS-' || year_str || '-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_wo_code
  BEFORE INSERT ON public.work_orders
  FOR EACH ROW
  WHEN (NEW.code IS NULL OR NEW.code = '')
  EXECUTE FUNCTION public.generate_work_order_code();
