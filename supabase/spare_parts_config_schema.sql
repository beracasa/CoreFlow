-- =============================================================================
-- SPARE PARTS CONFIGURATION SCHEMA
-- Tables for managing spare parts categories, locations, and units
-- =============================================================================

-- 1. Spare Parts Categories
CREATE TABLE IF NOT EXISTS public.spare_part_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 2. Spare Parts Locations
CREATE TABLE IF NOT EXISTS public.spare_part_locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 3. Spare Parts Units
CREATE TABLE IF NOT EXISTS public.spare_part_units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.spare_part_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_part_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_part_units ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public Read Categories" ON public.spare_part_categories;
DROP POLICY IF EXISTS "Public Write Categories" ON public.spare_part_categories;
DROP POLICY IF EXISTS "Public Read Locations" ON public.spare_part_locations;
DROP POLICY IF EXISTS "Public Write Locations" ON public.spare_part_locations;
DROP POLICY IF EXISTS "Public Read Units" ON public.spare_part_units;
DROP POLICY IF EXISTS "Public Write Units" ON public.spare_part_units;

-- RLS Policies (Allow public read/write for development)
CREATE POLICY "Public Read Categories" ON public.spare_part_categories FOR SELECT USING (true);
CREATE POLICY "Public Write Categories" ON public.spare_part_categories FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Locations" ON public.spare_part_locations FOR SELECT USING (true);
CREATE POLICY "Public Write Locations" ON public.spare_part_locations FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Units" ON public.spare_part_units FOR SELECT USING (true);
CREATE POLICY "Public Write Units" ON public.spare_part_units FOR ALL USING (true) WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE public.spare_part_categories TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.spare_part_locations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.spare_part_units TO anon, authenticated, service_role;
