-- 1. Ensure 'full_name' exists in profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 2. Ensure 'logos' bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Add Storage RLS for logos bucket so founders can upload
-- Drop existing policies if they exist to recreate them cleanly
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view logos" ON storage.objects;

-- Allow authenticated users to upload to 'logos'
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'logos');

-- Allow anyone to view logos
CREATE POLICY "Public can view logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'logos');
