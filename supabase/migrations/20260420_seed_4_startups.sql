-- Seed file for adding 4 Presentation-Ready Startups to the Founder Pulse Database
-- Note: This does NOT delete existing startups (like MedSync). It simply adds to the portfolio.

INSERT INTO public.startups 
(name, founder_name, industry, current_stage, active_users, mom_growth_rate, user_retention, ltv_cac_ratio, monthly_burn_rate, runway_months, is_delayed)
VALUES 
    ('NileMind', 'David Chen', 'AI / ML', 'Flourish', 12500, 45, 88, 5.2, 45000, 14, false),
    ('EcoFlow', 'Amara Okafor', 'CleanTech', 'Program', 850, 5, 75, 1.2, 25000, 3, true),
    ('EdStream', 'Kofi Mensah', 'EdTech', 'Ideation', 0, 0, 0, 0, 5000, 12, false),
    ('PayStacker', 'Elena Rodriguez', 'FinTech', 'Mentorship', 3400, 15, 85, 3.1, 15000, 24, false);

-- Add sample milestones for these new startups
INSERT INTO public.milestones (startup_id, stage_reached, achieved_at)
SELECT id, 'Ideation', now() - interval '90 days' FROM public.startups WHERE name = 'NileMind';

INSERT INTO public.milestones (startup_id, stage_reached, achieved_at)
SELECT id, 'Program', now() - interval '60 days' FROM public.startups WHERE name = 'NileMind';

INSERT INTO public.milestones (startup_id, stage_reached, achieved_at)
SELECT id, 'Ideation', now() - interval '30 days' FROM public.startups WHERE name = 'EcoFlow';

INSERT INTO public.milestones (startup_id, stage_reached, achieved_at)
SELECT id, 'Ideation', now() - interval '45 days' FROM public.startups WHERE name = 'PayStacker';
