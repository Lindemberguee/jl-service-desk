
-- =============================================
-- MODULE: Documentos & Cofre de Senhas & Base de Conhecimento
-- =============================================

-- 1. DOCUMENTS (Biblioteca de Documentos)
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  folder TEXT NOT NULL DEFAULT 'Geral',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  file_name TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT DEFAULT '',
  storage_key TEXT,
  category TEXT DEFAULT 'Geral',
  tags TEXT[] DEFAULT '{}',
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT false,
  current_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view documents"
  ON public.documents FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Authorized can manage documents"
  ON public.documents FOR ALL
  USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin','admin','coordenador','tecnico','analista'))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin','admin','coordenador','tecnico','analista'));

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. DOCUMENT VERSIONS (Versionamento)
CREATE TABLE public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  version_number INTEGER NOT NULL DEFAULT 1,
  file_name TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT DEFAULT '',
  storage_key TEXT,
  change_notes TEXT DEFAULT '',
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view document_versions"
  ON public.document_versions FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Authorized can manage document_versions"
  ON public.document_versions FOR ALL
  USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin','admin','coordenador','tecnico','analista'))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin','admin','coordenador','tecnico','analista'));

-- 3. VAULT ENTRIES (Cofre de Senhas - dados criptografados via Edge Function)
CREATE TABLE public.vault_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  service_name TEXT DEFAULT '',
  url TEXT DEFAULT '',
  username_encrypted TEXT DEFAULT '',
  password_encrypted TEXT DEFAULT '',
  notes_encrypted TEXT DEFAULT '',
  category TEXT DEFAULT 'Geral',
  tags TEXT[] DEFAULT '{}',
  last_rotated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized can view vault_entries"
  ON public.vault_entries FOR SELECT
  USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin','admin','coordenador','tecnico','analista'));

CREATE POLICY "Authorized can manage vault_entries"
  ON public.vault_entries FOR ALL
  USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin','admin','coordenador','tecnico','analista'))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin','admin','coordenador','tecnico','analista'));

CREATE TRIGGER update_vault_entries_updated_at
  BEFORE UPDATE ON public.vault_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. VAULT ACCESS LOGS (Auditoria de acesso ao cofre)
CREATE TABLE public.vault_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  vault_entry_id UUID NOT NULL REFERENCES public.vault_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL DEFAULT 'view',
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view vault_access_logs"
  ON public.vault_access_logs FOR SELECT
  USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin','admin'));

CREATE POLICY "Authenticated can insert vault_access_logs"
  ON public.vault_access_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 5. KNOWLEDGE ARTICLES (Base de Conhecimento)
CREATE TABLE public.knowledge_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT 'Geral',
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view published articles"
  ON public.knowledge_articles FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id) AND (is_published = true OR author_id = auth.uid() OR get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin','admin')));

CREATE POLICY "Authorized can manage articles"
  ON public.knowledge_articles FOR ALL
  USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin','admin','coordenador','tecnico','analista'))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin','admin','coordenador','tecnico','analista'));

CREATE TRIGGER update_knowledge_articles_updated_at
  BEFORE UPDATE ON public.knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 6. STORAGE BUCKET for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Tenant members can read documents bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can upload to documents bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update own documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete own documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

-- 7. SEED DEFAULT PERMISSIONS for docs/vault/kb modules
INSERT INTO public.role_permissions (role, permission, granted) VALUES
  ('super_admin', 'docs:read', true), ('super_admin', 'docs:manage', true),
  ('super_admin', 'vault:read', true), ('super_admin', 'vault:manage', true),
  ('super_admin', 'kb:read', true), ('super_admin', 'kb:manage', true),
  ('admin', 'docs:read', true), ('admin', 'docs:manage', true),
  ('admin', 'vault:read', true), ('admin', 'vault:manage', true),
  ('admin', 'kb:read', true), ('admin', 'kb:manage', true),
  ('coordenador', 'docs:read', true), ('coordenador', 'docs:manage', true),
  ('coordenador', 'vault:read', true), ('coordenador', 'vault:manage', true),
  ('coordenador', 'kb:read', true), ('coordenador', 'kb:manage', true),
  ('tecnico', 'docs:read', true), ('tecnico', 'docs:manage', false),
  ('tecnico', 'vault:read', true), ('tecnico', 'vault:manage', false),
  ('tecnico', 'kb:read', true), ('tecnico', 'kb:manage', false),
  ('analista', 'docs:read', true), ('analista', 'docs:manage', true),
  ('analista', 'vault:read', true), ('analista', 'vault:manage', false),
  ('analista', 'kb:read', true), ('analista', 'kb:manage', false)
ON CONFLICT DO NOTHING;
