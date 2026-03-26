


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_role_hierarchy_cycle"("role_id" "uuid", "new_parent_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_parent UUID;
  max_depth INT := 10; -- Prevenir loops infinitos
  depth INT := 0;
BEGIN
  -- Si no hay parent, no hay ciclo
  IF new_parent_id IS NULL THEN
    RETURN true;
  END IF;
  
  -- Si el parent es el mismo rol, es un ciclo
  IF role_id = new_parent_id THEN
    RETURN false;
  END IF;
  
  -- Recorrer la cadena de parents
  current_parent := new_parent_id;
  
  WHILE current_parent IS NOT NULL AND depth < max_depth LOOP
    -- Si encontramos el rol original en la cadena, hay un ciclo
    IF current_parent = role_id THEN
      RETURN false;
    END IF;
    
    -- Obtener el siguiente parent
    SELECT parent_role_id INTO current_parent
    FROM public.app_roles
    WHERE id = current_parent;
    
    depth := depth + 1;
  END LOOP;
  
  RETURN true;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."coreflow_get_tenant_id"() RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  -- We use a plain SQL query but marked as SECURITY DEFINER
  -- This runs as 'postgres' role which bypasses RLS and prevents recursion
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;


CREATE OR REPLACE FUNCTION "public"."coreflow_is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_role text;
  v_is_sys boolean;
  v_role_name text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  
  IF v_role = 'ADMIN_SOLICITANTE' THEN
    RETURN true;
  END IF;

  BEGIN
    SELECT is_system, name INTO v_is_sys, v_role_name 
    FROM public.app_roles 
    WHERE id = v_role::uuid;
    
    IF v_is_sys AND (v_role_name ILIKE '%Admin%') THEN
      RETURN true;
    END IF;
  EXCEPTION 
    WHEN invalid_text_representation THEN
      RETURN false;
  END;

  RETURN false;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."fn_generate_spare_part_request_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
        NEW.request_number := 'SPR-' || LPAD(NEXTVAL('spare_part_request_seq')::text, 5, '0');
    END IF;
    RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."fn_generate_work_order_display_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."notify_work_order_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  perform net.http_post(
      url:='https://eujtldssxdafrlhllnto.supabase.co/functions/v1/send-email-notification',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('request.jwt.claim.role', true) || '"}'::jsonb,
      body:=json_build_object('type', TG_OP, 'table', TG_TABLE_NAME, 'record', row_to_json(NEW))::jsonb
  );
  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."send_email_notification_webhook"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  -- ¡IMPORTANTE! Reemplazar [TU-PROYECTO] con tu subdominio de Supabase
  edge_function_url TEXT := 'https://eujtldssxdafrlhllnto.supabase.co/functions/v1/send-email-notification';
  
  -- ¡IMPORTANTE! Reemplazar [SUPABASE_ANON_KEY] con tu respectiva Anon / Public Key
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1anRsZHNzeGRhZnJsaGxsbnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODA5MTEsImV4cCI6MjA4NTk1NjkxMX0.yzsR6cycFoONceJJY0jdWAl7pdFGlhgZSEFzIvGOGeY'; 
  
  payload JSONB;
BEGIN
  -- Empaquetamos el body asegurando que incluimos type (UPDATE/INSERT), table y record
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', row_to_json(NEW)
  );

  -- Enviamos HTTP POST asíncrono
  PERFORM net.http_post(
    url := edge_function_url,
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    )
  );

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."update_app_roles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."spare_parts" (
    "id" "text" NOT NULL,
    "sku" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "current_stock" integer DEFAULT 0,
    "minimum_stock" integer DEFAULT 0,
    "reorder_point" integer,
    "location_code" "text",
    "unit_cost" double precision DEFAULT 0,
    "currency" "text" DEFAULT 'DOP'::"text",
    "supplier" "text",
    "lead_time_days" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "maximum_stock" integer DEFAULT 0,
    "unit_of_measure" "text" DEFAULT 'Unidad'::"text",
    "description" "text",
    "image_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sub_location" "text",
    "is_low_stock" boolean GENERATED ALWAYS AS (("current_stock" < "minimum_stock")) STORED
);


