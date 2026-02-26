-- Update upsert_spare_part RPC to support p_created_at
CREATE OR REPLACE FUNCTION public.upsert_spare_part(
    p_id TEXT,
    p_sku TEXT,
    p_name TEXT,
    p_description TEXT,
    p_category TEXT,
    p_unit_of_measure TEXT,
    p_current_stock NUMERIC,
    p_minimum_stock NUMERIC,
    p_maximum_stock NUMERIC,
    p_location_code TEXT,
    p_unit_cost NUMERIC,
    p_image_url TEXT,
    p_created_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS SETOF public.spare_parts
LANGUAGE plpgsql
SECURITY INVOKER
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
            unit_cost         = p_unit_cost,
            image_url         = p_image_url,
            created_at        = COALESCE(p_created_at, created_at),
            updated_at        = NOW()
        WHERE id::TEXT = p_id
        RETURNING *;
    ELSE
        RETURN QUERY
        INSERT INTO public.spare_parts (id, sku, name, description, category, unit_of_measure,
                                        current_stock, minimum_stock, maximum_stock, location_code,
                                        unit_cost, image_url, created_at)
        VALUES (p_id, p_sku, p_name, p_description, p_category, p_unit_of_measure,
                p_current_stock, p_minimum_stock, p_maximum_stock, p_location_code,
                p_unit_cost, p_image_url, COALESCE(p_created_at, NOW()))
        RETURNING *;
    END IF;
END;
$$;
