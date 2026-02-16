-- =====================================================
-- Add 'type' Column to Machines Table
-- Descripción: Agrega la columna 'type' para almacenar
--              el tipo de equipo (SACMI, MOSS, PMV, GENERIC)
-- Fecha: 2026-02-15
-- =====================================================

-- Agregar columna 'type' si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='machines' 
        AND column_name='type'
    ) THEN
        ALTER TABLE public.machines 
        ADD COLUMN type text DEFAULT 'GENERIC';
        
        RAISE NOTICE 'Column "type" added successfully to machines table';
    ELSE
        RAISE NOTICE 'Column "type" already exists in machines table';
    END IF;
END $$;

-- Crear índice para búsquedas por tipo
CREATE INDEX IF NOT EXISTS idx_machines_type ON public.machines(type);

-- Verificar columnas de la tabla
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'machines'
ORDER BY ordinal_position;
