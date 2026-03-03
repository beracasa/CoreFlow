ALTER TABLE public.spare_parts ADD COLUMN is_low_stock BOOLEAN GENERATED ALWAYS AS (current_stock < minimum_stock) STORED;
