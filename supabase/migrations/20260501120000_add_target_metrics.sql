-- =============================================================
-- Migration: 20260501120000_add_target_metrics.sql
-- Description: Adds columns for quantitative goal tracking
-- =============================================================

ALTER TABLE public.milestones 
ADD COLUMN IF NOT EXISTS target_value NUMERIC,
ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0;

-- Note: We retain the 'progress' column to store the calculated percentage (0-100)
-- for easy querying and sorting, but it will now be derived from these values.
