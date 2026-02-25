-- Añadir columnas faltantes para el formulario R-MANT-05 (Mantenimiento Correctivo)
ALTER TABLE IF EXISTS work_orders
ADD COLUMN IF NOT EXISTS branch TEXT,
ADD COLUMN IF NOT EXISTS equipment_type TEXT,
ADD COLUMN IF NOT EXISTS condition TEXT,
ADD COLUMN IF NOT EXISTS request_description TEXT,
ADD COLUMN IF NOT EXISTS request_received_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS request_received_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failures_and_activities JSONB,
ADD COLUMN IF NOT EXISTS closing_image TEXT,
ADD COLUMN IF NOT EXISTS closing_file TEXT,
ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS closing_date TIMESTAMPTZ;