CREATE OR REPLACE FUNCTION "public"."upsert_spare_part"("p_id" "text", "p_sku" "text", "p_name" "text", "p_description" "text", "p_category" "text", "p_unit_of_measure" "text", "p_current_stock" numeric, "p_minimum_stock" numeric, "p_maximum_stock" numeric, "p_location_code" "text", "p_unit_cost" numeric, "p_image_url" "text") RETURNS SETOF "public"."spare_parts"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.spare_parts WHERE id::TEXT = p_id) THEN
        RETURN QUERY
        UPDATE public.spare_parts SET
            name = p_name, description = p_description, category = p_category,
            unit_of_measure = p_unit_of_measure, current_stock = p_current_stock,
            minimum_stock = p_minimum_stock, maximum_stock = p_maximum_stock,
            location_code = p_location_code, unit_cost = p_unit_cost, image_url = p_image_url
        WHERE id::TEXT = p_id RETURNING *;
    ELSE
        RETURN QUERY
        INSERT INTO public.spare_parts (id, sku, name, description, category, unit_of_measure,
                                        current_stock, minimum_stock, maximum_stock,
                                        location_code, unit_cost, image_url)
        VALUES (p_id, p_sku, p_name, p_description, p_category, p_unit_of_measure,
                p_current_stock, p_minimum_stock, p_maximum_stock,
                p_location_code, p_unit_cost, p_image_url)
        RETURNING *;
    END IF;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."upsert_spare_part"("p_id" "text", "p_sku" "text", "p_name" "text", "p_description" "text", "p_category" "text", "p_unit_of_measure" "text", "p_current_stock" numeric, "p_minimum_stock" numeric, "p_maximum_stock" numeric, "p_location_code" "text", "p_unit_cost" numeric, "p_image_url" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS SETOF "public"."spare_parts"
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


CREATE OR REPLACE FUNCTION "public"."upsert_spare_part"("p_id" "text", "p_sku" "text", "p_name" "text", "p_description" "text", "p_category" "text", "p_unit_of_measure" "text", "p_current_stock" numeric, "p_minimum_stock" numeric, "p_maximum_stock" numeric, "p_location_code" "text", "p_sub_location" "text", "p_unit_cost" numeric, "p_image_url" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS SETOF "public"."spare_parts"
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
            updated_at        = NOW()
        WHERE id::TEXT = p_id
        RETURNING *;
    ELSE
        RETURN QUERY
        INSERT INTO public.spare_parts (id, sku, name, description, category, unit_of_measure,
                                        current_stock, minimum_stock, maximum_stock, location_code,
                                        sub_location, unit_cost, image_url, created_at)
        VALUES (p_id, p_sku, p_name, p_description, p_category, p_unit_of_measure,
                p_current_stock, p_minimum_stock, p_maximum_stock, p_location_code,
                p_sub_location, p_unit_cost, p_image_url, COALESCE(p_created_at, NOW()))
        RETURNING *;
    END IF;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."validate_role_hierarchy"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Validar que no se cree un ciclo
  IF NOT check_role_hierarchy_cycle(NEW.id, NEW.parent_role_id) THEN
    RAISE EXCEPTION 'No se puede crear un ciclo en la jerarquía de roles. Un rol no puede reportar a uno de sus descendientes.';
  END IF;
  
  RETURN NEW;
END;
$$;


CREATE TABLE IF NOT EXISTS "public"."app_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "parent_role_id" "uuid",
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "share_data_with_peers" boolean DEFAULT false,
    "is_system" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid"
);


COMMENT ON TABLE "public"."app_roles" IS 'Tabla de roles con soporte para jerarquía organizacional';



COMMENT ON COLUMN "public"."app_roles"."parent_role_id" IS 'ID del rol superior en la jerarquía (Reporta a)';



COMMENT ON COLUMN "public"."app_roles"."permissions" IS 'Permisos del rol en formato JSONB';



COMMENT ON COLUMN "public"."app_roles"."share_data_with_peers" IS 'Si true, comparte datos con roles del mismo nivel';



COMMENT ON COLUMN "public"."app_roles"."is_system" IS 'Si true, el rol no puede ser eliminado (solo editado)';



CREATE TABLE IF NOT EXISTS "public"."asset_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


CREATE TABLE IF NOT EXISTS "public"."asset_types" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


CREATE TABLE IF NOT EXISTS "public"."branches" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


CREATE TABLE IF NOT EXISTS "public"."general_settings" (
    "id" boolean DEFAULT true NOT NULL,
    "plant_name" "text" DEFAULT ''::"text",
    "tax_id" "text" DEFAULT ''::"text",
    "address" "text" DEFAULT ''::"text",
    "logo_url" "text" DEFAULT ''::"text",
    "currency" "text" DEFAULT 'DOP'::"text",
    "timezone" "text" DEFAULT 'AST'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "singleton_settings" CHECK (("id" = true))
);


CREATE TABLE IF NOT EXISTS "public"."machine_hour_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "machine_id" "text",
    "date" "date" NOT NULL,
    "hours_logged" double precision NOT NULL,
    "operator" "text",
    "comments" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "unit" "text" DEFAULT 'h'::"text",
    CONSTRAINT "machine_hour_logs_unit_check" CHECK (("unit" = ANY (ARRAY['h'::"text", 'km'::"text"])))
);


