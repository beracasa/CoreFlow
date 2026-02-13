-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- MACHINES TABLE
CREATE TABLE public.machines (
    id text PRIMARY KEY, -- Using text to match 'm1', 'm2' or UUIDs
    name text NOT NULL,
    plate text,
    type text,
    status text NOT NULL, -- RUNNING, IDLE, etc.
    location_x integer DEFAULT 0,
    location_y integer DEFAULT 0,
    zone text,
    is_iot boolean DEFAULT false,
    running_hours double precision DEFAULT 0,
    last_maintenance timestamptz,
    next_maintenance timestamptz,
    intervals text[], -- Array of strings e.g. ['360 Hours']
    
    -- New Fields
    branch text,
    category text,
    alias text,
    brand text,
    model text,
    year integer,
    capacity text,
    current_rating double precision, -- In (A)
    frequency double precision, -- f (hz)
    voltage double precision, -- V
    power double precision, -- P (KVA)
    image_url text,
    documents text[],
    
    -- Jsonb for telemetry (flexible)
    telemetry jsonb DEFAULT '{}'::jsonb,
    history jsonb[] DEFAULT '{}',
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- SPARE PARTS TABLE
CREATE TABLE public.spare_parts (
    id text PRIMARY KEY,
    sku text NOT NULL,
    name text NOT NULL,
    category text,
    current_stock integer DEFAULT 0,
    minimum_stock integer DEFAULT 0,
    maximum_stock integer DEFAULT 0,
    reorder_point integer,
    location_code text,
    unit_cost double precision DEFAULT 0,
    currency text DEFAULT 'DOP',
    supplier text,
    lead_time_days integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- TECHNICIANS TABLE
CREATE TABLE public.technicians (
    id text PRIMARY KEY,
    name text NOT NULL,
    role text NOT NULL, -- MECHANICAL, ELECTRICAL...
    shift text,
    status text DEFAULT 'ACTIVE',
    email text,
    created_at timestamptz DEFAULT now()
);

-- WORK ORDERS TABLE
CREATE TABLE public.work_orders (
    id text PRIMARY KEY,
    title text NOT NULL,
    machine_id text REFERENCES public.machines(id),
    status text NOT NULL, -- BACKLOG, IN_PROGRESS, etc.
    current_stage text NOT NULL, -- DRAFT, REQUESTED...
    priority text NOT NULL,
    assigned_to text, -- Could be FK to technicians(id) but keeping loose for now
    description text,
    created_date timestamptz DEFAULT now(),
    completed_date timestamptz,
    type text NOT NULL, -- PREVENTIVE, CORRECTIVE...
    form_type text NOT NULL, -- R-MANT-02...

    -- R-MANT-02 Specifics
    maintenance_type text,
    machine_plate text,
    interval_name text, -- 'interval' is reserved keyword in some SQL contexts, safe in Postgres but clear is better
    start_date text, -- Keeping as text to match FE or use date type
    end_date text,
    start_time text,
    end_time text,
    machine_work_hours double precision,
    next_maintenance_hours double precision,
    electromechanical_group text,
    supervisor text,
    total_maintenance_cost double precision,
    
    -- JSONB for nested/complex structures
    checklist jsonb DEFAULT '{}'::jsonb,
    consumed_parts jsonb DEFAULT '[]'::jsonb,
    executors jsonb DEFAULT '[]'::jsonb,
    
    -- R-MANT-02 Additional
    observations text,
    assigned_mechanic text,
    received_by text,

    -- R-MANT-05 Specifics
    department text,
    failure_type text,
    frequency text,
    consequence text,
    action_taken text,

    -- Signatures (Booleans for now)
    signature_executor boolean DEFAULT false,
    signature_supervisor boolean DEFAULT false,

    updated_at timestamptz DEFAULT now()
);

-- MACHINE HOURS LOG
CREATE TABLE public.machine_hour_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    machine_id text REFERENCES public.machines(id),
    date date NOT NULL,
    hours_logged double precision NOT NULL,
    operator text,
    comments text,
    created_at timestamptz DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_work_orders_machine_id ON public.work_orders(machine_id);
CREATE INDEX idx_work_orders_status ON public.work_orders(status);
CREATE INDEX idx_work_orders_created_date ON public.work_orders(created_date);

-- RLS POLICIES (Simple for now: Public Access for POC, lock down later)
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_hour_logs ENABLE ROW LEVEL SECURITY;

-- Allow all for anon (Simplest for dev mode)
CREATE POLICY "Allow All Machines" ON public.machines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Orders" ON public.work_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Parts" ON public.spare_parts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Techs" ON public.technicians FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Logs" ON public.machine_hour_logs FOR ALL USING (true) WITH CHECK (true);
