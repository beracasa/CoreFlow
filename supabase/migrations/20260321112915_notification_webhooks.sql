-- =============================================================================
-- Migration: Webhooks triggers via pg_net
-- Description: Configures pg_net extension and assigns the Database Triggers
-- =============================================================================

-- 1. Habilitar extensión pg_net si no existe
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Crear Función Disparadora (Trigger Function)
CREATE OR REPLACE FUNCTION send_email_notification_webhook()
RETURNS trigger AS $$
DECLARE
  -- ¡IMPORTANTE! Reemplazar [TU-PROYECTO] con tu subdominio de Supabase
  edge_function_url TEXT := 'https://[TU-PROYECTO].supabase.co/functions/v1/send-email-notification';
  
  -- ¡IMPORTANTE! Reemplazar [SUPABASE_ANON_KEY] con tu respectivo Anon / Public Key
  anon_key TEXT := '[SUPABASE_ANON_KEY]'; 
  
  payload JSONB;
BEGIN
  -- Empaquetamos el body asegurando que incluimos type (UPDATE/INSERT), table y record
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', row_to_json(NEW)
  );

  -- Enviamos HTTP POST asíncrono
  PERFORM net.http_post(
    url := edge_function_url,
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear Trigger en la tabla work_orders
DROP TRIGGER IF EXISTS trigger_work_orders_notification ON public.work_orders;
CREATE TRIGGER trigger_work_orders_notification
  AFTER INSERT ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION send_email_notification_webhook();

-- 4. Crear Trigger en la tabla spare_parts
DROP TRIGGER IF EXISTS trigger_spare_parts_notification ON public.spare_parts;
CREATE TRIGGER trigger_spare_parts_notification
  AFTER UPDATE ON public.spare_parts
  FOR EACH ROW
  EXECUTE FUNCTION send_email_notification_webhook();
