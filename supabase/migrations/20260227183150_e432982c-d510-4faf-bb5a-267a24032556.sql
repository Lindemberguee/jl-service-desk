
ALTER TABLE public.okr_key_results ADD COLUMN links jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.okr_key_results.links IS 'Array of {label, url} objects for external links/files';
