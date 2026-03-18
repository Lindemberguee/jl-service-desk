
-- Drop the overly permissive SELECT policy
DROP POLICY "Tenant members can view planner_plans" ON public.planner_plans;

-- Create a new policy: team plans visible to all members, personal plans only to creator
CREATE POLICY "Tenant members can view planner_plans"
  ON public.planner_plans FOR SELECT
  USING (
    is_tenant_member(auth.uid(), tenant_id)
    AND (scope = 'team' OR created_by = auth.uid())
  );
