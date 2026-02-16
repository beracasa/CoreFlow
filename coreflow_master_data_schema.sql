-- =============================================================================
-- CoreFlow Master Data Schema (Definitive)
-- Run this in Supabase SQL Editor to fully prepare the database for production.
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. MACHINES (Activos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.machines (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    code text, -- Internal code
    serial_number text,
    status text DEFAULT 'IDLE', -- IDLE, RUNNING, STOPPED, MAINTENANCE
    
    -- Location & Organization
    location_x numeric DEFAULT 0,
    location_y numeric DEFAULT 0,
    branch text,
    category text,
    zone text, -- Can be linked to public.zones if needed, keeping simple text for now
    
    -- Details
    brand text,
    model text,
    year integer,
    image_url text,
    
    -- Technical Specs (JSON for flexibility or specific columns)
    specifications jsonb DEFAULT '{}'::jsonb, -- capacity, voltage, power, etc.
    
    -- IoT
    is_iot boolean DEFAULT false,
    
    -- Counters
    running_hours numeric DEFAULT 0,
    
    -- Maintenance Info
    last_maintenance timestamptz,
    next_maintenance timestamptz,
    
    -- Audit
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    is_active boolean DEFAULT true
);

-- =============================================================================
-- 2. SPARE PARTS (Inventario)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.spare_parts (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    sku text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    
    -- Classification
    category text, 
    
    -- Stock Management
    current_stock numeric DEFAULT 0,
    minimum_stock numeric DEFAULT 0,
    maximum_stock numeric DEFAULT 0,
    reorder_point numeric DEFAULT 0,
    
    -- Location
    location_code text,
    
    -- Financials
    unit_cost numeric DEFAULT 0,
    currency text DEFAULT 'DOP',
    supplier text,
    
    -- Logistics
    lead_time_days integer DEFAULT 0,
    
    -- Media
    image_url text,
    
    -- Audit
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    is_active boolean DEFAULT true
);

-- =============================================================================
-- 3. MAINTENANCE PROTOCOLS (Protocolos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.maintenance_protocols (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    machine_id uuid REFERENCES public.machines(id) ON DELETE CASCADE, -- Link to specific machine (or null for templates)
    description text,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Intervals (e.g., "Daily", "Weekly", "500 Hours")
CREATE TABLE IF NOT EXISTS public.maintenance_intervals (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    protocol_id uuid REFERENCES public.maintenance_protocols(id) ON DELETE CASCADE,
    hours numeric NOT NULL, -- or days/frequency
    label text NOT NULL, -- "500 Horas", "Semanal"
    
    created_at timestamptz DEFAULT now()
);

-- Tasks within an Interval
CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    interval_id uuid REFERENCES public.maintenance_intervals(id) ON DELETE CASCADE,
    
    sequence integer DEFAULT 0,
    group_name text, -- "Hydraulic", "Mechanical"
    component text, -- "Pump", "Motor"
    activity text, -- "Check oil level", "Replace filter"
    
    -- Details
    estimated_time numeric DEFAULT 0, -- minutes
    is_critical boolean DEFAULT false,
    
    -- Technical Data
    reference_code text,
    lubricant_type text,
    lubricant_code text,
    
    -- Action Matrix (Bool flags)
    action_clean boolean DEFAULT false,
    action_inspect boolean DEFAULT false,
    action_lubricate boolean DEFAULT false,
    action_adjust boolean DEFAULT false,
    action_refill boolean DEFAULT false,
    action_replace boolean DEFAULT false,
    action_mount boolean DEFAULT false,
    
    created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) & POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_intervals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;

-- Helper to create "allow all for authenticated" policy
-- Note: For production, you might want stricter policies.
-- For now, we allow reading by everyone (anon) and writing by authenticated users.

-- MACHINES
CREATE POLICY "Public Read Machines" ON public.machines FOR SELECT USING (true);
CREATE POLICY "Auth Write Machines" ON public.machines FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- SPARE PARTS
CREATE POLICY "Public Read Parts" ON public.spare_parts FOR SELECT USING (true);
CREATE POLICY "Auth Write Parts" ON public.spare_parts FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- PROTOCOLS, INTERVALS, TASKS
CREATE POLICY "Public Read Protocols" ON public.maintenance_protocols FOR SELECT USING (true);
CREATE POLICY "Auth Write Protocols" ON public.maintenance_protocols FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Public Read Intervals" ON public.maintenance_intervals FOR SELECT USING (true);
CREATE POLICY "Auth Write Intervals" ON public.maintenance_intervals FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Public Read Tasks" ON public.maintenance_tasks FOR SELECT USING (true);
CREATE POLICY "Auth Write Tasks" ON public.maintenance_tasks FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- =============================================================================
-- 5. GRANTS (Safety net)
-- =============================================================================
GRANT ALL ON TABLE public.machines TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.spare_parts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.maintenance_protocols TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.maintenance_intervals TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.maintenance_tasks TO anon, authenticated, service_role;
