-- Migration: 20261024220000_add_closed_work_order_notification_trigger.sql
-- Enable webhook notification when a work order is CLOSED (Paso 3 Cierre y Entrega)
-- for both R-MANT-02 and R-MANT-05

CREATE OR REPLACE FUNCTION "public"."send_email_notification_webhook"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  edge_function_url TEXT := 'https://eujtldssxdafrlhllnto.supabase.co/functions/v1/send-email-notification';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1anRsZHNzeGRhZnJsaGxsbnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODA5MTEsImV4cCI6MjA4NTk1NjkxMX0.yzsR6cycFoONceJJY0jdWAl7pdFGlhgZSEFzIvGOGeY'; 
  payload JSONB;
  should_notify BOOLEAN := FALSE;
BEGIN
  IF TG_TABLE_NAME = 'work_orders' THEN
    -- 1) Apertura / Nueva Solicitud (cuando pasa a REQUESTED)
    IF (TG_OP = 'INSERT' AND NEW.current_stage = 'REQUESTED') OR
       (TG_OP = 'UPDATE' AND (OLD.current_stage IS DISTINCT FROM 'REQUESTED') AND NEW.current_stage = 'REQUESTED') THEN
      should_notify := TRUE;
      payload := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'event', 'work_order_requested',
        'record', row_to_json(NEW)
      );

    -- 2) Cierre de Mantenimiento (cuando pasa a CLOSED en el tercer paso de Cierre y Entrega)
    ELSIF (TG_OP = 'INSERT' AND NEW.current_stage = 'CLOSED') OR
          (TG_OP = 'UPDATE' AND (OLD.current_stage IS DISTINCT FROM 'CLOSED') AND NEW.current_stage = 'CLOSED') THEN
      should_notify := TRUE;
      payload := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'event', 'work_order_closed',
        'record', row_to_json(NEW),
        'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
      );
    END IF;

  ELSIF TG_TABLE_NAME = 'spare_parts' THEN
    -- Alerta de Bajo Stock
    IF (TG_OP = 'UPDATE' AND
        COALESCE(NEW.minimum_stock, 0) > 0 AND
        (COALESCE(OLD.current_stock, 0) > COALESCE(NEW.minimum_stock, 0) OR COALESCE(OLD.current_stock, 0) > COALESCE(OLD.minimum_stock, 0)) AND
        COALESCE(NEW.current_stock, 0) <= COALESCE(NEW.minimum_stock, 0)) THEN
      should_notify := TRUE;
      payload := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'event', 'low_stock',
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD)
      );
    END IF;
  END IF;

  IF should_notify THEN
    PERFORM net.http_post(
      url := edge_function_url,
      body := payload,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
