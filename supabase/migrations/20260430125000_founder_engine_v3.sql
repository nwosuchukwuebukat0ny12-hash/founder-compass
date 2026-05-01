-- =============================================================
-- FOUNDER COMPASS: FOUNDER ENGINE v3
-- Migration: 20260430125000_founder_engine_v3.sql
-- Adds: milestones, team_members, weekly_vitals, achievements
-- =============================================================

-- ---------------------------------------------------------------
-- 1. MILESTONES (Targets, Tasks & Top Priorities)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.milestones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id  UUID REFERENCES public.startups(id) ON DELETE CASCADE NOT NULL,
    founder_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    title       TEXT NOT NULL,
    category    TEXT DEFAULT 'General', -- e.g. 'Revenue', 'Product', 'Team', 'Hiring'
    type        TEXT DEFAULT 'task',    -- 'task' | 'target'
    status      TEXT DEFAULT 'Backlog', -- 'Today' | 'Backlog' | 'Done' | 'Delayed'
    priority    TEXT DEFAULT 'Medium',  -- 'High' | 'Medium' | 'Low'
    is_pinned   BOOLEAN DEFAULT false,  -- true = shown as "Top Priority" on Dashboard
    progress    INTEGER DEFAULT 0,      -- 0-100 (for targets/goals)
    deadline    DATE,

    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders can manage their own milestones" ON public.milestones;
CREATE POLICY "Founders can manage their own milestones"
ON public.milestones FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.startup_id = milestones.startup_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.startup_id = milestones.startup_id
    )
);

DROP POLICY IF EXISTS "Admins can view all milestones" ON public.milestones;
CREATE POLICY "Admins can view all milestones"
ON public.milestones FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);


-- ---------------------------------------------------------------
-- 2. TEAM MEMBERS (Real Team Directory)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id  UUID REFERENCES public.startups(id) ON DELETE CASCADE NOT NULL,

    full_name   TEXT NOT NULL,
    role        TEXT NOT NULL,           -- e.g. 'CEO', 'Lead Developer'
    avatar_url  TEXT,
    linkedin    TEXT,
    current_focus TEXT,                  -- e.g. 'Working on V2 launch'
    is_founder  BOOLEAN DEFAULT false,

    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders can manage their own team" ON public.team_members;
CREATE POLICY "Founders can manage their own team"
ON public.team_members FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.startup_id = team_members.startup_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.startup_id = team_members.startup_id
    )
);

DROP POLICY IF EXISTS "Admins can view all team members" ON public.team_members;
CREATE POLICY "Admins can view all team members"
ON public.team_members FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);


-- ---------------------------------------------------------------
-- 3. WEEKLY VITALS (High-Frequency Momentum Tracker)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_vitals (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id  UUID REFERENCES public.startups(id) ON DELETE CASCADE NOT NULL,
    founder_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    week_start  DATE NOT NULL,           -- ISO Monday of the week
    revenue     NUMERIC DEFAULT 0,       -- Weekly revenue figure
    top_win     TEXT,                    -- One sentence win

    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.weekly_vitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders can manage their own weekly vitals" ON public.weekly_vitals;
CREATE POLICY "Founders can manage their own weekly vitals"
ON public.weekly_vitals FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.startup_id = weekly_vitals.startup_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.startup_id = weekly_vitals.startup_id
    )
);

DROP POLICY IF EXISTS "Admins can view all weekly vitals" ON public.weekly_vitals;
CREATE POLICY "Admins can view all weekly vitals"
ON public.weekly_vitals FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);


-- ---------------------------------------------------------------
-- 4. ACHIEVEMENTS (Auto-logged wins & completed targets)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.achievements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id  UUID REFERENCES public.startups(id) ON DELETE CASCADE NOT NULL,
    founder_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    title       TEXT NOT NULL,          -- e.g. "Hit $10k MRR"
    source      TEXT DEFAULT 'manual',  -- 'manual' | 'milestone' | 'pulse'
    source_id   UUID,                   -- Reference to the milestone or pulse that triggered it
    achieved_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders can manage their own achievements" ON public.achievements;
CREATE POLICY "Founders can manage their own achievements"
ON public.achievements FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.startup_id = achievements.startup_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.startup_id = achievements.startup_id
    )
);

DROP POLICY IF EXISTS "Admins can view all achievements" ON public.achievements;
CREATE POLICY "Admins can view all achievements"
ON public.achievements FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);


-- ---------------------------------------------------------------
-- 5. EXTEND PULSES: team_morale (Team Pulse feature)
-- ---------------------------------------------------------------
ALTER TABLE public.pulses
ADD COLUMN IF NOT EXISTS team_morale INTEGER DEFAULT NULL; -- Score 1-10

-- ---------------------------------------------------------------
-- 6. EXTEND STARTUPS: open_ask & value_proposition
-- ---------------------------------------------------------------
ALTER TABLE public.startups
ADD COLUMN IF NOT EXISTS open_ask TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS value_proposition TEXT DEFAULT NULL;
