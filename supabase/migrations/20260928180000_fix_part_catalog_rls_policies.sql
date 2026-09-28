-- Migration: Fix Row Level Security policies for part and machine catalog tables
-- Description: Allow authenticated and anon users to manage catalog entries (locations, suppliers, categories, companies, brands, types)
-- Previously, these were restricted to coreflow_is_admin(), blocking users without system-admin roles from creating or updating catalog items.

-- 1. part_locations
DROP POLICY IF EXISTS "Admin Write part_locations" ON public.part_locations;
DROP POLICY IF EXISTS "Public Read part_locations" ON public.part_locations;
DROP POLICY IF EXISTS "Public Write part_locations" ON public.part_locations;
CREATE POLICY "Public Read part_locations" ON public.part_locations FOR SELECT USING (true);
CREATE POLICY "Public Write part_locations" ON public.part_locations FOR ALL USING (true) WITH CHECK (true);

-- 2. part_suppliers
DROP POLICY IF EXISTS "Admin Write part_suppliers" ON public.part_suppliers;
DROP POLICY IF EXISTS "Public Read part_suppliers" ON public.part_suppliers;
DROP POLICY IF EXISTS "Public Write part_suppliers" ON public.part_suppliers;
CREATE POLICY "Public Read part_suppliers" ON public.part_suppliers FOR SELECT USING (true);
CREATE POLICY "Public Write part_suppliers" ON public.part_suppliers FOR ALL USING (true) WITH CHECK (true);

-- 3. part_categories
DROP POLICY IF EXISTS "Admin Write part_categories" ON public.part_categories;
DROP POLICY IF EXISTS "Public Read part_categories" ON public.part_categories;
DROP POLICY IF EXISTS "Public Write part_categories" ON public.part_categories;
CREATE POLICY "Public Read part_categories" ON public.part_categories FOR SELECT USING (true);
CREATE POLICY "Public Write part_categories" ON public.part_categories FOR ALL USING (true) WITH CHECK (true);

-- 4. part_companies
DROP POLICY IF EXISTS "Admin Write part_companies" ON public.part_companies;
DROP POLICY IF EXISTS "Public Read part_companies" ON public.part_companies;
DROP POLICY IF EXISTS "Public Write part_companies" ON public.part_companies;
CREATE POLICY "Public Read part_companies" ON public.part_companies FOR SELECT USING (true);
CREATE POLICY "Public Write part_companies" ON public.part_companies FOR ALL USING (true) WITH CHECK (true);

-- 5. machine_brands
DROP POLICY IF EXISTS "Admin Write machine_brands" ON public.machine_brands;
DROP POLICY IF EXISTS "Public Read machine_brands" ON public.machine_brands;
DROP POLICY IF EXISTS "Public Write machine_brands" ON public.machine_brands;
CREATE POLICY "Public Read machine_brands" ON public.machine_brands FOR SELECT USING (true);
CREATE POLICY "Public Write machine_brands" ON public.machine_brands FOR ALL USING (true) WITH CHECK (true);

-- 6. machine_types
DROP POLICY IF EXISTS "Admin Write machine_types" ON public.machine_types;
DROP POLICY IF EXISTS "Public Read machine_types" ON public.machine_types;
DROP POLICY IF EXISTS "Public Write machine_types" ON public.machine_types;
CREATE POLICY "Public Read machine_types" ON public.machine_types FOR SELECT USING (true);
CREATE POLICY "Public Write machine_types" ON public.machine_types FOR ALL USING (true) WITH CHECK (true);

-- Ensure permissions
GRANT ALL ON TABLE public.part_locations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.part_suppliers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.part_categories TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.part_companies TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.machine_brands TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.machine_types TO anon, authenticated, service_role;
