-- Migration: Fix Row Level Security policies for spare part requests, purchase requests, and stock receptions
-- Description: Previously, RLS policies used `tenant_id = auth.uid()` where `tenant_id` defaulted to `auth.uid()`,
-- restricting each user to only viewing and managing records they personally created.
-- This migration replaces those policies so authenticated users can see and manage all requests across the organization.

-- 1. spare_part_requests
DROP POLICY IF EXISTS "Tenant Isolation spare_part_requests" ON public.spare_part_requests;
DROP POLICY IF EXISTS "Allow authenticated access spare_part_requests" ON public.spare_part_requests;
CREATE POLICY "Allow authenticated access spare_part_requests"
  ON public.spare_part_requests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. spare_part_request_items
DROP POLICY IF EXISTS "Tenant Isolation spare_part_request_items" ON public.spare_part_request_items;
DROP POLICY IF EXISTS "Allow authenticated access spare_part_request_items" ON public.spare_part_request_items;
CREATE POLICY "Allow authenticated access spare_part_request_items"
  ON public.spare_part_request_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. purchase_requests
DROP POLICY IF EXISTS "Tenant Isolation purchase_requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Allow authenticated access purchase_requests" ON public.purchase_requests;
CREATE POLICY "Allow authenticated access purchase_requests"
  ON public.purchase_requests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. purchase_request_items
DROP POLICY IF EXISTS "Tenant Isolation purchase_request_items" ON public.purchase_request_items;
DROP POLICY IF EXISTS "Allow authenticated access purchase_request_items" ON public.purchase_request_items;
CREATE POLICY "Allow authenticated access purchase_request_items"
  ON public.purchase_request_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. stock_receptions
DROP POLICY IF EXISTS "Tenant Isolation stock_receptions" ON public.stock_receptions;
DROP POLICY IF EXISTS "Allow authenticated access stock_receptions" ON public.stock_receptions;
CREATE POLICY "Allow authenticated access stock_receptions"
  ON public.stock_receptions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
