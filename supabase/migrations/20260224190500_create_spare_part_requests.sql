-- =============================================================================
-- Migration: Spare Part Requests and Items
-- Description: Adds tables to manage internal requests of spare parts.
-- =============================================================================

-- SEQUENCE
CREATE SEQUENCE IF NOT EXISTS public.spare_part_request_seq START 1;

-- Table: spare_part_requests
CREATE TABLE IF NOT EXISTS public.spare_part_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT auth.uid(),
    request_number TEXT UNIQUE,
    technician_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PARTIAL', 'CLOSED', 'PENDING_STOCK')),
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'HIGH', 'EMERGENCY')),
    delivered_to TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: spare_part_request_items
CREATE TABLE IF NOT EXISTS public.spare_part_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.spare_part_requests(id) ON DELETE CASCADE,
    part_id TEXT NOT NULL REFERENCES public.spare_parts(id) ON DELETE RESTRICT,
    quantity_requested NUMERIC NOT NULL CHECK (quantity_requested > 0),
    quantity_delivered NUMERIC DEFAULT 0 CHECK (quantity_delivered >= 0),
    usage_location TEXT,
    tenant_id UUID NOT NULL DEFAULT auth.uid()
);

-- Table: purchase_requests (related to the spare part request)
CREATE TABLE IF NOT EXISTS public.purchase_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.spare_part_requests(id) ON DELETE CASCADE,
    request_date TIMESTAMPTZ DEFAULT NOW(),
    requested_by UUID DEFAULT auth.uid(),
    purchase_request_number TEXT,
    items JSONB DEFAULT '[]'::JSONB, -- List of items in this PR
    tenant_id UUID NOT NULL DEFAULT auth.uid()
);

-- Indices
CREATE INDEX idx_spare_part_requests_tenant ON spare_part_requests(tenant_id);
CREATE INDEX idx_spare_part_request_items_request ON spare_part_request_items(request_id);
CREATE INDEX idx_spare_part_request_items_part ON spare_part_request_items(part_id);

-- Trigger to auto-generate request number
CREATE OR REPLACE FUNCTION fn_generate_spare_part_request_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
        NEW.request_number := 'SPR-' || LPAD(NEXTVAL('spare_part_request_seq')::text, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_generate_spare_part_request_number
BEFORE INSERT ON spare_part_requests
FOR EACH ROW
EXECUTE FUNCTION fn_generate_spare_part_request_number();

-- Enable RLS
ALTER TABLE spare_part_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_part_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenant Isolation spare_part_requests" ON spare_part_requests
    FOR ALL USING (tenant_id = auth.uid());

CREATE POLICY "Tenant Isolation spare_part_request_items" ON spare_part_request_items
    FOR ALL USING (tenant_id = auth.uid());

CREATE POLICY "Tenant Isolation purchase_requests" ON purchase_requests
    FOR ALL USING (tenant_id = auth.uid());
