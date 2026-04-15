
CREATE TABLE public.user_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  permission text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE(user_id, tenant_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user_permissions"
  ON public.user_permissions FOR ALL
  USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role]))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role]));

CREATE POLICY "Users can view own user_permissions"
  ON public.user_permissions FOR SELECT
  USING (user_id = auth.uid());

CREATE INDEX idx_user_permissions_user_tenant ON public.user_permissions(user_id, tenant_id);
