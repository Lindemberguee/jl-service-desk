
-- Add user_id column as nullable first
ALTER TABLE public.tenant_calendar_settings ADD COLUMN user_id uuid;

-- Delete existing rows (they have no owner, can't assign)
DELETE FROM public.tenant_calendar_settings WHERE user_id IS NULL;

-- Make it NOT NULL
ALTER TABLE public.tenant_calendar_settings ALTER COLUMN user_id SET NOT NULL;

-- Drop existing RLS policies
DROP POLICY "Admins can manage calendar settings" ON public.tenant_calendar_settings;
DROP POLICY "Tenant members can read calendar settings" ON public.tenant_calendar_settings;

-- New RLS: users can only see/manage their own calendar settings
CREATE POLICY "Users can manage own calendar settings"
  ON public.tenant_calendar_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
