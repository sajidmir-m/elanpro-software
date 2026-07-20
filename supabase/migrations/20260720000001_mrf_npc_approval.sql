-- Adds NPC (National Product Center) approval tracking to MRF records.
-- Sourced from the "NPC Approval" column in the MRF Excel upload.
-- NULL/empty is treated as "Pending" everywhere it is read.

ALTER TABLE public.mrf_data
  ADD COLUMN IF NOT EXISTS npc_approval TEXT;

CREATE INDEX IF NOT EXISTS mrf_data_npc_approval_idx ON public.mrf_data(npc_approval);
