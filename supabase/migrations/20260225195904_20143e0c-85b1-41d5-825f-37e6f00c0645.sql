
-- Create canvas_boards table for storing user canvas data
CREATE TABLE public.canvas_boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Novo Canvas',
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.canvas_boards ENABLE ROW LEVEL SECURITY;

-- Users can view their own boards
CREATE POLICY "Users can view own canvas boards"
ON public.canvas_boards
FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own boards
CREATE POLICY "Users can create own canvas boards"
ON public.canvas_boards
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own boards
CREATE POLICY "Users can update own canvas boards"
ON public.canvas_boards
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own boards
CREATE POLICY "Users can delete own canvas boards"
ON public.canvas_boards
FOR DELETE
USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_canvas_boards_updated_at
BEFORE UPDATE ON public.canvas_boards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
