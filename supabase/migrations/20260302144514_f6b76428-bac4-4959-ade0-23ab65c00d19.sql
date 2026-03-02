
-- Tabela de API Keys por tenant
CREATE TABLE public.tenant_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default',
  key_hash text NOT NULL,
  key_prefix text NOT NULL, -- primeiros 8 chars para identificação visual
  permissions text[] NOT NULL DEFAULT ARRAY['read']::text[], -- 'read', 'write', 'delete'
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para busca por hash (autenticação)
CREATE INDEX idx_tenant_api_keys_hash ON public.tenant_api_keys(key_hash);
CREATE INDEX idx_tenant_api_keys_tenant ON public.tenant_api_keys(tenant_id);

-- Enable RLS
ALTER TABLE public.tenant_api_keys ENABLE ROW LEVEL SECURITY;

-- Apenas admins do tenant podem gerenciar API keys
CREATE POLICY "Admins can manage api_keys"
  ON public.tenant_api_keys
  FOR ALL
  USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin'))
  WITH CHECK (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin'));

-- Membros podem visualizar (sem o hash)
CREATE POLICY "Tenant members can view api_keys"
  ON public.tenant_api_keys
  FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

-- Tabela de log de uso da API
CREATE TABLE public.api_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES public.tenant_api_keys(id) ON DELETE SET NULL,
  method text NOT NULL,
  path text NOT NULL,
  status_code integer NOT NULL,
  response_time_ms integer,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_request_logs_tenant ON public.api_request_logs(tenant_id, created_at DESC);

ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view api_logs"
  ON public.api_request_logs
  FOR SELECT
  USING (get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin'));

CREATE POLICY "System can insert api_logs"
  ON public.api_request_logs
  FOR INSERT
  WITH CHECK (true);
