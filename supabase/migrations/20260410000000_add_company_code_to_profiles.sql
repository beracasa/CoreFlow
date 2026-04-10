-- Migration to add company_code to profiles
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "company_code" text;
