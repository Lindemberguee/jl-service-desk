
CREATE OR REPLACE FUNCTION public.update_sidebar_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE IF NOT EXISTS public.sidebar_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  hidden_paths TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

ALTER TABLE public.sidebar_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sidebar preferences"
  ON public.sidebar_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sidebar preferences"
  ON public.sidebar_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sidebar preferences"
  ON public.sidebar_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_sidebar_preferences_updated_at
  BEFORE UPDATE ON public.sidebar_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sidebar_prefs_updated_at();
