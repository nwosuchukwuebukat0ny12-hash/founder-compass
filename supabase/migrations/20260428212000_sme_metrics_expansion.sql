-- 1. Update 'startups' table to support currency and flexible metrics
ALTER TABLE startups 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS metric_config JSONB DEFAULT '[]'::jsonb;

-- Update the default business_model to just be a generic column, though 'tech_startup' is still fine
-- We will change the UI values to 'sme' and 'tech_startup'.

-- 2. Update 'pulses' table to support custom KPIs
ALTER TABLE pulses 
ADD COLUMN IF NOT EXISTS custom_kpis JSONB DEFAULT '{}'::jsonb;
