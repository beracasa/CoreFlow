-- Migration to add sequential friendly display_id to work_orders

-- 1. Create sequences
CREATE SEQUENCE IF NOT EXISTS rmant02_seq START 1;
CREATE SEQUENCE IF NOT EXISTS rmant05_seq START 1;

-- 2. Add column
ALTER TABLE IF EXISTS work_orders ADD COLUMN IF NOT EXISTS display_id VARCHAR(20);

-- 3. Create Trigger Function
CREATE OR REPLACE FUNCTION fn_generate_work_order_display_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.display_id IS NULL OR NEW.display_id = '' THEN
        IF NEW.form_type = 'R-MANT-02' THEN
            NEW.display_id := 'RM02-' || LPAD(NEXTVAL('rmant02_seq')::text, 5, '0');
        ELSIF NEW.form_type = 'R-MANT-05' THEN
            NEW.display_id := 'RM05-' || LPAD(NEXTVAL('rmant05_seq')::text, 5, '0');
        ELSE
            NEW.display_id := 'WO-' || LPAD(NEXTVAL('rmant02_seq')::text, 5, '0');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Apply Trigger
DROP TRIGGER IF EXISTS tr_generate_display_id ON work_orders;

CREATE TRIGGER tr_generate_display_id
BEFORE INSERT ON work_orders
FOR EACH ROW
EXECUTE FUNCTION fn_generate_work_order_display_id();

-- 5. Backfill existing records safely
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id, form_type FROM work_orders WHERE display_id IS NULL OR display_id = '' ORDER BY created_date ASC LOOP
        IF r.form_type = 'R-MANT-02' THEN
            UPDATE work_orders SET display_id = 'RM02-' || LPAD(NEXTVAL('rmant02_seq')::text, 5, '0') WHERE id = r.id;
        ELSIF r.form_type = 'R-MANT-05' THEN
            UPDATE work_orders SET display_id = 'RM05-' || LPAD(NEXTVAL('rmant05_seq')::text, 5, '0') WHERE id = r.id;
        ELSE
            UPDATE work_orders SET display_id = 'WO-' || LPAD(NEXTVAL('rmant02_seq')::text, 5, '0') WHERE id = r.id;
        END IF;
    END LOOP;
END;
$$;

-- 6. Add Unique Constraint
ALTER TABLE work_orders ADD CONSTRAINT uq_work_orders_display_id UNIQUE (display_id);
