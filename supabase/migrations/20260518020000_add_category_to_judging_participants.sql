-- Add category column to judging_participants table
ALTER TABLE public.judging_participants 
ADD COLUMN IF NOT EXISTS category TEXT;