CREATE TABLE IF NOT EXISTS "public"."machines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "model" "text",
    "serial_number" "text",
    "location" "text",
    "status" "text" DEFAULT 'ACTIVE'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "location_x" numeric DEFAULT 0,
    "location_y" numeric DEFAULT 0,
    "branch" "text",
    "category" "text",
    "zone" "text",
    "brand" "text",
    "year" integer,
    "image_url" "text",
    "specifications" "jsonb" DEFAULT '{}'::"jsonb",
    "is_iot" boolean DEFAULT false,
    "running_hours" numeric DEFAULT 0,
    "last_maintenance" timestamp with time zone,
    "next_maintenance" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "type" "text" DEFAULT 'GENERIC'::"text",
    "documents" "jsonb" DEFAULT '[]'::"jsonb",
    "maintenance_plans" "jsonb" DEFAULT '[]'::"jsonb",
    "critical_parts" "text"[] DEFAULT '{}'::"text"[]
);


COMMENT ON COLUMN "public"."machines"."maintenance_plans" IS 'Stores the maintenance protocols and intervals (R-MANT-02) associated with this machine.';



CREATE TABLE IF NOT EXISTS "public"."maintenance_intervals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "protocol_id" "uuid",
    "hours" integer NOT NULL,
    "label" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


CREATE TABLE IF NOT EXISTS "public"."maintenance_protocols" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "machine_id" "uuid",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


CREATE TABLE IF NOT EXISTS "public"."maintenance_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "interval_id" "uuid",
    "description" "text" NOT NULL,
    "estimated_time" integer DEFAULT 0,
    "is_critical" boolean DEFAULT false,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


CREATE TABLE IF NOT EXISTS "public"."plant_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "plant_name" "text" DEFAULT ''::"text",
    "rnc" "text" DEFAULT ''::"text",
    "timezone" "text" DEFAULT 'AST'::"text",
    "currency" "text" DEFAULT 'DOP'::"text",
    "logo_url" "text" DEFAULT ''::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "single_row" CHECK (("id" = 1))
);


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "role" "text" DEFAULT 'TECNICO_MANT'::"text",
    "job_title" "text",
    "tenant_id" "text" DEFAULT 'primary'::"text",
    "branch_id" "uuid",
    "status" "text" DEFAULT 'ACTIVE'::"text",
    "specialties" "text"[],
    "last_seen" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "role_id" "uuid",
    "notification_preferences" "jsonb" DEFAULT '{"low_stock": false, "alerts_rmant05": false, "pending_approvals": false}'::"jsonb",
    "requires_password_change" boolean DEFAULT false
);


CREATE TABLE IF NOT EXISTS "public"."purchase_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid",
    "request_date" timestamp with time zone DEFAULT "now"(),
    "requested_by" "uuid" DEFAULT "auth"."uid"(),
    "purchase_request_number" "text",
    "items" "jsonb" DEFAULT '[]'::"jsonb",
    "tenant_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "status" "text" DEFAULT 'Pendiente'::"text",
    CONSTRAINT "purchase_requests_status_check" CHECK (("status" = ANY (ARRAY['Pendiente'::"text", 'Parcial'::"text", 'Recibido'::"text", 'Cancelado'::"text"])))
);


CREATE SEQUENCE IF NOT EXISTS "public"."rmant02_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


CREATE SEQUENCE IF NOT EXISTS "public"."rmant05_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_system" boolean DEFAULT false,
    "permissions" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


CREATE TABLE IF NOT EXISTS "public"."skill_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "skill_name" "text" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "skill_requests_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'APPROVED'::"text", 'REJECTED'::"text"])))
);


CREATE TABLE IF NOT EXISTS "public"."spare_part_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


CREATE TABLE IF NOT EXISTS "public"."spare_part_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


CREATE TABLE IF NOT EXISTS "public"."spare_part_request_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "part_id" "text" NOT NULL,
    "quantity_requested" numeric NOT NULL,
    "quantity_delivered" numeric DEFAULT 0,
    "usage_location" "text",
    "tenant_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    CONSTRAINT "spare_part_request_items_quantity_delivered_check" CHECK (("quantity_delivered" >= (0)::numeric)),
    CONSTRAINT "spare_part_request_items_quantity_requested_check" CHECK (("quantity_requested" > (0)::numeric))
);


CREATE SEQUENCE IF NOT EXISTS "public"."spare_part_request_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


CREATE TABLE IF NOT EXISTS "public"."spare_part_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "request_number" "text",
    "technician_name" "text" NOT NULL,
    "status" "text" DEFAULT 'OPEN'::"text" NOT NULL,
    "priority" "text" DEFAULT 'NORMAL'::"text" NOT NULL,
    "delivered_to" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "spare_part_requests_priority_check" CHECK (("priority" = ANY (ARRAY['NORMAL'::"text", 'HIGH'::"text", 'EMERGENCY'::"text"]))),
    CONSTRAINT "spare_part_requests_status_check" CHECK (("status" = ANY (ARRAY['OPEN'::"text", 'PARTIAL'::"text", 'CLOSED'::"text", 'PENDING_STOCK'::"text"])))
);


