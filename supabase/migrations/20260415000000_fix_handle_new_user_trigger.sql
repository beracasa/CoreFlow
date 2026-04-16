-- =============================================================================
-- Fix: handle_new_user trigger - preserve all profile fields from user_metadata
-- =============================================================================
-- Problema: el trigger anterior solo guardaba id, email, full_name y role='TECNICO_MANT'
-- ignorando role_id, job_title, company_code y specialties que envía el edge function.
-- Esta versión lee todos los campos desde raw_user_meta_data para consistencia.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role_id,
    job_title,
    company_code,
    specialties,
    tenant_id,
    status,
    requires_password_change
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    -- role_id es un UUID; lo casteamos o dejamos NULL si no viene
    CASE
      WHEN NEW.raw_user_meta_data->>'role_id' IS NOT NULL
       AND NEW.raw_user_meta_data->>'role_id' != ''
      THEN (NEW.raw_user_meta_data->>'role_id')::uuid
      ELSE NULL
    END,
    COALESCE(NEW.raw_user_meta_data->>'job_title', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_code', ''),
    -- specialties es un array de texto; lo parseamos desde JSON si existe
    CASE
      WHEN NEW.raw_user_meta_data->'specialties' IS NOT NULL
      THEN ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'specialties'))
      ELSE ARRAY[]::text[]
    END,
    COALESCE(NEW.raw_user_meta_data->>'tenant_id', 'primary'),
    'ACTIVE',
    -- Si viene del edge function admin, forzar cambio de contraseña
    COALESCE((NEW.raw_user_meta_data->>'requires_password_change')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name               = EXCLUDED.full_name,
    role_id                 = EXCLUDED.role_id,
    job_title               = EXCLUDED.job_title,
    company_code            = EXCLUDED.company_code,
    specialties             = EXCLUDED.specialties,
    tenant_id               = EXCLUDED.tenant_id,
    status                  = EXCLUDED.status,
    requires_password_change = EXCLUDED.requires_password_change;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-crear el trigger (ya existe, solo actualizamos la función)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
