-- =============================================================================
-- CoreFlow Database Upgrade Script (v4) - Add Documents Column
-- Run this in Supabase SQL Editor to fix document persistence.
-- =============================================================================

-- Add documents column to machines table if it doesn't exist
ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb;

-- Grant permissions just in case
GRANT ALL ON TABLE public.machines TO anon, authenticated, service_role;
