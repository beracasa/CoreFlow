-- Migration to add company field to spare_parts table
ALTER TABLE public.spare_parts ADD COLUMN IF NOT EXISTS company text;

-- Drop the old 14-parameter function signature
DROP FUNCTION IF EXISTS public.upsert_spare_part(text, text, text, text, text, text, numeric, numeric, numeric, text, text, numeric, text, timestamp with time zone);

-- Recreate the function with p_company parameter
CREATE OR REPLACE FUNCTION "public"."upsert_spare_part"(
    "p_id" "text",
    "p_sku" "text",
    "p_name" "text",
    "p_description" "text",
    "p_category" "text",
    "p_unit_of_measure" "text",
    "p_current_stock" numeric,
    "p_minimum_stock" numeric,
    "p_maximum_stock" numeric,
    "p_location_code" "text",
    "p_sub_location" "text",
    "p_unit_cost" numeric,
    "p_image_url" "text",
    "p_created_at" timestamp with time zone DEFAULT now(),
    "p_company" "text" DEFAULT NULL
) RETURNS SETOF "public"."spare_parts"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.spare_parts WHERE id::TEXT = p_id) THEN
        RETURN QUERY
        UPDATE public.spare_parts SET
            name              = p_name,
            description       = p_description,
            category          = p_category,
            unit_of_measure   = p_unit_of_measure,
            current_stock     = p_current_stock,
            minimum_stock     = p_minimum_stock,
            maximum_stock     = p_maximum_stock,
            location_code     = p_location_code,
            sub_location      = p_sub_location,
            unit_cost         = p_unit_cost,
            image_url         = p_image_url,
            created_at        = COALESCE(p_created_at, created_at),
            company           = p_company,
            updated_at        = NOW()
        WHERE id::TEXT = p_id
        RETURNING *;
    ELSE
        RETURN QUERY
        INSERT INTO public.spare_parts (id, sku, name, description, category, unit_of_measure,
                                        current_stock, minimum_stock, maximum_stock, location_code,
                                        sub_location, unit_cost, image_url, created_at, company)
        VALUES (p_id, p_sku, p_name, p_description, p_category, p_unit_of_measure,
                p_current_stock, p_minimum_stock, p_maximum_stock, p_location_code,
                p_sub_location, p_unit_cost, p_image_url, COALESCE(p_created_at, NOW()), p_company)
        RETURNING *;
    END IF;
END;
$$;
