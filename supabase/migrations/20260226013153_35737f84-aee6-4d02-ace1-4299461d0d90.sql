
-- Create table for sharing notes within same tenant
CREATE TABLE public.note_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(note_id, shared_with_user_id)
);

ALTER TABLE public.note_shares ENABLE ROW LEVEL SECURITY;

-- Members of the same tenant can see shares
CREATE POLICY "Tenant members can view note shares"
  ON public.note_shares FOR SELECT
  USING (public.is_tenant_member(tenant_id, auth.uid()));

-- Note owner can manage shares
CREATE POLICY "Note owner can insert shares"
  ON public.note_shares FOR INSERT
  WITH CHECK (
    shared_by = auth.uid()
    AND public.is_tenant_member(tenant_id, auth.uid())
  );

CREATE POLICY "Note owner can delete shares"
  ON public.note_shares FOR DELETE
  USING (shared_by = auth.uid());

CREATE POLICY "Note owner can update shares"
  ON public.note_shares FOR UPDATE
  USING (shared_by = auth.uid());

-- Add editor_mode column to notes for markdown/richtext toggle
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS editor_mode TEXT NOT NULL DEFAULT 'richtext';

-- Allow shared users to read shared notes
CREATE POLICY "Users can view notes shared with them"
  ON public.notes FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.note_shares ns
      WHERE ns.note_id = id AND ns.shared_with_user_id = auth.uid()
    )
  );

-- Allow shared users with edit permission to update shared notes
CREATE POLICY "Shared users with edit can update notes"
  ON public.notes FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.note_shares ns
      WHERE ns.note_id = id AND ns.shared_with_user_id = auth.uid() AND ns.permission = 'edit'
    )
  );
