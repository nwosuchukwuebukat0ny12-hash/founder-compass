-- Add target_mrr column to pulses table for monthly goal tracking
ALTER TABLE public.pulses 
ADD COLUMN IF NOT EXISTS target_mrr NUMERIC DEFAULT 0;

-- Ensure comment for documentation
COMMENT ON COLUMN public.pulses.target_mrr IS 'The monthly recurring revenue goal for this specific month.';
