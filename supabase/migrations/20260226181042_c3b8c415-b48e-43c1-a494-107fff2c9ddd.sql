
-- Add public share token to canvas_boards
ALTER TABLE public.canvas_boards
ADD COLUMN public_share_token TEXT UNIQUE DEFAULT NULL;

-- Create index for fast lookup
CREATE INDEX idx_canvas_boards_public_share_token ON public.canvas_boards(public_share_token) WHERE public_share_token IS NOT NULL;

-- Allow anonymous SELECT via public share token (no auth required)
CREATE POLICY "Anyone can view boards with public token"
ON public.canvas_boards
FOR SELECT
USING (public_share_token IS NOT NULL AND public_share_token = current_setting('request.headers', true)::json->>'x-public-token');
