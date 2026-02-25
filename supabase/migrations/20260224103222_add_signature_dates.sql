-- Añadir columnas faltantes de firmas a la tabla work_orders para el formulario R-MANT-02
ALTER TABLE IF EXISTS work_orders
ADD COLUMN IF NOT EXISTS signature_executor TEXT,
ADD COLUMN IF NOT EXISTS signature_executor_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signature_supervisor TEXT,
ADD COLUMN IF NOT EXISTS signature_supervisor_date TIMESTAMPTZ;
