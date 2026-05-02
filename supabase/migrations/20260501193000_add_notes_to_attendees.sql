-- Add notes column to store decline reasons or other attendee context
ALTER TABLE public.event_attendees
ADD COLUMN IF NOT EXISTS notes TEXT;
