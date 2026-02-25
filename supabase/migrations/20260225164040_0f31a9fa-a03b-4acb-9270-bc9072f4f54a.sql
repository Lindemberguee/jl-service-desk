-- Add my_os:read permission for all roles that should have it by default
INSERT INTO public.role_permissions (role, permission, granted)
VALUES
  ('super_admin', 'my_os:read', true),
  ('admin', 'my_os:read', true),
  ('coordenador', 'my_os:read', true),
  ('tecnico', 'my_os:read', true),
  ('analista', 'my_os:read', true)
ON CONFLICT DO NOTHING;