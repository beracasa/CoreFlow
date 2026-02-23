-- =============================================================================
-- CoreFlow Fix v4: Prevent RLS Infinite Recursion & Cleanup Policies
-- =============================================================================

-- 1. Helper Function: Get User's Tenant ID safely without triggering RLS
CREATE OR REPLACE FUNCTION public.coreflow_get_tenant_id()
RETURNS text AS $$
  -- We use a plain SQL query but marked as SECURITY DEFINER
  -- This runs as 'postgres' role which bypasses RLS and prevents recursion
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. Modify existing admin helper to ensure search_path is secure
CREATE OR REPLACE FUNCTION public.coreflow_is_admin()
RETURNS boolean AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Drop all potentially recursive policies
DROP POLICY IF EXISTS "Admins view tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for users in their own tenant" ON public.profiles;
DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;

-- 4. Re-create Clean Policies (No subqueries directly inside USING)

-- A. All authenticated users can see themselves (Basic Access)
CREATE POLICY "Users can see themselves" 
ON public.profiles FOR SELECT 
USING (id = auth.uid());

-- B. All authenticated users can view other profiles in their tenant
-- (This is necessary so technicians can assign work orders to others, etc.)
CREATE POLICY "Users view tenant profiles" 
ON public.profiles FOR SELECT 
USING (tenant_id = public.coreflow_get_tenant_id());

-- C. Admin update/delete/insert rules (These apply purely to modifications)
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
