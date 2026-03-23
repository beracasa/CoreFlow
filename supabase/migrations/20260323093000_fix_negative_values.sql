-- =============================================================================
-- Migration: Add non-negative constraints to work_orders
-- Date: 2026-03-23
-- Description: Ensures that quantities and costs in work orders are non-negative.
-- =============================================================================

-- 1. Add constraints for numeric columns
ALTER TABLE public.work_orders
ADD CONSTRAINT chk_total_maintenance_cost_non_negative CHECK (total_maintenance_cost >= 0),
ADD CONSTRAINT chk_machine_work_hours_non_negative CHECK (machine_work_hours >= 0),
ADD CONSTRAINT chk_next_maintenance_hours_non_negative CHECK (next_maintenance_hours >= 0);

-- 2. Add constraint for consumed_parts JSONB column
-- This ensures all elements in the consumed_parts array have quantity >= 0 and unitCost >= 0
-- Note: unit_cost in ConsumedPart interface is unitCost in JSON (camelCase from types.ts, but let's check actual JSON structure in code)
-- In MaintenanceForm.tsx: 
-- updated[idx] = { ...updated[idx], partId: sp.id, partName: ..., quantity: qty, unitCost: sp.cost, totalCost: qty * updated[idx].unitCost, ... }
-- So the keys are: quantity, unitCost, totalCost

ALTER TABLE public.work_orders
ADD CONSTRAINT chk_consumed_parts_non_negative 
CHECK (
  NOT EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(consumed_parts) AS part
    WHERE (part->>'quantity')::numeric < 0 
       OR (part->>'unitCost')::numeric < 0
  )
);

-- 3. Add constraint for failures_and_activities (Optional, but let's stay focused on the request)
-- No numeric fields there yet.

COMMENT ON CONSTRAINT chk_total_maintenance_cost_non_negative ON public.work_orders IS 'El costo total de mantenimiento no puede ser negativo.';
COMMENT ON CONSTRAINT chk_consumed_parts_non_negative ON public.work_orders IS 'Las cantidades y costos unitarios de repuestos consumidos no pueden ser negativos.';
