
-- Teams notification logs table
CREATE TABLE public.teams_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  notification_type text NOT NULL DEFAULT 'custom',
  webhook_url text,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.teams_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view teams_notification_logs"
  ON public.teams_notification_logs
  FOR SELECT
  TO authenticated
  USING (
    get_user_tenant_role(auth.uid(), tenant_id) = ANY(ARRAY['super_admin'::app_role, 'admin'::app_role])
  );

-- Index for fast queries
CREATE INDEX idx_teams_logs_tenant_created ON public.teams_notification_logs(tenant_id, created_at DESC);
