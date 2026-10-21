-- Add columns for Section 2 supervisor validation signature
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS signature_execution_supervisor text;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS signature_execution_supervisor_date timestamptz;
