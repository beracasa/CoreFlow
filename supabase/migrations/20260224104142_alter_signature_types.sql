-- Cambiar el tipo de las columnas de firma de BOOLEAN a TEXT para soportar nombres de usuarios
ALTER TABLE IF EXISTS work_orders
ALTER COLUMN signature_executor TYPE TEXT USING signature_executor::TEXT,
ALTER COLUMN signature_supervisor TYPE TEXT USING signature_supervisor::TEXT;
