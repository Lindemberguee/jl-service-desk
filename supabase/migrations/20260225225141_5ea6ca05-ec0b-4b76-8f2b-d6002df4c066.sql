
-- Create notes table
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Sem título',
  content TEXT NOT NULL DEFAULT '',
  folder TEXT NOT NULL DEFAULT 'Geral',
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Users can CRUD own notes
CREATE POLICY "Users can view own notes"
ON public.notes FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create own notes"
ON public.notes FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notes"
ON public.notes FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notes"
ON public.notes FOR DELETE
USING (user_id = auth.uid());

-- Index for performance
CREATE INDEX idx_notes_user_tenant ON public.notes(user_id, tenant_id);
CREATE INDEX idx_notes_folder ON public.notes(user_id, tenant_id, folder);
