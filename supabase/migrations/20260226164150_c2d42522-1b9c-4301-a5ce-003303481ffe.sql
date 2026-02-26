
-- Fix broken RLS policies for shared canvas boards
-- The bug: cbs.board_id = cbs.id (compares columns from same table)
-- The fix: cbs.board_id = canvas_boards.id (compares with parent table)

DROP POLICY IF EXISTS "Shared users can view boards" ON public.canvas_boards;
CREATE POLICY "Shared users can view boards"
ON public.canvas_boards
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.canvas_board_shares cbs
    WHERE cbs.board_id = canvas_boards.id
      AND cbs.shared_with_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Shared users with edit can update boards" ON public.canvas_boards;
CREATE POLICY "Shared users with edit can update boards"
ON public.canvas_boards
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.canvas_board_shares cbs
    WHERE cbs.board_id = canvas_boards.id
      AND cbs.shared_with_user_id = auth.uid()
      AND cbs.permission = 'edit'
  )
);
