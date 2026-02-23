-- =============================================================================
-- CoreFlow Migration: Skill Requests
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.skill_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_name text NOT NULL,
    status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.skill_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own requests
CREATE POLICY "Users view own skill requests" 
ON public.skill_requests FOR SELECT 
USING (user_id = auth.uid());

-- Policy: Users can create their own requests
CREATE POLICY "Users insert own skill requests" 
ON public.skill_requests FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Policy: Admins can view all requests
CREATE POLICY "Admins view all skill requests" 
ON public.skill_requests FOR SELECT 
USING ( public.coreflow_is_admin() );

-- Policy: Admins can update all requests (approve/reject)
CREATE POLICY "Admins update all skill requests" 
ON public.skill_requests FOR UPDATE 
USING ( public.coreflow_is_admin() )
WITH CHECK ( public.coreflow_is_admin() );

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
CREATE TRIGGER handle_updated_at_skill_requests BEFORE UPDATE ON public.skill_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
