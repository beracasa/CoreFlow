-- =============================================================================
-- Migration: Add Notification Settings & Webhooks
-- Description: Adds JSONB preferences column and triggers for Edge Function
-- =============================================================================

-- 1. Agregamos la columna a profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"work_order_alerts": false, "low_stock_alerts": false, "pending_approvals": false}'::jsonb;

-- 2. Aseguramos que pg_net esté habilitado para los webhooks (HTTP Requests)
-- Nota: La extensión pg_net debe habilitarse en Supabase Dashboard o con:
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Crear función de envío al webhook
-- Sustituir [PROJECT_REF] con la referencia real del proyecto en producción.
CREATE OR REPLACE FUNCTION public.send_notification_webhook()
RETURNS trigger AS $$
DECLARE
  edge_function_url TEXT := 'https://[PROJECT_REF].supabase.co/functions/v1/send-email-notification';
  service_role_key TEXT := current_setting('app.settings.service_role_key', true);
  payload JSONB;
BEGIN
  -- Construir el payload similar al estándar de Supabase
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE null END
  );

  -- Realizar la petición POST
  PERFORM net.http_post(
    url := edge_function_url,
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_role_key, 'YOUR_SERVICE_ROLE_KEY_HERE')
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear Triggers
-- Eliminamos previas versiones si existen por seguridad
DROP TRIGGER IF EXISTS on_work_order_created_notification ON public.work_orders;
DROP TRIGGER IF EXISTS on_spare_part_updated_notification ON public.spare_parts;

-- Trigger para work_orders (Solo After Insert)
CREATE TRIGGER on_work_order_created_notification
  AFTER INSERT ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.send_notification_webhook();

-- Trigger para spare_parts (Solo After Update)
CREATE TRIGGER on_spare_part_updated_notification
  AFTER UPDATE ON public.spare_parts
  FOR EACH ROW
  WHEN (NEW."currentStock" < NEW."minStock" AND OLD."currentStock" >= OLD."minStock")
  EXECUTE FUNCTION public.send_notification_webhook();

