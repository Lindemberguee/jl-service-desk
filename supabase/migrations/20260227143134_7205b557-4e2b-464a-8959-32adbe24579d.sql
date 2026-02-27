
-- Create collaborators table
CREATE TABLE public.collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  full_name TEXT NOT NULL,
  matricula TEXT,
  phone TEXT,
  email TEXT,
  custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Tenant members can view collaborators"
ON public.collaborators FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Authorized can manage collaborators"
ON public.collaborators FOR ALL
USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'analista'::app_role]))
WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role, 'analista'::app_role]));

-- Add collaborator_id to assets
ALTER TABLE public.assets ADD COLUMN collaborator_id UUID REFERENCES public.collaborators(id);

-- Trigger for updated_at
CREATE TRIGGER update_collaborators_updated_at
BEFORE UPDATE ON public.collaborators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Index
CREATE INDEX idx_collaborators_tenant ON public.collaborators(tenant_id);
CREATE INDEX idx_collaborators_matricula ON public.collaborators(tenant_id, matricula);
CREATE INDEX idx_assets_collaborator ON public.assets(collaborator_id);
