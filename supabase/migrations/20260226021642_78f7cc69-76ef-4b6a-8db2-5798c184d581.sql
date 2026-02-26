
-- Create reminders table
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'critica')),
  category TEXT NOT NULL DEFAULT 'Geral',
  tags TEXT[] NOT NULL DEFAULT '{}',
  due_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  -- Recurrence
  recurrence_type TEXT DEFAULT NULL CHECK (recurrence_type IN (NULL, 'daily', 'weekly', 'monthly', 'yearly')),
  recurrence_interval INTEGER DEFAULT 1,
  recurrence_end_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Users can CRUD own reminders
CREATE POLICY "Users can view own reminders"
  ON public.reminders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own reminders"
  ON public.reminders FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reminders"
  ON public.reminders FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own reminders"
  ON public.reminders FOR DELETE
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_reminders_user_tenant ON public.reminders(user_id, tenant_id);
CREATE INDEX idx_reminders_due_at ON public.reminders(due_at) WHERE is_completed = false;

-- Updated_at trigger
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
