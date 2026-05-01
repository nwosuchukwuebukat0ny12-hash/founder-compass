-- 1. Create the Pulses table (Consolidating financials and narrative)
CREATE TABLE IF NOT EXISTS pulses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE NOT NULL,
    founder_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    month TEXT NOT NULL, -- Format: "YYYY-MM"
    
    -- Hard Numbers
    mrr NUMERIC DEFAULT 0,
    expenses NUMERIC DEFAULT 0,
    cash_in_bank NUMERIC DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    lost_users INTEGER DEFAULT 0,
    team_size INTEGER DEFAULT 1,
    
    -- Narrative
    win TEXT,
    blocker TEXT,
    ask TEXT,
    fundraising_status TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on all critical tables
ALTER TABLE startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE startup_updates ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies (Idempotent)

-- Profiles: Users can see their own profile
DROP POLICY IF EXISTS "Users can see their own profile" ON profiles;
CREATE POLICY "Users can see their own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Startups: Founders can only see their own startup
DROP POLICY IF EXISTS "Founders can see their own startup" ON startups;
CREATE POLICY "Founders can see their own startup" 
ON startups FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.startup_id = startups.id
    )
);

-- Pulses: Founders can see and insert their own pulses
DROP POLICY IF EXISTS "Founders can manage their own pulses" ON pulses;
CREATE POLICY "Founders can manage their own pulses" 
ON pulses FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.startup_id = pulses.startup_id
    )
);

-- Admin Access: Role-based access for Lab Leads
DROP POLICY IF EXISTS "Admins can see everything" ON startups;
CREATE POLICY "Admins can see everything" 
ON startups FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Admins can see all pulses" ON pulses;
CREATE POLICY "Admins can see all pulses" 
ON pulses FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- 4. Clear Mock Data (The Wipe)
-- Note: TRUNCATE is safe to run multiple times, it just ensures the tables are empty.
TRUNCATE TABLE startup_financials;
TRUNCATE TABLE startup_updates;