CREATE TABLE IF NOT EXISTS "public"."spare_part_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


CREATE TABLE IF NOT EXISTS "public"."stock_receptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reception_date" timestamp with time zone DEFAULT "now"(),
    "document_number" "text",
    "received_by" "uuid" DEFAULT "auth"."uid"(),
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "notes" "text",
    "tenant_id" "uuid" DEFAULT "auth"."uid"() NOT NULL
);


CREATE TABLE IF NOT EXISTS "public"."technicians" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "shift" "text",
    "status" "text" DEFAULT 'ACTIVE'::"text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


CREATE TABLE IF NOT EXISTS "public"."work_orders" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "machine_id" "text",
    "status" "text" NOT NULL,
    "current_stage" "text" NOT NULL,
    "priority" "text" NOT NULL,
    "assigned_to" "text",
    "description" "text",
    "created_date" timestamp with time zone DEFAULT "now"(),
    "completed_date" timestamp with time zone,
    "type" "text" NOT NULL,
    "form_type" "text" NOT NULL,
    "maintenance_type" "text",
    "machine_plate" "text",
    "interval_name" "text",
    "start_date" "text",
    "end_date" "text",
    "start_time" "text",
    "end_time" "text",
    "machine_work_hours" double precision,
    "next_maintenance_hours" double precision,
    "electromechanical_group" "text",
    "supervisor" "text",
    "total_maintenance_cost" double precision,
    "checklist" "jsonb" DEFAULT '{}'::"jsonb",
    "consumed_parts" "jsonb" DEFAULT '[]'::"jsonb",
    "executors" "jsonb" DEFAULT '[]'::"jsonb",
    "observations" "text",
    "assigned_mechanic" "text",
    "received_by" "text",
    "department" "text",
    "failure_type" "text",
    "frequency" "text",
    "consequence" "text",
    "action_taken" "text",
    "signature_executor" "text" DEFAULT false,
    "signature_supervisor" "text" DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "signature_executor_date" timestamp with time zone,
    "signature_supervisor_date" timestamp with time zone,
    "tasks" "jsonb" DEFAULT '[]'::"jsonb",
    "branch" "text",
    "equipment_type" "text",
    "condition" "text",
    "request_description" "text",
    "request_received_by" "uuid",
    "request_received_date" timestamp with time zone,
    "failures_and_activities" "jsonb",
    "closing_image" "text",
    "closing_file" "text",
    "supervisor_id" "uuid",
    "closing_date" timestamp with time zone,
    "display_id" character varying(20)
);


CREATE TABLE IF NOT EXISTS "public"."zones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "lines" "text"[],
    "x" numeric DEFAULT 0,
    "y" numeric DEFAULT 0,
    "width" numeric DEFAULT 0,
    "height" numeric DEFAULT 0,
    "color" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "order_index" integer DEFAULT 0
);


ALTER TABLE ONLY "public"."app_roles"
    ADD CONSTRAINT "app_roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."app_roles"
    ADD CONSTRAINT "app_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."asset_categories"
    ADD CONSTRAINT "asset_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."asset_categories"
    ADD CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."asset_types"
    ADD CONSTRAINT "asset_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."asset_types"
    ADD CONSTRAINT "asset_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."general_settings"
    ADD CONSTRAINT "general_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."machine_hour_logs"
    ADD CONSTRAINT "machine_hour_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."machines"
    ADD CONSTRAINT "machines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenance_intervals"
    ADD CONSTRAINT "maintenance_intervals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenance_protocols"
    ADD CONSTRAINT "maintenance_protocols_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenance_tasks"
    ADD CONSTRAINT "maintenance_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plant_settings"
    ADD CONSTRAINT "plant_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_requests"
    ADD CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skill_requests"
    ADD CONSTRAINT "skill_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spare_part_categories"
    ADD CONSTRAINT "spare_part_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."spare_part_categories"
    ADD CONSTRAINT "spare_part_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spare_part_locations"
    ADD CONSTRAINT "spare_part_locations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."spare_part_locations"
    ADD CONSTRAINT "spare_part_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spare_part_request_items"
    ADD CONSTRAINT "spare_part_request_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spare_part_requests"
    ADD CONSTRAINT "spare_part_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spare_part_requests"
    ADD CONSTRAINT "spare_part_requests_request_number_key" UNIQUE ("request_number");



ALTER TABLE ONLY "public"."spare_part_units"
    ADD CONSTRAINT "spare_part_units_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."spare_part_units"
    ADD CONSTRAINT "spare_part_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spare_parts"
    ADD CONSTRAINT "spare_parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_receptions"
    ADD CONSTRAINT "stock_receptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."technicians"
    ADD CONSTRAINT "technicians_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "uq_work_orders_display_id" UNIQUE ("display_id");



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zones"
    ADD CONSTRAINT "zones_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_app_roles_is_system" ON "public"."app_roles" USING "btree" ("is_system");



