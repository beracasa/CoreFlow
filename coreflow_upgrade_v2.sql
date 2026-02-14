-- =============================================================================
-- CoreFlow Database Upgrade Script (v2)
-- Run this in Supabase SQL Editor to complete the schema for all modules.
-- =============================================================================

-- 1. SPARE PARTS (Inventory)
CREATE TABLE IF NOT EXISTS public.spare_parts (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    sku text NOT NULL,
    name text NOT NULL,
    category text,
    current_stock numeric DEFAULT 0,
    minimum_stock numeric DEFAULT 0,
    maximum_stock numeric DEFAULT 0,
    reorder_point numeric DEFAULT 0,
    location_code text,
    unit_cost numeric DEFAULT 0,
    supplier text,
    lead_time_days integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. TECHNICIANS (Workforce)
CREATE TABLE IF NOT EXISTS public.technicians (
    id text PRIMARY KEY, -- Can be UUID or custom ID like "T-042"
    name text NOT NULL,
    role text NOT NULL, -- MECHANICAL, ELECTRICAL, SUPERVISOR
    shift text, -- MORNING, AFTERNOON, NIGHT
    status text DEFAULT 'ACTIVE',
    email text,
    created_at timestamptz DEFAULT now()
);

-- 3. ZONES (Plant Layout)
CREATE TABLE IF NOT EXISTS public.zones (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    lines text[], -- Array of strings
    x numeric DEFAULT 0,
    y numeric DEFAULT 0,
    width numeric DEFAULT 0,
    height numeric DEFAULT 0,
    color text,
    created_at timestamptz DEFAULT now()
);

-- 4. UPDATE MACHINES TABLE (Add missing fields)
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS branch text;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS serial_number text;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS year integer;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS location_zone text; -- Link to zone name or ID
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS is_iot boolean DEFAULT false;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS running_hours numeric DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS last_maintenance date;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS next_maintenance date;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS maintenance_intervals text[]; -- Array of strings
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS image_url text;

-- 5. ENABLE ROW LEVEL SECURITY (RLS) FOR NEW TABLES
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY; -- Ensure it's on

-- 6. PUBLIC ACCESS POLICIES (Development Mode)
-- Re-run these to ensure access to new tables
CREATE POLICY "Enable all access for spare_parts" ON public.spare_parts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for technicians" ON public.technicians FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for zones" ON public.zones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for machines" ON public.machines FOR ALL USING (true) WITH CHECK (true);

-- 7. Grant permissions just in case
GRANT ALL ON TABLE public.spare_parts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.technicians TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.zones TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.machines TO anon, authenticated, service_role;
