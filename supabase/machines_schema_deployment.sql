-- =============================================================================
-- Deploy/Update Machines Table Schema to Supabase
-- This script will create or update the machines table with all necessary columns
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create or update machines table
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
    zone text,
    
    -- Details
    brand text,
    model text,
    year integer,
    image_url text,
    
    -- Technical Specs (JSON for flexibility)
    specifications jsonb DEFAULT '{}'::jsonb,
    
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

-- Add columns if they don't exist (for existing tables)
DO $$ 
BEGIN
    -- Add code column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='code') THEN
        ALTER TABLE public.machines ADD COLUMN code text;
    END IF;
    
    -- Add serial_number column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='serial_number') THEN
        ALTER TABLE public.machines ADD COLUMN serial_number text;
    END IF;
    
    -- Add status column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='status') THEN
        ALTER TABLE public.machines ADD COLUMN status text DEFAULT 'IDLE';
    END IF;
    
    -- Add location columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='location_x') THEN
        ALTER TABLE public.machines ADD COLUMN location_x numeric DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='location_y') THEN
        ALTER TABLE public.machines ADD COLUMN location_y numeric DEFAULT 0;
    END IF;
    
    -- Add organization columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='branch') THEN
        ALTER TABLE public.machines ADD COLUMN branch text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='category') THEN
        ALTER TABLE public.machines ADD COLUMN category text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='zone') THEN
        ALTER TABLE public.machines ADD COLUMN zone text;
    END IF;
    
    -- Add detail columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='brand') THEN
        ALTER TABLE public.machines ADD COLUMN brand text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='model') THEN
        ALTER TABLE public.machines ADD COLUMN model text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='year') THEN
        ALTER TABLE public.machines ADD COLUMN year integer;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='image_url') THEN
        ALTER TABLE public.machines ADD COLUMN image_url text;
    END IF;
    
    -- Add specifications column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='specifications') THEN
        ALTER TABLE public.machines ADD COLUMN specifications jsonb DEFAULT '{}'::jsonb;
    END IF;
    
    -- Add IoT column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='is_iot') THEN
        ALTER TABLE public.machines ADD COLUMN is_iot boolean DEFAULT false;
    END IF;
    
    -- Add running_hours column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='running_hours') THEN
        ALTER TABLE public.machines ADD COLUMN running_hours numeric DEFAULT 0;
    END IF;
    
    -- Add maintenance columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='last_maintenance') THEN
        ALTER TABLE public.machines ADD COLUMN last_maintenance timestamptz;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='next_maintenance') THEN
        ALTER TABLE public.machines ADD COLUMN next_maintenance timestamptz;
    END IF;
    
    -- Add audit columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='created_at') THEN
        ALTER TABLE public.machines ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='updated_at') THEN
        ALTER TABLE public.machines ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='is_active') THEN
        ALTER TABLE public.machines ADD COLUMN is_active boolean DEFAULT true;
    END IF;
END $$;

-- Create index on name for faster searches
CREATE INDEX IF NOT EXISTS idx_machines_name ON public.machines(name);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_machines_status ON public.machines(status);

-- Create index on zone for filtering
CREATE INDEX IF NOT EXISTS idx_machines_zone ON public.machines(zone);

-- Enable Row Level Security
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read machines" ON public.machines;
DROP POLICY IF EXISTS "Allow authenticated users to insert machines" ON public.machines;
DROP POLICY IF EXISTS "Allow authenticated users to update machines" ON public.machines;
DROP POLICY IF EXISTS "Allow authenticated users to delete machines" ON public.machines;

-- Create policy to allow authenticated users to read all machines
CREATE POLICY "Allow authenticated users to read machines"
ON public.machines FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow authenticated users to insert machines
CREATE POLICY "Allow authenticated users to insert machines"
ON public.machines FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy to allow authenticated users to update machines
CREATE POLICY "Allow authenticated users to update machines"
ON public.machines FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policy to allow authenticated users to delete machines
CREATE POLICY "Allow authenticated users to delete machines"
ON public.machines FOR DELETE
TO authenticated
USING (true);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Machines table schema deployed successfully!';
END $$;
