-- Add unique constraint to allow upserting RSVPs without duplication
ALTER TABLE public.event_attendees
ADD CONSTRAINT event_attendees_event_id_startup_id_key UNIQUE (event_id, startup_id);
