-- =============================================================================
-- ONE-SHOT FIX: closed_tickets missing columns that break Excel upload
-- Paste into Supabase SQL Editor and run once, then retry your upload.
-- =============================================================================

ALTER TABLE public.closed_tickets
  ADD COLUMN IF NOT EXISTS wip_sub_stage_date TEXT;

NOTIFY pgrst, 'reload schema';
