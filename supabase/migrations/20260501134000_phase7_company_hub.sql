-- Phase 7: Company Hub Migration

-- 1. Add fields to profiles (personal identity)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS country text;

-- 2. Add fields to startups (brand identity)
ALTER TABLE public.startups
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;

-- 3. Add fields to team_members
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS bio text;

-- 4. Create hiring_roles table
CREATE TABLE IF NOT EXISTS public.hiring_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id uuid REFERENCES public.startups(id) ON DELETE CASCADE,
    role_title text NOT NULL,
    department text,
    status text DEFAULT 'Planned', -- Planned, Sourcing, Interviewing, Offered, Filled
    priority text DEFAULT 'Medium', -- Low, Medium, High
    description_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.hiring_roles ENABLE ROW LEVEL SECURITY;

-- Add Policies
CREATE POLICY "Users can view hiring roles for their startup"
    ON public.hiring_roles FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.startup_id = hiring_roles.startup_id
    ));

CREATE POLICY "Users can insert hiring roles for their startup"
    ON public.hiring_roles FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.startup_id = hiring_roles.startup_id
    ));

CREATE POLICY "Users can update hiring roles for their startup"
    ON public.hiring_roles FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.startup_id = hiring_roles.startup_id
    ));

CREATE POLICY "Users can delete hiring roles for their startup"
    ON public.hiring_roles FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.startup_id = hiring_roles.startup_id
    ));
