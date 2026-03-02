-- Migration: 20260301121000_add_stock_atomic_rpc.sql
-- Description: Add RPC for atomic stock increment/decrement.

CREATE OR REPLACE FUNCTION public.increment_part_stock(
    p_part_id TEXT,
    p_quantity NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated permissions
AS $$
BEGIN
    UPDATE public.spare_parts
    SET current_stock = current_stock + p_quantity,
        updated_at = NOW()
    WHERE id::TEXT = p_part_id;
END;
$$;
