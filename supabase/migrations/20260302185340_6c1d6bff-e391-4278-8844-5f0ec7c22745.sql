
-- Enum for disposal reason
CREATE TYPE public.disposal_reason AS ENUM ('queimado', 'obsoleto', 'vencido', 'defeituoso', 'depreciado', 'extravio', 'outro');

-- Enum for disposal status (workflow with confirmation)
CREATE TYPE public.disposal_status AS ENUM ('pendente', 'aprovado', 'rejeitado', 'efetivado');

-- Enum for disposal origin type
CREATE TYPE public.disposal_origin AS ENUM ('estoque', 'ativo', 'manual');

-- Create disposals table
CREATE TABLE public.disposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  origin_type public.disposal_origin NOT NULL DEFAULT 'manual',
  stock_item_id UUID REFERENCES public.stock_items(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  item_description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'un',
  reason public.disposal_reason NOT NULL DEFAULT 'outro',
  reason_detail TEXT,
  category TEXT DEFAULT 'Geral',
  residual_value NUMERIC DEFAULT 0,
  status public.disposal_status NOT NULL DEFAULT 'pendente',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_note TEXT,
  stock_movement_id UUID REFERENCES public.stock_movements(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.disposals ENABLE ROW LEVEL SECURITY;

-- RLS: Tenant members can view
CREATE POLICY "Tenant members can view disposals"
ON public.disposals FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

-- RLS: Authorized roles can manage (insert/update/delete)
CREATE POLICY "Authorized can manage disposals"
ON public.disposals FOR ALL
USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]))
WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]));

-- Trigger for updated_at
CREATE TRIGGER update_disposals_updated_at
BEFORE UPDATE ON public.disposals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Index for performance
CREATE INDEX idx_disposals_tenant ON public.disposals(tenant_id);
CREATE INDEX idx_disposals_status ON public.disposals(status);
CREATE INDEX idx_disposals_stock_item ON public.disposals(stock_item_id) WHERE stock_item_id IS NOT NULL;
CREATE INDEX idx_disposals_asset ON public.disposals(asset_id) WHERE asset_id IS NOT NULL;

-- Storage bucket for disposal attachments (photos/laudos)
INSERT INTO storage.buckets (id, name, public) VALUES ('disposal-attachments', 'disposal-attachments', false);

-- Storage policies
CREATE POLICY "Tenant members can view disposal attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'disposal-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authorized can upload disposal attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'disposal-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authorized can delete disposal attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'disposal-attachments' AND auth.uid() IS NOT NULL);

-- Enable realtime for disposals
ALTER PUBLICATION supabase_realtime ADD TABLE public.disposals;
