
-- =============================================================================
-- COREFLOW 4.0 | AUTHENTICATION & RBAC MIGRATION
-- Author: Senior Security Architect
-- Description: Implementation of Profiles, Roles, and Tenant Isolation (RLS)
-- =============================================================================

-- 1. Create Enum for Roles (Strict Typing)
CREATE TYPE public.user_role AS ENUM ('ADMIN_SOLICITANTE', 'TECNICO_MANT', 'AUDITOR');

-- 2. Create Profiles Table (Extends auth.users)
-- This table holds application-specific data linked to the Supabase Auth Identity
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL, -- Critical for Multi-tenancy
  role public.user_role NOT NULL DEFAULT 'TECNICO_MANT',
  full_name TEXT,
  job_title TEXT,
  signature_url TEXT, -- Path to stored digital signature
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS (Row Level Security) - Zero Trust Architecture
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Policy: Admins can view all profiles within their Tenant
CREATE POLICY "Admins view tenant profiles" 
ON public.profiles FOR SELECT 
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE role = 'ADMIN_SOLICITANTE' AND tenant_id = profiles.tenant_id
  )
);

-- Policy: System wide tenant isolation example (for other tables like 'machines')
-- CREATE POLICY "Tenant Isolation" ON public.machines
-- USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 5. Trigger to auto-create profile on SignUp
-- This ensures every new user in auth.users has a corresponding entry in public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, tenant_id)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'TECNICO_MANT'),
    (new.raw_user_meta_data->>'tenant_id')::UUID
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Indexes for Performance
CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
