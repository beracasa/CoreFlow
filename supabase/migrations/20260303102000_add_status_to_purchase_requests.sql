-- Add status column to purchase_requests table
ALTER TABLE public.purchase_requests 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'Recibido', 'Cancelado'));
