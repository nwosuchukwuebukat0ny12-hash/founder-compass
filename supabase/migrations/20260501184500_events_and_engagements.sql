-- Create external_engagements table
CREATE TABLE IF NOT EXISTS public.external_engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    startup_id UUID REFERENCES public.startups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    location TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    goal TEXT,
    status TEXT DEFAULT 'Confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for all related tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_engagements ENABLE ROW LEVEL SECURITY;

-- 1. Events (Global): Anyone authenticated can view events. Only admins can modify (admin check assumed elsewhere or managed via Supabase Dashboard)
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
CREATE POLICY "Anyone can view events" 
ON public.events FOR SELECT 
TO authenticated 
USING (true);

-- 2. Event Attendees (RSVPs): Founders manage their own RSVPs
DROP POLICY IF EXISTS "Founders manage own RSVPs" ON public.event_attendees;
CREATE POLICY "Founders manage own RSVPs" 
ON public.event_attendees FOR ALL 
TO authenticated 
USING (startup_id IN (SELECT startup_id FROM profiles WHERE id = auth.uid()));

-- 3. External Engagements: Founders manage their own external engagements
DROP POLICY IF EXISTS "Founders manage own engagements" ON public.external_engagements;
CREATE POLICY "Founders manage own engagements"
ON public.external_engagements FOR ALL
TO authenticated
USING (startup_id IN (SELECT startup_id FROM profiles WHERE id = auth.uid()));
