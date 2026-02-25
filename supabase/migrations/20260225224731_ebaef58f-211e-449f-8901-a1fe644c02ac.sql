
-- Create canvas_board_shares table for sharing boards with other users
CREATE TABLE public.canvas_board_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.canvas_boards(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  shared_by UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(board_id, shared_with_user_id)
);

-- Enable RLS
ALTER TABLE public.canvas_board_shares ENABLE ROW LEVEL SECURITY;

-- Owner of the board can manage shares
CREATE POLICY "Board owners can manage shares"
ON public.canvas_board_shares FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.canvas_boards cb
    WHERE cb.id = board_id AND cb.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.canvas_boards cb
    WHERE cb.id = board_id AND cb.user_id = auth.uid()
  )
);

-- Shared users can view their shares
CREATE POLICY "Users can view their shares"
ON public.canvas_board_shares FOR SELECT
USING (shared_with_user_id = auth.uid());

-- Update canvas_boards RLS to allow shared users to view
CREATE POLICY "Shared users can view boards"
ON public.canvas_boards FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.canvas_board_shares cbs
    WHERE cbs.board_id = id AND cbs.shared_with_user_id = auth.uid()
  )
);

-- Shared users with edit permission can update boards
CREATE POLICY "Shared users with edit can update boards"
ON public.canvas_boards FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.canvas_board_shares cbs
    WHERE cbs.board_id = id AND cbs.shared_with_user_id = auth.uid() AND cbs.permission = 'edit'
  )
);

-- Enable realtime for canvas_boards
ALTER PUBLICATION supabase_realtime ADD TABLE public.canvas_boards;
