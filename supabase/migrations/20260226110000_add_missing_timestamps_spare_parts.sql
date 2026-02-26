-- Add missing timestamp columns to spare_parts if they don't exist
-- Migration: 20260226110000_add_missing_timestamps_spare_parts.sql

ALTER TABLE public.spare_parts 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.spare_parts 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
