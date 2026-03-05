
-- Email queue for resilient delivery with retry
CREATE TABLE public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email_type text NOT NULL DEFAULT 'custom',
  to_email text NOT NULL,
  subject text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  last_error text,
  next_retry_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  completed_at timestamptz
);

-- Email send logs for auditing
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  queue_id uuid REFERENCES public.email_queue(id) ON DELETE SET NULL,
  email_type text NOT NULL,
  to_email text NOT NULL,
  subject text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  smtp_host text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_email_queue_status_retry ON public.email_queue(status, next_retry_at) WHERE status IN ('pending', 'retrying');
CREATE INDEX idx_email_queue_tenant ON public.email_queue(tenant_id);
CREATE INDEX idx_email_logs_tenant ON public.email_logs(tenant_id, created_at DESC);
CREATE INDEX idx_email_logs_type ON public.email_logs(email_type);

-- RLS
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view queue and logs
CREATE POLICY "Admins can view email_queue" ON public.email_queue
  FOR SELECT USING (
    get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin')
  );

CREATE POLICY "Admins can view email_logs" ON public.email_logs
  FOR SELECT USING (
    get_user_tenant_role(auth.uid(), tenant_id) IN ('super_admin', 'admin')
  );

-- Service role can manage (for edge functions)
CREATE POLICY "Service can manage email_queue" ON public.email_queue
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service can manage email_logs" ON public.email_logs
  FOR ALL USING (true) WITH CHECK (true);
