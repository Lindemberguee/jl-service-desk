
-- Create public bucket for tenant logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-logos', 'tenant-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view tenant logos
CREATE POLICY "Public can view tenant logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant-logos');

-- Admins can upload tenant logos
CREATE POLICY "Admins can upload tenant logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tenant-logos' 
  AND is_super_admin(auth.uid())
);

-- Admins can update tenant logos
CREATE POLICY "Admins can update tenant logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tenant-logos' 
  AND is_super_admin(auth.uid())
);

-- Admins can delete tenant logos
CREATE POLICY "Admins can delete tenant logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tenant-logos' 
  AND is_super_admin(auth.uid())
);

-- Also allow admins of specific tenants to manage their own logos
CREATE POLICY "Tenant admins can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tenant-logos'
  AND (
    get_user_tenant_role(auth.uid(), (storage.foldername(name))[1]::uuid) = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
  )
);