CREATE INDEX "idx_app_roles_name" ON "public"."app_roles" USING "btree" ("name");



CREATE INDEX "idx_app_roles_parent" ON "public"."app_roles" USING "btree" ("parent_role_id");



CREATE INDEX "idx_app_roles_permissions" ON "public"."app_roles" USING "gin" ("permissions");



CREATE INDEX "idx_machine_hour_logs_machine_id" ON "public"."machine_hour_logs" USING "btree" ("machine_id");



CREATE INDEX "idx_machines_name" ON "public"."machines" USING "btree" ("name");



CREATE INDEX "idx_machines_status" ON "public"."machines" USING "btree" ("status");



CREATE INDEX "idx_machines_type" ON "public"."machines" USING "btree" ("type");



CREATE INDEX "idx_machines_zone" ON "public"."machines" USING "btree" ("zone");



CREATE INDEX "idx_spare_part_request_items_part" ON "public"."spare_part_request_items" USING "btree" ("part_id");



CREATE INDEX "idx_spare_part_request_items_request" ON "public"."spare_part_request_items" USING "btree" ("request_id");



CREATE INDEX "idx_spare_part_requests_tenant" ON "public"."spare_part_requests" USING "btree" ("tenant_id");



CREATE INDEX "idx_work_orders_created_date" ON "public"."work_orders" USING "btree" ("created_date");



CREATE INDEX "idx_work_orders_machine_id" ON "public"."work_orders" USING "btree" ("machine_id");



CREATE INDEX "idx_work_orders_status" ON "public"."work_orders" USING "btree" ("status");



CREATE INDEX "machines_created_at_idx" ON "public"."machines" USING "btree" ("created_at");



CREATE INDEX "machines_is_active_idx" ON "public"."machines" USING "btree" ("is_active");



CREATE INDEX "spare_parts_created_at_idx" ON "public"."spare_parts" USING "btree" ("created_at");



CREATE INDEX "work_orders_action_taken_idx" ON "public"."work_orders" USING "btree" ("action_taken");



CREATE INDEX "work_orders_assigned_mechanic_idx" ON "public"."work_orders" USING "btree" ("assigned_mechanic");



CREATE INDEX "work_orders_assigned_to_idx" ON "public"."work_orders" USING "btree" ("assigned_to");



CREATE INDEX "work_orders_branch_idx" ON "public"."work_orders" USING "btree" ("branch");



CREATE INDEX "work_orders_closing_date_idx" ON "public"."work_orders" USING "btree" ("closing_date");



CREATE INDEX "work_orders_closing_file_idx" ON "public"."work_orders" USING "btree" ("closing_file");



CREATE INDEX "work_orders_closing_image_idx" ON "public"."work_orders" USING "btree" ("closing_image");



CREATE INDEX "work_orders_completed_date_idx" ON "public"."work_orders" USING "btree" ("completed_date");



CREATE INDEX "work_orders_condition_idx" ON "public"."work_orders" USING "btree" ("condition");



CREATE INDEX "work_orders_consequence_idx" ON "public"."work_orders" USING "btree" ("consequence");



CREATE INDEX "work_orders_current_stage_idx" ON "public"."work_orders" USING "btree" ("current_stage");



CREATE INDEX "work_orders_department_idx" ON "public"."work_orders" USING "btree" ("department");



CREATE INDEX "work_orders_description_idx" ON "public"."work_orders" USING "btree" ("description");



CREATE INDEX "work_orders_electromechanical_group_idx" ON "public"."work_orders" USING "btree" ("electromechanical_group");



CREATE INDEX "work_orders_end_date_idx" ON "public"."work_orders" USING "btree" ("end_date");



CREATE INDEX "work_orders_end_time_idx" ON "public"."work_orders" USING "btree" ("end_time");



CREATE INDEX "work_orders_equipment_type_idx" ON "public"."work_orders" USING "btree" ("equipment_type");



CREATE INDEX "work_orders_failure_type_idx" ON "public"."work_orders" USING "btree" ("failure_type");



CREATE INDEX "work_orders_form_type_idx" ON "public"."work_orders" USING "btree" ("form_type");



CREATE INDEX "work_orders_frequency_idx" ON "public"."work_orders" USING "btree" ("frequency");



CREATE INDEX "work_orders_interval_name_idx" ON "public"."work_orders" USING "btree" ("interval_name");



CREATE INDEX "work_orders_machine_plate_idx" ON "public"."work_orders" USING "btree" ("machine_plate");



CREATE INDEX "work_orders_machine_work_hours_idx" ON "public"."work_orders" USING "btree" ("machine_work_hours");



