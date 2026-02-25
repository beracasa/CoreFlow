-- Fix spare_parts schema to match app expectations
-- 1. Add 'name' column as alias for name_es, add missing columns

-- Add 'name' column (the app reads/writes 'name', table has 'name_es')
ALTER TABLE public.spare_parts
    ADD COLUMN IF NOT EXISTS name TEXT;

-- Populate 'name' from existing 'name_es' data
UPDATE public.spare_parts SET name = name_es WHERE name IS NULL;

-- Add NOT NULL constraint after populating (if desired)
-- ALTER TABLE public.spare_parts ALTER COLUMN name SET NOT NULL;

-- Add missing 'unit_of_measure' column
ALTER TABLE public.spare_parts
    ADD COLUMN IF NOT EXISTS unit_of_measure TEXT DEFAULT 'Unidad';

-- Add missing 'minimum_stock' column (app uses this, schema has 'min_safety_stock')
ALTER TABLE public.spare_parts
    ADD COLUMN IF NOT EXISTS minimum_stock NUMERIC DEFAULT 0;

-- Populate minimum_stock from min_safety_stock
UPDATE public.spare_parts SET minimum_stock = min_safety_stock WHERE minimum_stock = 0 AND min_safety_stock > 0;

-- Add missing 'maximum_stock' column
ALTER TABLE public.spare_parts
    ADD COLUMN IF NOT EXISTS maximum_stock NUMERIC DEFAULT 0;

-- Add missing 'description' column
ALTER TABLE public.spare_parts
    ADD COLUMN IF NOT EXISTS description TEXT;

-- Add missing 'image_url' column
ALTER TABLE public.spare_parts
    ADD COLUMN IF NOT EXISTS image_url TEXT;
