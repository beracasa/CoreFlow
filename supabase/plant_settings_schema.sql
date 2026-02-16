-- =============================================================================
-- PLANT SETTINGS SCHEMA
-- Run this in Supabase SQL Editor to enable "General Settings" persistence.
-- =============================================================================

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.plant_settings (
    id integer PRIMARY KEY DEFAULT 1, -- Single row enforcement
    plant_name text DEFAULT '',
    rnc text DEFAULT '',
    timezone text DEFAULT 'AST',
    currency text DEFAULT 'DOP',
    logo_url text DEFAULT '',
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- 2. Enable RLS
ALTER TABLE public.plant_settings ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies (Allow Public Read/Write for now to fix saving issues)
DROP POLICY IF EXISTS "Public Read Settings" ON public.plant_settings;
CREATE POLICY "Public Read Settings" ON public.plant_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Write Settings" ON public.plant_settings;
CREATE POLICY "Public Write Settings" ON public.plant_settings FOR ALL USING (true) WITH CHECK (true);

-- 4. Grants
GRANT ALL ON TABLE public.plant_settings TO anon, authenticated, service_role;

-- 5. Insert Default Row (Safe to run multiple times)
INSERT INTO public.plant_settings (id, plant_name, rnc, timezone, currency)
VALUES (1, 'Sede Principal - Rep. Dom.', '131-23456-9', 'AST', 'DOP')
ON CONFLICT (id) DO NOTHING;