CREATE INDEX "work_orders_maintenance_type_idx" ON "public"."work_orders" USING "btree" ("maintenance_type");



CREATE INDEX "work_orders_next_maintenance_hours_idx" ON "public"."work_orders" USING "btree" ("next_maintenance_hours");



CREATE INDEX "work_orders_observations_idx" ON "public"."work_orders" USING "btree" ("observations");



CREATE INDEX "work_orders_priority_idx" ON "public"."work_orders" USING "btree" ("priority");



CREATE INDEX "work_orders_received_by_idx" ON "public"."work_orders" USING "btree" ("received_by");



CREATE INDEX "work_orders_request_description_idx" ON "public"."work_orders" USING "btree" ("request_description");



CREATE INDEX "work_orders_request_received_by_idx" ON "public"."work_orders" USING "btree" ("request_received_by");



CREATE INDEX "work_orders_request_received_date_idx" ON "public"."work_orders" USING "btree" ("request_received_date");



CREATE INDEX "work_orders_signature_executor_date_idx" ON "public"."work_orders" USING "btree" ("signature_executor_date");



CREATE INDEX "work_orders_signature_executor_idx" ON "public"."work_orders" USING "btree" ("signature_executor");



CREATE INDEX "work_orders_signature_supervisor_date_idx" ON "public"."work_orders" USING "btree" ("signature_supervisor_date");



CREATE INDEX "work_orders_signature_supervisor_idx" ON "public"."work_orders" USING "btree" ("signature_supervisor");



CREATE INDEX "work_orders_start_date_idx" ON "public"."work_orders" USING "btree" ("start_date");



CREATE INDEX "work_orders_start_time_idx" ON "public"."work_orders" USING "btree" ("start_time");



CREATE INDEX "work_orders_supervisor_id_idx" ON "public"."work_orders" USING "btree" ("supervisor_id");



CREATE INDEX "work_orders_supervisor_idx" ON "public"."work_orders" USING "btree" ("supervisor");



CREATE INDEX "work_orders_title_idx" ON "public"."work_orders" USING "btree" ("title");



CREATE INDEX "work_orders_total_maintenance_cost_idx" ON "public"."work_orders" USING "btree" ("total_maintenance_cost");



CREATE INDEX "work_orders_type_idx" ON "public"."work_orders" USING "btree" ("type");



CREATE INDEX "work_orders_updated_at_idx" ON "public"."work_orders" USING "btree" ("updated_at");



CREATE OR REPLACE TRIGGER "handle_updated_at_skill_requests" BEFORE UPDATE ON "public"."skill_requests" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "tr_generate_display_id" BEFORE INSERT ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."fn_generate_work_order_display_id"();



CREATE OR REPLACE TRIGGER "tr_generate_spare_part_request_number" BEFORE INSERT ON "public"."spare_part_requests" FOR EACH ROW EXECUTE FUNCTION "public"."fn_generate_spare_part_request_number"();



CREATE OR REPLACE TRIGGER "trigger_spare_parts_notification" AFTER UPDATE ON "public"."spare_parts" FOR EACH ROW EXECUTE FUNCTION "public"."send_email_notification_webhook"();



CREATE OR REPLACE TRIGGER "trigger_update_app_roles_updated_at" BEFORE UPDATE ON "public"."app_roles" FOR EACH ROW EXECUTE FUNCTION "public"."update_app_roles_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_validate_role_hierarchy" BEFORE INSERT OR UPDATE ON "public"."app_roles" FOR EACH ROW EXECUTE FUNCTION "public"."validate_role_hierarchy"();



CREATE OR REPLACE TRIGGER "trigger_work_orders_notification" AFTER INSERT ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."send_email_notification_webhook"();



ALTER TABLE ONLY "public"."app_roles"
    ADD CONSTRAINT "app_roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."app_roles"
    ADD CONSTRAINT "app_roles_parent_role_id_fkey" FOREIGN KEY ("parent_role_id") REFERENCES "public"."app_roles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."app_roles"
    ADD CONSTRAINT "app_roles_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."maintenance_intervals"
    ADD CONSTRAINT "maintenance_intervals_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "public"."maintenance_protocols"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_protocols"
    ADD CONSTRAINT "maintenance_protocols_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_tasks"
    ADD CONSTRAINT "maintenance_tasks_interval_id_fkey" FOREIGN KEY ("interval_id") REFERENCES "public"."maintenance_intervals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."app_roles"("id");



ALTER TABLE ONLY "public"."purchase_requests"
    ADD CONSTRAINT "purchase_requests_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."spare_part_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_requests"
    ADD CONSTRAINT "skill_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spare_part_request_items"
    ADD CONSTRAINT "spare_part_request_items_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "public"."spare_parts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."spare_part_request_items"
    ADD CONSTRAINT "spare_part_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."spare_part_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_request_received_by_fkey" FOREIGN KEY ("request_received_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."profiles"("id");



