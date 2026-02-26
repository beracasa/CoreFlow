-- Relax spare_parts category constraint to allow dynamic categories
-- Migration: 20260226100000_relax_spare_parts_constraints.sql

DO $$
BEGIN
    -- 1. Identify and drop the check constraint on category if it exists
    -- The constraint name in 20231027_kardex_4_0_core.sql was implicit or spare_parts_category_check
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'spare_parts_category_check' 
           OR (conrelid = 'public.spare_parts'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%category%')
    ) THEN
        ALTER TABLE public.spare_parts DROP CONSTRAINT IF EXISTS spare_parts_category_check;
        
        -- Fallback catch-all for anonymous constraints matching the pattern
        EXECUTE (
            SELECT 'ALTER TABLE public.spare_parts DROP CONSTRAINT ' || quote_ident(conname)
            FROM pg_constraint 
            WHERE conrelid = 'public.spare_parts'::regclass 
              AND contype = 'c' 
              AND pg_get_constraintdef(oid) LIKE '%category IN%'
            LIMIT 1
        );
    END IF;
END $$;
