
-- Add target_roles JSONB to both settings tables
ALTER TABLE public.tenant_smtp_settings 
ADD COLUMN IF NOT EXISTS target_roles jsonb NOT NULL DEFAULT '{
  "os_created": ["super_admin", "admin", "coordenador", "tecnico"],
  "os_status_changed": ["super_admin", "admin", "coordenador", "tecnico", "solicitante"],
  "stock_critical": ["super_admin", "admin", "coordenador", "analista"],
  "new_user": ["super_admin", "admin"],
  "maintenance": ["super_admin", "admin", "coordenador", "tecnico"],
  "sla_warning": ["super_admin", "admin", "coordenador"]
}'::jsonb;

ALTER TABLE public.tenant_teams_settings 
ADD COLUMN IF NOT EXISTS target_roles jsonb NOT NULL DEFAULT '{
  "os_created": ["super_admin", "admin", "coordenador", "tecnico"],
  "os_status_changed": ["super_admin", "admin", "coordenador", "tecnico"],
  "stock_critical": ["super_admin", "admin", "coordenador", "analista"],
  "new_user": ["super_admin", "admin"],
  "maintenance": ["super_admin", "admin", "coordenador", "tecnico"],
  "sla_warning": ["super_admin", "admin", "coordenador"]
}'::jsonb;

-- Update notify_stock_min_level to respect target_roles from SMTP settings
CREATE OR REPLACE FUNCTION public.notify_stock_min_level()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_record RECORD;
  _admin_email TEXT;
  _inserted_rows INTEGER := 0;
  _teams_sent BOOLEAN := false;
  _smtp_target_roles TEXT[];
  _default_roles TEXT[] := ARRAY['super_admin', 'admin', 'coordenador', 'analista'];
BEGIN
  IF NEW.current_level <= NEW.min_level AND (OLD.current_level > OLD.min_level OR OLD.current_level IS NULL) THEN
    -- Get target roles from SMTP settings
    SELECT COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(target_roles->'stock_critical')),
      _default_roles
    ) INTO _smtp_target_roles
    FROM public.tenant_smtp_settings
    WHERE tenant_id = NEW.tenant_id AND is_active = true;

    IF _smtp_target_roles IS NULL THEN
      _smtp_target_roles := _default_roles;
    END IF;

    FOR admin_record IN
      SELECT user_id, role::text as role_text
      FROM public.user_memberships
      WHERE tenant_id = NEW.tenant_id
        AND is_active = true
        AND role::text = ANY(_smtp_target_roles)
    LOOP
      INSERT INTO public.notifications (user_id, tenant_id, type, title, body, icon, link, metadata)
      SELECT
        admin_record.user_id,
        NEW.tenant_id,
        'stock',
        'Estoque em nível crítico',
        'O item "' || LEFT(NEW.name, 60) || '" atingiu o nível mínimo (' || NEW.current_level || '/' || NEW.min_level || ').',
        '📦',
        '/estoque',
        jsonb_build_object(
          'action', 'stock_critical',
          'stock_item_id', NEW.id,
          'item_name', NEW.name,
          'current_level', NEW.current_level,
          'min_level', NEW.min_level
        )
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id = admin_record.user_id
          AND n.tenant_id = NEW.tenant_id
          AND n.type = 'stock'
          AND n.metadata @> jsonb_build_object(
            'action', 'stock_critical',
            'stock_item_id', NEW.id,
            'current_level', NEW.current_level
          )
          AND n.created_at > now() - interval '15 seconds'
      );

      GET DIAGNOSTICS _inserted_rows = ROW_COUNT;

      IF _inserted_rows > 0 THEN
        SELECT email INTO _admin_email FROM public.profiles WHERE id = admin_record.user_id;
        IF _admin_email IS NOT NULL AND _admin_email <> '' THEN
          PERFORM public.send_smtp_email_async(
            NEW.tenant_id,
            'stock_critical',
            _admin_email,
            jsonb_build_object(
              'item_name', NEW.name,
              'current_level', NEW.current_level,
              'min_level', NEW.min_level
            )
          );
        END IF;

        IF NOT _teams_sent THEN
          PERFORM public.send_teams_notification_async(
            NEW.tenant_id,
            'stock_critical',
            jsonb_build_object(
              'item_name', NEW.name,
              'current_level', NEW.current_level,
              'min_level', NEW.min_level
            )
          );
          _teams_sent := true;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Update notify_new_user_added to respect target_roles
CREATE OR REPLACE FUNCTION public.notify_new_user_added()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _new_user_name TEXT;
  _new_user_email TEXT;
  _admin RECORD;
  _admin_email TEXT;
  _target_roles TEXT[];
  _default_roles TEXT[] := ARRAY['super_admin', 'admin'];
BEGIN
  SELECT name, email INTO _new_user_name, _new_user_email
  FROM public.profiles WHERE id = NEW.user_id;

  _new_user_name := COALESCE(_new_user_name, 'Novo usuário');
  _new_user_email := COALESCE(_new_user_email, '');

  -- Get target roles from SMTP settings
  SELECT COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(target_roles->'new_user')),
    _default_roles
  ) INTO _target_roles
  FROM public.tenant_smtp_settings
  WHERE tenant_id = NEW.tenant_id AND is_active = true;

  IF _target_roles IS NULL THEN
    _target_roles := _default_roles;
  END IF;

  FOR _admin IN
    SELECT user_id FROM public.user_memberships
    WHERE tenant_id = NEW.tenant_id
      AND is_active = true
      AND role::text = ANY(_target_roles)
      AND user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, tenant_id, type, title, body, icon, link, metadata)
    VALUES (
      _admin.user_id,
      NEW.tenant_id,
      'system',
      'Novo usuário cadastrado',
      _new_user_name || ' (' || _new_user_email || ') foi adicionado ao departamento.',
      '👤',
      '/admin/usuarios',
      jsonb_build_object('action', 'new_user', 'new_user_id', NEW.user_id, 'new_user_name', _new_user_name)
    );

    SELECT email INTO _admin_email FROM public.profiles WHERE id = _admin.user_id;
    IF _admin_email IS NOT NULL AND _admin_email != '' THEN
      PERFORM public.send_smtp_email_async(
        NEW.tenant_id,
        'new_user',
        _admin_email,
        jsonb_build_object('user_name', _new_user_name, 'user_email', _new_user_email, 'role', NEW.role::text)
      );
    END IF;
  END LOOP;

  PERFORM public.send_teams_notification_async(
    NEW.tenant_id,
    'new_user',
    jsonb_build_object('user_name', _new_user_name, 'user_email', _new_user_email, 'role', NEW.role::text)
  );

  RETURN NEW;
END;
$function$;
