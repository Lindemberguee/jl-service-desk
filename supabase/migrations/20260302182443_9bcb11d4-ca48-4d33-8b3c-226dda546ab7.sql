
-- Tabela de categorias configuráveis por módulo
CREATE TABLE public.module_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module TEXT NOT NULL, -- 'library', 'vault', 'knowledge'
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, module, name)
);

ALTER TABLE public.module_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view module_categories"
  ON public.module_categories FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage module_categories"
  ON public.module_categories FOR ALL
  USING (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role, 'coordenador'::app_role]));

-- Seed categorias padrão para CASETI
INSERT INTO public.module_categories (tenant_id, module, name, sort_order)
SELECT t.id, m.module, m.name, m.sort_order
FROM public.tenants t
CROSS JOIN (VALUES
  ('vault', 'Geral', 0), ('vault', 'Servidores', 1), ('vault', 'Rede', 2), ('vault', 'Wi-Fi', 3),
  ('vault', 'Aplicações', 4), ('vault', 'E-mail', 5), ('vault', 'Banco de Dados', 6), ('vault', 'VPN', 7),
  ('vault', 'Cloud', 8), ('vault', 'Outro', 9),
  ('library', 'Geral', 0), ('library', 'Procedimentos', 1), ('library', 'Contratos', 2), ('library', 'Manuais', 3),
  ('library', 'Políticas', 4), ('library', 'Formulários', 5), ('library', 'Relatórios', 6),
  ('knowledge', 'Geral', 0), ('knowledge', 'Infraestrutura', 1), ('knowledge', 'Segurança', 2),
  ('knowledge', 'Rede', 3), ('knowledge', 'Sistemas', 4), ('knowledge', 'Procedimentos', 5), ('knowledge', 'Onboarding', 6)
) AS m(module, name, sort_order)
WHERE t.slug = 'caseti';
