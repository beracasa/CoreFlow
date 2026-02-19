-- =============================================================================
-- Migration: Add company_code to profiles and ensure 'Nuevo Usuario' role
-- Date: 2024-02-19
-- =============================================================================

-- 1. Add company_code to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_code text;

-- 2. Validate/Create 'Nuevo Usuario' role in app_roles
-- We need a fixed ID or lookup method. We'll try to find it by name 'Nuevo Usuario'
-- If it doesn't exist, we insert it.

DO $$
DECLARE
    new_user_role_id UUID;
BEGIN
    -- Check if 'Nuevo Usuario' role exists
    SELECT id INTO new_user_role_id FROM public.app_roles WHERE name = 'Nuevo Usuario';
    
    IF new_user_role_id IS NULL THEN
        INSERT INTO public.app_roles (name, description, is_system, permissions)
        VALUES (
            'Nuevo Usuario', 
            'Rol por defecto para nuevos usuarios. Sin permisos hasta aprobación.',
            TRUE, 
            '{}'::jsonb
        )
        RETURNING id INTO new_user_role_id;
    END IF;
    
    -- Optional: Update existing profiles with NULL role to use this new ID?
    -- UPDATE public.profiles SET role = new_user_role_id::text WHERE role IS NULL;
    
    RAISE NOTICE 'Role Nuevo Usuario ensured. ID: %', new_user_role_id;
END $$;

-- 3. Update the value of 'role' column in profiles to link to app_roles.id for new users?
-- The prompt implies we want to use the new System Roles (app_roles) for the User Role field.
-- However, profiles.role is currently a TEXT column with values like 'TECNICO_MANT'.
-- We should probably keep it text but store the ID of the app_role effectively.

-- 4. Update the handle_new_user trigger function to default to 'Nuevo Usuario'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id UUID;
BEGIN
    -- Look up the 'Nuevo Usuario' role ID
    SELECT id INTO default_role_id FROM public.app_roles WHERE name = 'Nuevo Usuario' LIMIT 1;

    -- If not found (should be impossible due to step 2, but safety net), fallback to a known value or NULL
    -- Inserting into profiles
    INSERT INTO public.profiles (id, email, full_name, role, status)
    VALUES (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name', 
        COALESCE(default_role_id::text, 'TECNICO_MANT'), -- Use the ID if found
        'ACTIVE' -- Or 'PENDING' if we want them to wait? Prompt says "Sign Up... assigns role Nuevo Usuario". Use ACTIVE status but weak role.
    );
    return new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
