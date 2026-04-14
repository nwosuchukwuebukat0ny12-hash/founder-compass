-- Add KPI metrics to startups table
ALTER TABLE public.startups
ADD COLUMN ltv_cac_ratio numeric DEFAULT 0,
ADD COLUMN monthly_burn_rate numeric DEFAULT 0,
ADD COLUMN mom_growth_rate numeric DEFAULT 0,
ADD COLUMN user_retention numeric DEFAULT 0,
ADD COLUMN runway_months numeric DEFAULT 0,
ADD COLUMN active_users integer DEFAULT 0,
ADD COLUMN is_delayed boolean DEFAULT false;

-- Create audit_logs table for Institutional Memory
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid NOT NULL,
    old_value text,
    new_value text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create notes table for internal staff context
CREATE TABLE IF NOT EXISTS public.notes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id uuid REFERENCES public.startups(id) ON DELETE CASCADE NOT NULL,
    author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    content text NOT NULL,
    is_private boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit logs"
ON public.audit_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view notes"
ON public.notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert notes"
ON public.notes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authors can update their own notes"
ON public.notes FOR UPDATE TO authenticated USING (auth.uid() = author_id);
