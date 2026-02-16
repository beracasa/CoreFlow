-- =============================================================================
-- CoreFlow Database Upgrade Script (v3) - Configuration Tables
-- Run this in Supabase SQL Editor.
-- =============================================================================

-- 1. BRANCHES (Sedes)
CREATE TABLE IF NOT EXISTS public.branches (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now()
);

-- 2. ASSET CATEGORIES (e.g. Producción, Servicios Generales)
CREATE TABLE IF NOT EXISTS public.asset_categories (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now()
);

-- 3. ASSET TYPES (e.g. Generador, Compresor, Extrusora)
CREATE TABLE IF NOT EXISTS public.asset_types (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now()
);

-- 4. ENABLE RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_types ENABLE ROW LEVEL SECURITY;

-- 5. POLICIES (Allow all for now, or restrict write to authenticated)
CREATE POLICY "Enable read access for all users" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.branches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.branches FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON public.asset_categories FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.asset_categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.asset_categories FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON public.asset_types FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.asset_types FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.asset_types FOR DELETE USING (auth.role() = 'authenticated');

-- 6. GRANT PERMISSIONS
GRANT ALL ON TABLE public.branches TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.asset_categories TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.asset_types TO anon, authenticated, service_role;

-- 7. SEED INITIAL DATA (Optional - Safe to run even if empty)
INSERT INTO public.branches (name) VALUES ('Planta Principal'), ('Almacén Externo') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.asset_categories (name) VALUES ('Producción'), ('Servicios Generales'), ('Mantenimiento'), ('Calidad') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.asset_types (name) VALUES ('Generador'), ('Compresor'), ('Extrusora'), ('Selladora'), ('Montacargas'), ('Vehículo'), ('Bomba de Agua') ON CONFLICT (name) DO NOTHING;
