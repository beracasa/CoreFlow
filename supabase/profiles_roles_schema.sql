-- =============================================================================
-- CoreFlow User & Role Management Schema
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. PROFILES (Extends auth.users)
-- =============================================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  
  -- Role Management
  role text default 'TECNICO_MANT', -- 'ADMIN_SOLICITANTE', 'AUDITOR', etc.
  job_title text,
  
  -- Organization
  tenant_id text default 'primary',
  branch_id uuid, -- Optional link to branch
  
  -- Status
  status text default 'ACTIVE', -- 'ACTIVE', 'INACTIVE', 'INVITED'
  
  -- Metadata
  specialties text[], -- Array of strings e.g. ['Hydraulics', 'Electric']
  last_seen timestamptz,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- =============================================================================
-- 2. ROLES (RBAC Definitions)
-- =============================================================================
create table if not exists public.roles (
  id text primary key, -- e.g. 'admin', 'technician' (slug)
  name text not null,
  description text,
  
  is_system boolean default false,
  permissions text[], -- Array of permission strings e.g. ['create_wo', 'view_dashboard']
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Roles
alter table public.roles enable row level security;

create policy "Roles are viewable by everyone"
  on roles for select
  using ( true );

create policy "Only admins can insert roles"
  on roles for insert
  with check ( auth.jwt() ->> 'role' = 'service_role' ); -- Simplification for now

-- =============================================================================
-- 3. TRIGGERS
-- =============================================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'TECNICO_MANT');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
