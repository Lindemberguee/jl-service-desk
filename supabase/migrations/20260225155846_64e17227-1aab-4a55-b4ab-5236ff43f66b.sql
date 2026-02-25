
-- Seed role_permissions for analista
INSERT INTO public.role_permissions (role, permission, granted) VALUES
  ('analista', 'os:read', true),
  ('analista', 'os:create', true),
  ('analista', 'os:update', false),
  ('analista', 'os:assign', false),
  ('analista', 'os:close', false),
  ('analista', 'os:manage', false),
  ('analista', 'assets:read', true),
  ('analista', 'assets:manage', false),
  ('analista', 'stock:read', true),
  ('analista', 'stock:manage', false),
  ('analista', 'users:read', false),
  ('analista', 'users:manage', false),
  ('analista', 'reports:read', true),
  ('analista', 'settings:manage', false),
  ('analista', 'cadastros:read', true),
  ('analista', 'cadastros:manage', false),
  ('analista', 'tools:read', false)
ON CONFLICT (role, permission) DO NOTHING;

-- Add new permissions for ALL roles
INSERT INTO public.role_permissions (role, permission, granted) VALUES
  ('super_admin', 'materiais:read', true), ('super_admin', 'materiais:manage', true),
  ('admin', 'materiais:read', true), ('admin', 'materiais:manage', true),
  ('coordenador', 'materiais:read', true), ('coordenador', 'materiais:manage', true),
  ('tecnico', 'materiais:read', true), ('tecnico', 'materiais:manage', false),
  ('solicitante', 'materiais:read', false), ('solicitante', 'materiais:manage', false),
  ('leitura', 'materiais:read', false), ('leitura', 'materiais:manage', false),
  ('analista', 'materiais:read', true), ('analista', 'materiais:manage', false),
  ('super_admin', 'dashboard:read', true), ('admin', 'dashboard:read', true),
  ('coordenador', 'dashboard:read', true), ('tecnico', 'dashboard:read', true),
  ('solicitante', 'dashboard:read', false), ('leitura', 'dashboard:read', true),
  ('analista', 'dashboard:read', true),
  ('super_admin', 'os:comment', true), ('admin', 'os:comment', true),
  ('coordenador', 'os:comment', true), ('tecnico', 'os:comment', true),
  ('solicitante', 'os:comment', true), ('leitura', 'os:comment', false),
  ('analista', 'os:comment', true)
ON CONFLICT (role, permission) DO NOTHING;
