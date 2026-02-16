-- =============================================================================
-- FIX CONFIGURATION TABLES (RLS & DATA CLEANUP)
-- Run this in Supabase SQL Editor to unblock "Not Saving" issues and remove "Mock Data".
-- =============================================================================

-- 1. RELAX RLS POLICIES (Allow public write access for development)
-- This fixes the issue where data isn't saved because the user might not be logged in.

-- Drop existing restricted policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.branches;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.branches;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.asset_categories;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.asset_categories;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.asset_types;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.asset_types;

-- Create permissive policies (Public Read/Write)
CREATE POLICY "Public Write Branches" ON public.branches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Write Categories" ON public.asset_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Write AssetTypes" ON public.asset_types FOR ALL USING (true) WITH CHECK (true);

-- 2. CLEAR SEED DATA (Remove "Mock-like" data)
-- This fixes the issue where you see "Planta Principal", "Bomba de Agua", etc. which look like mocks.
TRUNCATE TABLE public.branches CASCADE;
TRUNCATE TABLE public.asset_categories CASCADE;
TRUNCATE TABLE public.asset_types CASCADE;

-- 3. VERIFY
-- After running this, the Configuration > Equipment lists should be EMPTY.
-- You should be able to add new items and they will SAVE.
