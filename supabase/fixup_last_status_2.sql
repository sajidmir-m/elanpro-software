-- Run once in Supabase Dashboard → SQL Editor
-- Enables Assigned popup filters for MRF / FGR / WIP from Excel "Last status 2"

ALTER TABLE public.active_tickets
  ADD COLUMN IF NOT EXISTS last_status_2 TEXT;

ALTER TABLE public.closed_tickets
  ADD COLUMN IF NOT EXISTS last_status_2 TEXT;

CREATE INDEX IF NOT EXISTS active_tickets_last_status_2_idx
  ON public.active_tickets(last_status_2);

CREATE INDEX IF NOT EXISTS closed_tickets_last_status_2_idx
  ON public.closed_tickets(last_status_2);
