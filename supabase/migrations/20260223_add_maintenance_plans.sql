-- Add maintenance_plans JSONB array to the machines table to store R-MANT-02 protocols
ALTER TABLE machines
ADD COLUMN IF NOT EXISTS maintenance_plans JSONB DEFAULT '[]'::JSONB;

COMMENT ON COLUMN machines.maintenance_plans IS 'Stores the maintenance protocols and intervals (R-MANT-02) associated with this machine.';
