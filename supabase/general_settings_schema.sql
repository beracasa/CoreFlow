-- =============================================================================
-- GENERAL SETTINGS SCHEMA (SINGLETON PATTERN)
-- This table can only have ONE row to store global plant configuration
-- =============================================================================

-- 1. Create Table with Singleton Constraint
CREATE TABLE IF NOT EXISTS public.general_settings (
    id boolean PRIMARY KEY DEFAULT true,
    plant_name text DEFAULT '',
    tax_id text DEFAULT '', -- RNC
    address text DEFAULT '',
    logo_url text DEFAULT '',
    currency text DEFAULT 'DOP',
    timezone text DEFAULT 'AST',
    updated_at timestamptz DEFAULT now(),
    -- Enforce singleton: only one row where id = true
    CONSTRAINT singleton_settings CHECK (id = true)
);

-- 2. Enable RLS
ALTER TABLE public.general_settings ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any
DROP POLICY IF EXISTS "Public Read Settings" ON public.general_settings;
DROP POLICY IF EXISTS "Public Write Settings" ON public.general_settings;

-- 4. Create RLS Policies (Allow public read/write for development)
CREATE POLICY "Public Read Settings" 
    ON public.general_settings 
    FOR SELECT 
    USING (true);

CREATE POLICY "Public Write Settings" 
    ON public.general_settings 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- 5. Grants
GRANT ALL ON TABLE public.general_settings TO anon, authenticated, service_role;

-- 6. Insert default row (safe to run multiple times)
INSERT INTO public.general_settings (id, plant_name, tax_id, currency, timezone)
VALUES (true, '', '', 'DOP', 'AST')
ON CONFLICT (id) DO NOTHING;
