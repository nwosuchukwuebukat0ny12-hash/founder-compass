-- Add culture_tags to startups
ALTER TABLE public.startups
ADD COLUMN IF NOT EXISTS culture_tags text[] DEFAULT '{}';
