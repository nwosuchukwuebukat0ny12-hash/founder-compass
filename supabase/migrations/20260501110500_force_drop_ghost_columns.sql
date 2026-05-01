-- =============================================================
-- Migration: 20260501110500_force_drop_ghost_columns.sql
-- Fixes: Removes legacy columns that violate not-null constraints
-- =============================================================

-- 1. Use CASCADE to forcefully drop the legacy columns. 
-- CASCADE ensures that if any views or indexes depend on these columns, 
-- those dependencies are also dropped, preventing the command from failing.
ALTER TABLE public.milestones DROP COLUMN IF EXISTS stage_reached CASCADE;
ALTER TABLE public.milestones DROP COLUMN IF EXISTS achieved_at CASCADE;

-- 2. Just in case the previous migration failed to make 'category' optional
-- due to early termination, let's double-check the default values.
ALTER TABLE public.milestones ALTER COLUMN category SET DEFAULT 'General';
ALTER TABLE public.milestones ALTER COLUMN category DROP NOT NULL;