CREATE POLICY "Administradores pueden actualizar roles" ON "public"."app_roles" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Administradores pueden crear roles" ON "public"."app_roles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Administradores pueden eliminar roles no-sistema" ON "public"."app_roles" FOR DELETE TO "authenticated" USING (("is_system" = false));



CREATE POLICY "Admins can delete any profile" ON "public"."profiles" FOR DELETE USING ("public"."coreflow_is_admin"());



CREATE POLICY "Admins can insert any profile" ON "public"."profiles" FOR INSERT WITH CHECK ("public"."coreflow_is_admin"());



CREATE POLICY "Admins can update any profile" ON "public"."profiles" FOR UPDATE USING ("public"."coreflow_is_admin"());



CREATE POLICY "Admins can update profiles" ON "public"."profiles" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."role_id" IN ( SELECT "app_roles"."id"
           FROM "public"."app_roles"
          WHERE (("app_roles"."name" = 'Admin'::"text") OR ("app_roles"."is_system" = true))))))));



CREATE POLICY "Admins update all skill requests" ON "public"."skill_requests" FOR UPDATE USING ("public"."coreflow_is_admin"()) WITH CHECK ("public"."coreflow_is_admin"());



CREATE POLICY "Admins view all skill requests" ON "public"."skill_requests" FOR SELECT USING ("public"."coreflow_is_admin"());



CREATE POLICY "Allow All Logs" ON "public"."machine_hour_logs" USING (true) WITH CHECK (true);



CREATE POLICY "Allow All Orders" ON "public"."work_orders" USING (true) WITH CHECK (true);



CREATE POLICY "Allow All Parts" ON "public"."spare_parts" USING (true) WITH CHECK (true);



CREATE POLICY "Allow All Techs" ON "public"."technicians" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to delete machines" ON "public"."machines" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to insert machines" ON "public"."machines" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to read machines" ON "public"."machines" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to update machines" ON "public"."machines" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for all users" ON "public"."work_orders" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for spare_parts" ON "public"."spare_parts" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for technicians" ON "public"."technicians" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for zones" ON "public"."zones" USING (true) WITH CHECK (true);



CREATE POLICY "Enable delete for authenticated users" ON "public"."machine_hour_logs" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert for authenticated users" ON "public"."machine_hour_logs" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert for authenticated users" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."asset_categories" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."asset_types" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."branches" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."machine_hour_logs" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."profiles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable update for authenticated users" ON "public"."machine_hour_logs" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Only admins can insert roles" ON "public"."roles" FOR INSERT WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Permitir todo acceso público" ON "public"."machines" USING (true) WITH CHECK (true);



CREATE POLICY "Permitir todo acceso público" ON "public"."maintenance_intervals" USING (true) WITH CHECK (true);



CREATE POLICY "Permitir todo acceso público" ON "public"."maintenance_protocols" USING (true) WITH CHECK (true);



CREATE POLICY "Permitir todo acceso público" ON "public"."maintenance_tasks" USING (true) WITH CHECK (true);



CREATE POLICY "Public Read Categories" ON "public"."spare_part_categories" FOR SELECT USING (true);



CREATE POLICY "Public Read Locations" ON "public"."spare_part_locations" FOR SELECT USING (true);



CREATE POLICY "Public Read Settings" ON "public"."general_settings" FOR SELECT USING (true);



CREATE POLICY "Public Read Settings" ON "public"."plant_settings" FOR SELECT USING (true);



CREATE POLICY "Public Read Units" ON "public"."spare_part_units" FOR SELECT USING (true);



CREATE POLICY "Public Write AssetTypes" ON "public"."asset_types" USING (true) WITH CHECK (true);



CREATE POLICY "Public Write Branches" ON "public"."branches" USING (true) WITH CHECK (true);



CREATE POLICY "Public Write Categories" ON "public"."asset_categories" USING (true) WITH CHECK (true);



CREATE POLICY "Public Write Categories" ON "public"."spare_part_categories" USING (true) WITH CHECK (true);



CREATE POLICY "Public Write Locations" ON "public"."spare_part_locations" USING (true) WITH CHECK (true);



CREATE POLICY "Public Write Settings" ON "public"."general_settings" USING (true) WITH CHECK (true);



CREATE POLICY "Public Write Settings" ON "public"."plant_settings" USING (true) WITH CHECK (true);



CREATE POLICY "Public Write Units" ON "public"."spare_part_units" USING (true) WITH CHECK (true);



CREATE POLICY "Roles are viewable by everyone" ON "public"."roles" FOR SELECT USING (true);



