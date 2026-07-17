-- Add missing WIP Sub Stage Date column used by closed-ticket Excel imports
ALTER TABLE public.closed_tickets
  ADD COLUMN IF NOT EXISTS wip_sub_stage_date TEXT;

-- Refresh PostgREST schema cache so inserts stop failing immediately
NOTIFY pgrst, 'reload schema';
