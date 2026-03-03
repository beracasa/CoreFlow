-- Alter purchase_requests table to allow null request_id (Direct Purchases)
ALTER TABLE public.purchase_requests ALTER COLUMN request_id DROP NOT NULL;
