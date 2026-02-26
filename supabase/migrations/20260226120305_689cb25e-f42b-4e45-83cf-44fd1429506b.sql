
-- Create maintenance type enum
CREATE TYPE public.maintenance_type AS ENUM ('preventiva', 'corretiva', 'preditiva', 'instalacao', 'substituicao');
CREATE TYPE public.maintenance_status AS ENUM ('agendada', 'em_andamento', 'concluida', 'cancelada', 'atrasada');

-- Create asset_maintenance_records table
CREATE TABLE public.asset_maintenance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  type maintenance_type NOT NULL DEFAULT 'corretiva',
  status maintenance_status NOT NULL DEFAULT 'agendada',
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  technician_id UUID,
  cost NUMERIC DEFAULT 0,
  parts_used JSONB DEFAULT '[]'::jsonb,
  observations TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create asset_components table to track individual components (CPU, RAM, Monitor, etc.)
CREATE TABLE public.asset_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL, -- cpu, ram, hd, ssd, monitor, mouse, teclado, fonte, placa_mae, etc.
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  specifications JSONB DEFAULT '{}'::jsonb,
  stock_item_id UUID REFERENCES public.stock_items(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ativo', -- ativo, defeito, substituido, descartado
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_components ENABLE ROW LEVEL SECURITY;

-- RLS: Tenant members can view
CREATE POLICY "Tenant members can view maintenance_records"
ON public.asset_maintenance_records FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Authorized can manage maintenance_records"
ON public.asset_maintenance_records FOR ALL
USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role, 'analista'::app_role]))
WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role, 'analista'::app_role]));

CREATE POLICY "Tenant members can view asset_components"
ON public.asset_components FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Authorized can manage asset_components"
ON public.asset_components FOR ALL
USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role, 'analista'::app_role]))
WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role, 'analista'::app_role]));

-- Triggers for updated_at
CREATE TRIGGER update_maintenance_records_updated_at
BEFORE UPDATE ON public.asset_maintenance_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_asset_components_updated_at
BEFORE UPDATE ON public.asset_components
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed maintenance permissions into role_permissions
INSERT INTO public.role_permissions (role, permission, granted) VALUES
  ('super_admin', 'manutencao:read', true),
  ('super_admin', 'manutencao:manage', true),
  ('admin', 'manutencao:read', true),
  ('admin', 'manutencao:manage', true),
  ('coordenador', 'manutencao:read', true),
  ('coordenador', 'manutencao:manage', true),
  ('tecnico', 'manutencao:read', true),
  ('tecnico', 'manutencao:manage', true),
  ('analista', 'manutencao:read', true),
  ('analista', 'manutencao:manage', true),
  ('solicitante', 'manutencao:read', false),
  ('solicitante', 'manutencao:manage', false),
  ('leitura', 'manutencao:read', false),
  ('leitura', 'manutencao:manage', false)
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX idx_maintenance_records_asset ON public.asset_maintenance_records(asset_id);
CREATE INDEX idx_maintenance_records_tenant ON public.asset_maintenance_records(tenant_id);
CREATE INDEX idx_maintenance_records_status ON public.asset_maintenance_records(status);
CREATE INDEX idx_asset_components_asset ON public.asset_components(asset_id);
CREATE INDEX idx_asset_components_tenant ON public.asset_components(tenant_id);
CREATE INDEX idx_asset_components_stock_item ON public.asset_components(stock_item_id);
