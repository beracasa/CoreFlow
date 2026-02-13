-- =============================================================================
-- KEY FIX: Work Orders & R-MANT-02 Persistence
-- Run this script in your Supabase SQL Editor to ensure all tables exist.
-- =============================================================================

-- 1. Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Work Orders Table (If not exists)
CREATE TABLE IF NOT EXISTS public.work_orders (
    id text PRIMARY KEY,
    title text NOT NULL,
    machine_id text, -- Loose reference to machines table
    status text NOT NULL, -- BACKLOG, IN_PROGRESS, DONE, REVIEW, CANCELLED
    current_stage text NOT NULL, -- DRAFT, REQUESTED, EXECUTION, HANDOVER, CLOSED
    priority text NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    assigned_to text,
    description text,
    created_date timestamptz DEFAULT now(),
    completed_date timestamptz,
    type text NOT NULL, -- PREVENTIVE, CORRECTIVE
    form_type text NOT NULL, -- R-MANT-02, R-MANT-05

    -- R-MANT-02 Specific Fields
    maintenance_type text,
    machine_plate text,
    interval_name text,
    start_date text,
    end_date text,
    start_time text,
    end_time text,
    machine_work_hours double precision,
    next_maintenance_hours double precision,
    electromechanical_group text,
    supervisor text,
    total_maintenance_cost double precision,

    -- JSON Fields (Checklists, Parts, Executors)
    checklist jsonb DEFAULT '{}'::jsonb,
    consumed_parts jsonb DEFAULT '[]'::jsonb,
    executors jsonb DEFAULT '[]'::jsonb,

    -- Additional Fields
    observations text,
    assigned_mechanic text,
    received_by text,

    -- R-MANT-05 Specific Fields
    department text,
    failure_type text,
    frequency text,
    consequence text,
    action_taken text,

    -- Signatures
    signature_executor text,
    signature_supervisor text,

    updated_at timestamptz DEFAULT now()
);

-- 3. Machines Table (Minimal version if missing)
CREATE TABLE IF NOT EXISTS public.machines (
    id text PRIMARY KEY,
    name text NOT NULL,
    plate text,
    type text,
    status text,
    location_x integer DEFAULT 0,
    location_y integer DEFAULT 0,
    -- Add other fields as needed, these are core for relation
    created_at timestamptz DEFAULT now()
);

-- 4. Enable RLS (Row Level Security) - Optional but recommended
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- 5. Open Policy (For development - Allow everything)
-- WARNING: In production, you should restrict this to authenticated users.
DROP POLICY IF EXISTS "Enable all access for all users" ON public.work_orders;
CREATE POLICY "Enable all access for all users" ON public.work_orders
    FOR ALL USING (true) WITH CHECK (true);

-- 6. Replication (Realtime)
-- Enable realtime for work_orders table
-- db_name is usually 'postgres'
-- invalid command in standard SQL editor usually, you might need to enable it via UI.
-- But we can try:
-- ALTER PUBLICATION supabase_realtime ADD TABLE work_orders;
