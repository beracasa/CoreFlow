-- Migration: 20261022234000_add_low_stock_notification_trigger.sql
-- Add low stock email notifications trigger for spare parts & preserve work orders trigger

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
    -- Solo disparar si la orden pasa a estado REQUESTED (Solicitud de Mantenimiento creada)
    -- 1) En INSERT: Si se crea directamente en REQUESTED
    -- 2) En UPDATE: Si se actualiza desde DRAFT (u otro estado) hacia REQUESTED
    IF (TG_OP = 'INSERT' AND NEW.current_stage = 'REQUESTED') OR
       (TG_OP = 'UPDATE' AND (OLD.current_stage IS DISTINCT FROM 'REQUESTED') AND NEW.current_stage = 'REQUESTED') THEN
      should_notify := TRUE;
      payload := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'record', row_to_json(NEW)
      );
    END IF;

  ELSIF TG_TABLE_NAME = 'spare_parts' THEN
    -- Solo disparar si el repuesto cae en su stock mínimo o por debajo del mínimo
    -- Condición: 
    -- 1) Tiene stock mínimo configurado (> 0)
    -- 2) Antes estaba por encima del mínimo (OLD > min_stock)
    -- 3) Ahora está en su mínimo o por debajo (NEW <= min_stock)
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

-- Ensure triggers exist and point to send_email_notification_webhook
DROP TRIGGER IF EXISTS "trigger_spare_parts_notification" ON "public"."spare_parts";

CREATE TRIGGER "trigger_spare_parts_notification"
AFTER UPDATE ON "public"."spare_parts"
FOR EACH ROW EXECUTE FUNCTION "public"."send_email_notification_webhook"();

DROP TRIGGER IF EXISTS "trigger_work_orders_notification" ON "public"."work_orders";

CREATE TRIGGER "trigger_work_orders_notification"
AFTER INSERT OR UPDATE ON "public"."work_orders"
FOR EACH ROW EXECUTE FUNCTION "public"."send_email_notification_webhook"();
