-- =============================================================================
-- CoreFlow Fix: Enable Admin Access to Profiles
-- =============================================================================

-- 1. Allow Admins to UPDATE any profile
-- Checks if the *current user* (auth.uid()) has the role 'ADMIN_SOLICITANTE' in the profiles table.
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN_SOLICITANTE'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN_SOLICITANTE'
  )
);

-- 2. Allow Admins to DELETE any profile
CREATE POLICY "Admins can delete any profile"
ON public.profiles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN_SOLICITANTE'
  )
);

-- 3. Allow Admins to INSERT any profile (for invitations/manual creation)
CREATE POLICY "Admins can insert any profile"
ON public.profiles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN_SOLICITANTE'
  )
);

-- 4. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Grant permissions
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
