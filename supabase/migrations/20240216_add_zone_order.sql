-- Add order_index column to zones table
ALTER TABLE zones ADD COLUMN order_index INTEGER DEFAULT 0;

-- Optional: Initialize existing zones with a default order (e.g., based on creation time or name)
-- This specific update might not be perfect for existing data but ensures the column is populated.
-- For a robust solution, one might use a window function, but a simple default is fine for now.
-- UPDATE zones SET order_index = (SELECT count(*) FROM zones z2 WHERE z2.created_at <= zones.created_at); 
