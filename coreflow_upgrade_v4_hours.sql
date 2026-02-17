-- =============================================================================
-- CoreFlow Database Upgrade Script (v4) - Machine Hours Logs
-- Run this in Supabase SQL Editor to enable Machine Hours Logging.
-- =============================================================================

-- 1. MACHINE HOUR LOGS TABLE
CREATE TABLE IF NOT EXISTS public.machine_hour_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    machine_id uuid REFERENCES public.machines(id) ON DELETE CASCADE,
    date date NOT NULL DEFAULT CURRENT_DATE,
    hours_logged numeric NOT NULL,
    operator text, -- Name of the user who logged access
    comments text,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.machine_hour_logs ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES
-- Allow read access to everyone (or authenticated users)
CREATE POLICY "Enable read access for all users" ON public.machine_hour_logs
    FOR SELECT USING (true);

-- Allow insert access to authenticated users
CREATE POLICY "Enable insert for authenticated users" ON public.machine_hour_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow update/delete for authenticated users (optional, maybe restricted to admins?)
CREATE POLICY "Enable update for authenticated users" ON public.machine_hour_logs
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.machine_hour_logs
    FOR DELETE USING (auth.role() = 'authenticated');

-- 4. GRANTS
GRANT ALL ON TABLE public.machine_hour_logs TO anon, authenticated, service_role;

-- 5. INDEXES (Optional, for performance)
CREATE INDEX IF NOT EXISTS idx_machine_hour_logs_machine_id ON public.machine_hour_logs(machine_id);
