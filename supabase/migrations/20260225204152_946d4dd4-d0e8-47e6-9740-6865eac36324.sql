
-- Add granular tool permissions for all roles
INSERT INTO public.role_permissions (role, permission, granted)
SELECT r.role, p.permission, 
  CASE 
    WHEN r.role IN ('super_admin', 'admin') THEN true
    WHEN r.role IN ('coordenador') THEN true
    WHEN r.role IN ('tecnico', 'analista') THEN true
    ELSE false
  END
FROM 
  (VALUES ('super_admin'::app_role), ('admin'::app_role), ('coordenador'::app_role), ('tecnico'::app_role), ('analista'::app_role), ('solicitante'::app_role), ('leitura'::app_role)) AS r(role),
  (VALUES ('tools:canvas'), ('tools:notes'), ('tools:reminders'), ('tools:calendar')) AS p(permission)
ON CONFLICT DO NOTHING;
