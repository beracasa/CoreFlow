-- Migration: Add requires_password_change column to profiles
-- Description: Flag to force user to change password on first login

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT FALSE;
