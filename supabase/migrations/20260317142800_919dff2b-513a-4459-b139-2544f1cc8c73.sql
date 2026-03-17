
-- Add links and attachments columns to planner_tasks
ALTER TABLE public.planner_tasks
  ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Create storage bucket for planner attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('planner-attachments', 'planner-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload
CREATE POLICY "Authenticated can upload planner attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'planner-attachments');

-- Storage RLS: authenticated users can read
CREATE POLICY "Authenticated can read planner attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'planner-attachments');

-- Storage RLS: authenticated users can delete their uploads
CREATE POLICY "Authenticated can delete planner attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'planner-attachments');
