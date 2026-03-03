-- Alter check constraint on purchase_requests to allow 'Parcial'

ALTER TABLE public.purchase_requests DROP CONSTRAINT IF EXISTS purchase_requests_status_check;
ALTER TABLE public.purchase_requests ADD CONSTRAINT purchase_requests_status_check CHECK (status IN ('Pendiente', 'Parcial', 'Recibido', 'Cancelado'));
