-- Add Spend Breakdown columns to the pulses table
ALTER TABLE pulses 
ADD COLUMN IF NOT EXISTS spend_salaries NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS spend_infra NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS spend_marketing NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS spend_ops NUMERIC DEFAULT 0;

-- Optional: Add a check constraint to ensure breakdown doesn't exceed total (commented out for flexibility)
-- ALTER TABLE pulses ADD CONSTRAINT spend_breakdown_check CHECK (spend_salaries + spend_infra + spend_marketing + spend_ops <= expenses);
