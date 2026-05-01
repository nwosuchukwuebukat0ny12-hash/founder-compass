-- =============================================================
-- Migration: 20260501105000_patch_milestones_schema.sql
-- Fixes: Adds missing columns to the pre-existing milestones table
-- =============================================================

-- 1. Add all missing columns to milestones if they don't exist
ALTER TABLE public.milestones 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General',
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'task',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Backlog',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium',
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS deadline DATE,
ADD COLUMN IF NOT EXISTS founder_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Ensure 'title' is NOT NULL
UPDATE public.milestones SET title = 'Untitled' WHERE title IS NULL;
ALTER TABLE public.milestones ALTER COLUMN title SET NOT NULL;

-- 3. Cleanup: Drop old unused columns if they exist to prevent confusion
ALTER TABLE public.milestones DROP COLUMN IF EXISTS stage_reached;
ALTER TABLE public.milestones DROP COLUMN IF EXISTS achieved_at;

-- 4. Re-apply RLS to be 100% sure
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
