-- =============================================================================
-- CoreFlow Fix v3: Robust Role Type Alteration & Dynamic RLS Policies
-- =============================================================================

-- 1. Helper Function: Determines if the current authenticated user is an Admin
-- This handles BOTH the legacy 'ADMIN_SOLICITANTE' string and the new UUID role from app_roles.
CREATE OR REPLACE FUNCTION public.coreflow_is_admin()
RETURNS boolean AS $$
DECLARE
  v_role text;
  v_is_sys boolean;
  v_role_name text;
BEGIN
  -- Grab the current user's role from profiles
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  
  -- Legacy fallback
  IF v_role = 'ADMIN_SOLICITANTE' THEN
    RETURN true;
  END IF;

  -- Dynamic App Roles evaluation
  BEGIN
    SELECT is_system, name INTO v_is_sys, v_role_name 
    FROM public.app_roles 
    WHERE id = v_role::uuid;
    
    -- Check if it's a system admin role
    IF v_is_sys AND (v_role_name ILIKE '%Admin%') THEN
      RETURN true;
    END IF;
  EXCEPTION 
    WHEN invalid_text_representation THEN
      RETURN false; -- The role was a plain string like 'TECNICO_MANT'
  END;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Drop existing dependent policies
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins view tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins view tenant profiles v2" ON public.profiles;

-- 3. Update the handle_new_user trigger to use text instead of the strict enum
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, tenant_id)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'TECNICO_MANT'),
    COALESCE(new.raw_user_meta_data->>'tenant_id', 'primary')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Alter the column type to text
ALTER TABLE public.profiles 
  ALTER COLUMN role TYPE text 
  USING role::text;


-- 5. Re-create Policies using the helper function
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING ( public.coreflow_is_admin() )
WITH CHECK ( public.coreflow_is_admin() );

CREATE POLICY "Admins can delete any profile"
ON public.profiles FOR DELETE
USING ( public.coreflow_is_admin() );

CREATE POLICY "Admins can insert any profile"
ON public.profiles FOR INSERT
WITH CHECK ( public.coreflow_is_admin() );

CREATE POLICY "Admins view tenant profiles" 
ON public.profiles FOR SELECT 
USING (
  public.coreflow_is_admin() AND 
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);


-- 6. DYNAMIC MIGRATION: Update existing users carrying the legacy 'ADMIN_SOLICITANTE'
--    Wait, only update if the new `Administrador` role exists in app_roles.
DO $$
DECLARE
  v_admin_role_id uuid := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_roles WHERE id = v_admin_role_id) THEN
    UPDATE public.profiles 
    SET role = v_admin_role_id::text 
    WHERE role = 'ADMIN_SOLICITANTE';
  END IF;
END $$;
