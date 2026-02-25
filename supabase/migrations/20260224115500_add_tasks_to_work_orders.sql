-- Añadir columna tasks para almacenar el checklist de intervenciones

ALTER TABLE IF EXISTS work_orders
ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb;
