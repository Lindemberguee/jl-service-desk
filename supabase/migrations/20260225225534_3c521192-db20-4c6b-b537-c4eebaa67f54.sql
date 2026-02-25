
-- Fix infinite recursion: remove the policy that references canvas_boards from canvas_board_shares
DROP POLICY IF EXISTS "Board owners can manage shares" ON public.canvas_board_shares;

-- Replace with a policy that uses shared_by (the owner who created the share) instead of querying canvas_boards
CREATE POLICY "Board owners can manage shares"
ON public.canvas_board_shares FOR ALL
USING (shared_by = auth.uid())
WITH CHECK (shared_by = auth.uid());
