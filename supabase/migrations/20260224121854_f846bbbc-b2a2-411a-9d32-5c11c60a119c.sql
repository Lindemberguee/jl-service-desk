
-- Table for labor cost items on work orders
CREATE TABLE public.work_order_labor_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  hours NUMERIC NOT NULL DEFAULT 0,
  rate_per_hour NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC GENERATED ALWAYS AS (hours * rate_per_hour) STORED,
  observation TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.work_order_labor_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view labor items"
ON public.work_order_labor_items FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Authorized can manage labor items"
ON public.work_order_labor_items FOR ALL
USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role]))
WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role]));

-- Table for part cost items on work orders
CREATE TABLE public.work_order_part_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  stock_item_id UUID REFERENCES public.stock_items(id),
  description TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC GENERATED ALWAYS AS (qty * unit_price) STORED,
  observation TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.work_order_part_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view part items"
ON public.work_order_part_items FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Authorized can manage part items"
ON public.work_order_part_items FOR ALL
USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role]))
WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'tecnico'::app_role]));

-- Function to recalculate work order costs
CREATE OR REPLACE FUNCTION public.recalc_work_order_costs()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  _wo_id UUID;
  _labor NUMERIC;
  _parts NUMERIC;
BEGIN
  IF TG_TABLE_NAME = 'work_order_labor_items' THEN
    _wo_id := COALESCE(NEW.work_order_id, OLD.work_order_id);
  ELSE
    _wo_id := COALESCE(NEW.work_order_id, OLD.work_order_id);
  END IF;

  SELECT COALESCE(SUM(hours * rate_per_hour), 0) INTO _labor
  FROM public.work_order_labor_items WHERE work_order_id = _wo_id;

  SELECT COALESCE(SUM(qty * unit_price), 0) INTO _parts
  FROM public.work_order_part_items WHERE work_order_id = _wo_id;

  UPDATE public.work_orders 
  SET labor_cost = _labor, parts_cost = _parts, total_cost = _labor + _parts
  WHERE id = _wo_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER recalc_costs_labor
AFTER INSERT OR UPDATE OR DELETE ON public.work_order_labor_items
FOR EACH ROW EXECUTE FUNCTION public.recalc_work_order_costs();

CREATE TRIGGER recalc_costs_parts
AFTER INSERT OR UPDATE OR DELETE ON public.work_order_part_items
FOR EACH ROW EXECUTE FUNCTION public.recalc_work_order_costs();