CREATE POLICY "Tenant Isolation purchase_requests" ON "public"."purchase_requests" USING (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Tenant Isolation spare_part_request_items" ON "public"."spare_part_request_items" USING (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Tenant Isolation spare_part_requests" ON "public"."spare_part_requests" USING (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Tenant Isolation stock_receptions" ON "public"."stock_receptions" USING (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Users can edit own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can see themselves" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile preferences" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users insert own skill requests" ON "public"."skill_requests" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users view own skill requests" ON "public"."skill_requests" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users view tenant profiles" ON "public"."profiles" FOR SELECT USING (("tenant_id" = "public"."coreflow_get_tenant_id"()));



CREATE POLICY "Usuarios autenticados pueden leer roles" ON "public"."app_roles" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."app_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."asset_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."asset_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."branches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."general_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."machine_hour_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."machines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_intervals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_protocols" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plant_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."skill_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spare_part_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spare_part_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spare_part_request_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spare_part_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spare_part_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spare_parts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_receptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."technicians" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zones" ENABLE ROW LEVEL SECURITY;



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





GRANT ALL ON TABLE "public"."spare_parts" TO "anon";
GRANT ALL ON TABLE "public"."spare_parts" TO "authenticated";
GRANT ALL ON TABLE "public"."spare_parts" TO "service_role";




GRANT ALL ON TABLE "public"."app_roles" TO "anon";
GRANT ALL ON TABLE "public"."app_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."app_roles" TO "service_role";



GRANT ALL ON TABLE "public"."asset_categories" TO "anon";
GRANT ALL ON TABLE "public"."asset_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."asset_categories" TO "service_role";



GRANT ALL ON TABLE "public"."asset_types" TO "anon";
GRANT ALL ON TABLE "public"."asset_types" TO "authenticated";
GRANT ALL ON TABLE "public"."asset_types" TO "service_role";



GRANT ALL ON TABLE "public"."branches" TO "anon";
GRANT ALL ON TABLE "public"."branches" TO "authenticated";
GRANT ALL ON TABLE "public"."branches" TO "service_role";



GRANT ALL ON TABLE "public"."general_settings" TO "anon";
GRANT ALL ON TABLE "public"."general_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."general_settings" TO "service_role";



GRANT ALL ON TABLE "public"."machine_hour_logs" TO "anon";
GRANT ALL ON TABLE "public"."machine_hour_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."machine_hour_logs" TO "service_role";



GRANT ALL ON TABLE "public"."machines" TO "anon";
GRANT ALL ON TABLE "public"."machines" TO "authenticated";
GRANT ALL ON TABLE "public"."machines" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_intervals" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_intervals" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_intervals" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_protocols" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_protocols" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_protocols" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_tasks" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."plant_settings" TO "anon";
GRANT ALL ON TABLE "public"."plant_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."plant_settings" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_requests" TO "anon";
GRANT ALL ON TABLE "public"."purchase_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_requests" TO "service_role";



GRANT ALL ON SEQUENCE "public"."rmant02_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."rmant02_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."rmant02_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."rmant05_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."rmant05_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."rmant05_seq" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."skill_requests" TO "anon";
GRANT ALL ON TABLE "public"."skill_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."skill_requests" TO "service_role";



GRANT ALL ON TABLE "public"."spare_part_categories" TO "anon";
GRANT ALL ON TABLE "public"."spare_part_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."spare_part_categories" TO "service_role";



GRANT ALL ON TABLE "public"."spare_part_locations" TO "anon";
GRANT ALL ON TABLE "public"."spare_part_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."spare_part_locations" TO "service_role";



GRANT ALL ON TABLE "public"."spare_part_request_items" TO "anon";
GRANT ALL ON TABLE "public"."spare_part_request_items" TO "authenticated";
GRANT ALL ON TABLE "public"."spare_part_request_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."spare_part_request_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."spare_part_request_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."spare_part_request_seq" TO "service_role";



GRANT ALL ON TABLE "public"."spare_part_requests" TO "anon";
GRANT ALL ON TABLE "public"."spare_part_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."spare_part_requests" TO "service_role";



GRANT ALL ON TABLE "public"."spare_part_units" TO "anon";
GRANT ALL ON TABLE "public"."spare_part_units" TO "authenticated";
GRANT ALL ON TABLE "public"."spare_part_units" TO "service_role";



GRANT ALL ON TABLE "public"."stock_receptions" TO "anon";
GRANT ALL ON TABLE "public"."stock_receptions" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_receptions" TO "service_role";



GRANT ALL ON TABLE "public"."technicians" TO "anon";
GRANT ALL ON TABLE "public"."technicians" TO "authenticated";
GRANT ALL ON TABLE "public"."technicians" TO "service_role";



GRANT ALL ON TABLE "public"."work_orders" TO "anon";
GRANT ALL ON TABLE "public"."work_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."work_orders" TO "service_role";



GRANT ALL ON TABLE "public"."zones" TO "anon";
GRANT ALL ON TABLE "public"."zones" TO "authenticated";
GRANT ALL ON TABLE "public"."zones" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































