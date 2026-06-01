-- =============================================================================
-- Fix: Función RPC para actualizar perfil de usuario sin conflictos de constraints
-- Esto es más robusto que upsert cuando hay múltiples constraints UNIQUE
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id     uuid,
  p_full_name   text,
  p_role_id     uuid,
  p_job_title   text,
  p_company_code text,
  p_specialties text[],
  p_tenant_id   text,
  p_status      text DEFAULT 'ACTIVE',
  p_requires_password_change boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  UPDATE public.profiles
  SET
    full_name               = p_full_name,
    role_id                 = p_role_id,
    job_title               = p_job_title,
    company_code            = p_company_code,
    specialties             = p_specialties,
    tenant_id               = p_tenant_id,
    status                  = p_status,
    requires_password_change = p_requires_password_change,
    updated_at              = now()
  WHERE id = p_user_id
  RETURNING json_build_object(
    'id', id,
    'role_id', role_id,
    'job_title', job_title,
    'company_code', company_code
  ) INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'No profile found for user_id: %', p_user_id;
  END IF;

  RETURN result;
END;
$$;

-- Grant execution to service_role (usado por el edge function)
GRANT EXECUTE ON FUNCTION public.update_user_profile TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_profile TO authenticated;
