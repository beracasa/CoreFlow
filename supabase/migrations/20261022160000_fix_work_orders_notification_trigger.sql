-- Migration: 20261022160000_fix_work_orders_notification_trigger.sql
-- Fix work orders email notification triggers for R-MANT-02 and R-MANT-05

-- 1. Remove duplicate webhook trigger
DROP TRIGGER IF EXISTS "enviar_alerta_correctivo" ON "public"."work_orders";

-- 2. Update notification function to trigger when an order is requested
CREATE OR REPLACE FUNCTION "public"."send_email_notification_webhook"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  edge_function_url TEXT := 'https://eujtldssxdafrlhllnto.supabase.co/functions/v1/send-email-notification';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1anRsZHNzeGRhZnJsaGxsbnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODA5MTEsImV4cCI6MjA4NTk1NjkxMX0.yzsR6cycFoONceJJY0jdWAl7pdFGlhgZSEFzIvGOGeY'; 
  payload JSONB;
BEGIN
  -- Solo disparar si la orden pasa a estado REQUESTED (Solicitud de Mantenimiento creada)
  -- 1) En INSERT: Si se crea directamente en REQUESTED
  -- 2) En UPDATE: Si se actualiza desde DRAFT (u otro estado) hacia REQUESTED
  IF (TG_OP = 'INSERT' AND NEW.current_stage = 'REQUESTED') OR
     (TG_OP = 'UPDATE' AND (OLD.current_stage IS DISTINCT FROM 'REQUESTED') AND NEW.current_stage = 'REQUESTED') THEN

    payload := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW)
    );

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

-- 3. Recreate the trigger for both INSERT and UPDATE
DROP TRIGGER IF EXISTS "trigger_work_orders_notification" ON "public"."work_orders";

CREATE TRIGGER "trigger_work_orders_notification"
AFTER INSERT OR UPDATE ON "public"."work_orders"
FOR EACH ROW EXECUTE FUNCTION "public"."send_email_notification_webhook"();
