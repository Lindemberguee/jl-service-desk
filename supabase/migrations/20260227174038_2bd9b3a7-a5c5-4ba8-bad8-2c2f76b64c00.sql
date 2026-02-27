
-- Trigger function: When a KPI entry is inserted, auto-update linked Key Results and recalculate Objective progress
CREATE OR REPLACE FUNCTION public.sync_kpi_to_okr()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  kr_record RECORD;
  obj_record RECORD;
  avg_progress NUMERIC;
BEGIN
  -- Find all Key Results linked to this KPI
  FOR kr_record IN
    SELECT id, objective_id, start_value, target_value
    FROM public.okr_key_results
    WHERE kpi_id = NEW.kpi_id AND tenant_id = NEW.tenant_id
  LOOP
    -- Update KR current_value with the latest KPI value
    UPDATE public.okr_key_results
    SET current_value = NEW.value, updated_at = now()
    WHERE id = kr_record.id;

    -- Recalculate objective progress as average of all KRs
    SELECT AVG(
      CASE 
        WHEN (target_value - start_value) = 0 THEN 0
        ELSE LEAST(((current_value - start_value) / (target_value - start_value)) * 100, 100)
      END
    ) INTO avg_progress
    FROM public.okr_key_results
    WHERE objective_id = kr_record.objective_id;

    UPDATE public.okr_objectives
    SET progress = COALESCE(avg_progress, 0), updated_at = now()
    WHERE id = kr_record.objective_id;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_kpi_to_okr
AFTER INSERT ON public.kpi_entries
FOR EACH ROW
EXECUTE FUNCTION public.sync_kpi_to_okr();

-- Trigger function: Alert when KPI crosses warning/critical thresholds
CREATE OR REPLACE FUNCTION public.check_kpi_thresholds()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  kpi_record RECORD;
  admin_record RECORD;
  alert_level TEXT;
  alert_icon TEXT;
  linked_okr_info TEXT;
BEGIN
  -- Get KPI details
  SELECT * INTO kpi_record FROM public.kpis WHERE id = NEW.kpi_id;
  IF kpi_record IS NULL THEN RETURN NEW; END IF;

  -- Determine alert level based on direction
  alert_level := NULL;
  IF kpi_record.direction = 'higher_is_better' THEN
    IF kpi_record.critical_threshold IS NOT NULL AND NEW.value <= kpi_record.critical_threshold THEN
      alert_level := 'critical';
    ELSIF kpi_record.warning_threshold IS NOT NULL AND NEW.value <= kpi_record.warning_threshold THEN
      alert_level := 'warning';
    END IF;
  ELSIF kpi_record.direction = 'lower_is_better' THEN
    IF kpi_record.critical_threshold IS NOT NULL AND NEW.value >= kpi_record.critical_threshold THEN
      alert_level := 'critical';
    ELSIF kpi_record.warning_threshold IS NOT NULL AND NEW.value >= kpi_record.warning_threshold THEN
      alert_level := 'warning';
    END IF;
  ELSIF kpi_record.direction = 'target_is_best' THEN
    IF kpi_record.critical_threshold IS NOT NULL AND ABS(NEW.value - kpi_record.target_value) >= kpi_record.critical_threshold THEN
      alert_level := 'critical';
    ELSIF kpi_record.warning_threshold IS NOT NULL AND ABS(NEW.value - kpi_record.target_value) >= kpi_record.warning_threshold THEN
      alert_level := 'warning';
    END IF;
  END IF;

  IF alert_level IS NULL THEN RETURN NEW; END IF;

  alert_icon := CASE alert_level WHEN 'critical' THEN '🔴' ELSE '⚠️' END;

  -- Check for linked OKRs
  SELECT string_agg(o.title, ', ') INTO linked_okr_info
  FROM public.okr_key_results kr
  JOIN public.okr_objectives o ON o.id = kr.objective_id
  WHERE kr.kpi_id = NEW.kpi_id AND kr.tenant_id = NEW.tenant_id;

  -- Notify admins/coordinators
  FOR admin_record IN
    SELECT user_id FROM public.user_memberships
    WHERE tenant_id = NEW.tenant_id
      AND is_active = true
      AND role IN ('super_admin', 'admin', 'coordenador')
  LOOP
    INSERT INTO public.notifications (user_id, tenant_id, type, title, body, icon, link, metadata)
    VALUES (
      admin_record.user_id,
      NEW.tenant_id,
      'kpi_alert',
      CASE alert_level WHEN 'critical' THEN 'KPI em nível CRÍTICO' ELSE 'KPI em nível de ALERTA' END,
      'O indicador "' || kpi_record.name || '" registrou ' || NEW.value || ' ' || kpi_record.unit || 
      ' (meta: ' || kpi_record.target_value || ').' ||
      CASE WHEN linked_okr_info IS NOT NULL THEN ' Impacta OKR: ' || LEFT(linked_okr_info, 100) ELSE '' END,
      alert_icon,
      '/kpis',
      jsonb_build_object('kpi_id', NEW.kpi_id, 'kpi_name', kpi_record.name, 'value', NEW.value, 'alert_level', alert_level, 'linked_okrs', COALESCE(linked_okr_info, ''))
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_kpi_thresholds
AFTER INSERT ON public.kpi_entries
FOR EACH ROW
EXECUTE FUNCTION public.check_kpi_thresholds();
