
-- Drop the header-based policy (won't work for anonymous page loads)
DROP POLICY IF EXISTS "Anyone can view boards with public token" ON public.canvas_boards;
