-- Migration to add unit column to machine_hour_logs
ALTER TABLE public.machine_hour_logs ADD COLUMN IF NOT EXISTS unit text DEFAULT 'h' CHECK (unit IN ('h', 'km'));

-- Update existing records to have 'h' as default unit
UPDATE public.machine_hour_logs SET unit = 'h' WHERE unit IS NULL;
