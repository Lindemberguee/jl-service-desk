
-- Add version column for conflict resolution in collaborative editing
ALTER TABLE public.canvas_boards ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
