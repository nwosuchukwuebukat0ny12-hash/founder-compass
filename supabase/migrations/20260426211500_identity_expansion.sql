-- 1. Update 'profiles' table with founder-specific identity info
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- 2. Update 'startups' table with company identity info
ALTER TABLE startups 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS sector TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Add 'business_model' to startups to differentiate Local vs Tech
ALTER TABLE startups 
ADD COLUMN IF NOT EXISTS business_model TEXT DEFAULT 'tech_startup'; -- 'tech_startup' or 'local_business'
