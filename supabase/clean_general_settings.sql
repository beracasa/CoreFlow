-- Script para limpiar y verificar la tabla general_settings

-- 1. Ver el contenido actual
SELECT * FROM public.general_settings;

-- 2. Eliminar todos los registros (si existen)
DELETE FROM public.general_settings;

-- 3. Verificar que está vacía
SELECT * FROM public.general_settings;

-- 4. Insertar un registro limpio con valores por defecto
INSERT INTO public.general_settings (id, plant_name, tax_id, address, logo_url, currency, timezone)
VALUES (true, '', '', '', '', 'DOP', 'AST');

-- 5. Verificar el nuevo registro
SELECT * FROM public.general_settings;
