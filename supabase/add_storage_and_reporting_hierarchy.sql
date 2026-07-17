-- =============================================================================
-- Report Automation Hub
-- Source-sheet Storage bucket + admin-managed ASH/RSH hierarchy
-- =============================================================================
-- Prerequisite:
--   Run supabase/one_time_fresh_setup.sql first.
--
-- This query creates no users and no admin account.
-- Run this entire file once in Supabase Dashboard > SQL Editor.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Private Storage bucket for original Excel/CSV source sheets
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'source-sheets',
  'source-sheets',
  false,
  52428800,
  ARRAY[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Keep the bucket private. Admins can manage files directly through an
-- authenticated Supabase client. The API service-role key bypasses RLS.
DROP POLICY IF EXISTS "Admins can read source sheets" ON storage.objects;
CREATE POLICY "Admins can read source sheets"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'source-sheets'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can upload source sheets" ON storage.objects;
CREATE POLICY "Admins can upload source sheets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'source-sheets'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can update source sheets" ON storage.objects;
CREATE POLICY "Admins can update source sheets"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'source-sheets'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'source-sheets'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can delete source sheets" ON storage.objects;
CREATE POLICY "Admins can delete source sheets"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'source-sheets'
    AND public.is_admin()
  );

-- Save the Storage object reference with each upload record.
ALTER TABLE public.uploads
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT NOT NULL DEFAULT 'source-sheets',
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uploads_storage_object_idx
  ON public.uploads(storage_bucket, storage_path)
  WHERE storage_path IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Regions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.service_regions (
  code       TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.service_regions (code, name)
VALUES
  ('BEVERAGE', 'Beverage'),
  ('CR',       'CR'),
  ('N+E',      'North + East'),
  ('S+W',      'South + West')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = true,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 3. RSH directory
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rsh_directory (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  region_code TEXT NOT NULL REFERENCES public.service_regions(code)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rsh_directory_name_region_key UNIQUE (name, region_code)
);

CREATE INDEX IF NOT EXISTS rsh_directory_region_idx
  ON public.rsh_directory(region_code);

-- VACANT is intentionally not inserted as a person. ASH records without an
-- assigned RSH use a NULL rsh_id and appear as VACANT in the view below.
INSERT INTO public.rsh_directory (name, region_code)
VALUES
  ('SOURABH AGGARWAL', 'BEVERAGE'),
  ('SHAMIM SAIFI',     'CR'),
  ('RAJIV DWIVEDI',    'N+E')
ON CONFLICT (name, region_code) DO UPDATE SET
  is_active = true,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 4. ASH / Reporting Manager directory
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ash_directory (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  region_code TEXT NOT NULL REFERENCES public.service_regions(code)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  rsh_id      BIGINT REFERENCES public.rsh_directory(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  profile_id  UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ash_directory_region_idx
  ON public.ash_directory(region_code);

CREATE INDEX IF NOT EXISTS ash_directory_rsh_idx
  ON public.ash_directory(rsh_id);

-- Seed the hierarchy shown in the supplied images.
INSERT INTO public.ash_directory (name, region_code, rsh_id)
VALUES
  (
    'SOURABH AGGARWAL',
    'BEVERAGE',
    (SELECT id FROM public.rsh_directory
      WHERE name = 'SOURABH AGGARWAL' AND region_code = 'BEVERAGE')
  ),
  (
    'SHAMIM SAIFI',
    'CR',
    (SELECT id FROM public.rsh_directory
      WHERE name = 'SHAMIM SAIFI' AND region_code = 'CR')
  ),
  (
    'RAVI GAUTAM',
    'N+E',
    (SELECT id FROM public.rsh_directory
      WHERE name = 'RAJIV DWIVEDI' AND region_code = 'N+E')
  ),
  (
    'VIPLO KUMAR',
    'N+E',
    (SELECT id FROM public.rsh_directory
      WHERE name = 'RAJIV DWIVEDI' AND region_code = 'N+E')
  ),
  (
    'RAJESH SINGH',
    'N+E',
    (SELECT id FROM public.rsh_directory
      WHERE name = 'RAJIV DWIVEDI' AND region_code = 'N+E')
  ),
  (
    'VIJAY KUMAR',
    'N+E',
    (SELECT id FROM public.rsh_directory
      WHERE name = 'RAJIV DWIVEDI' AND region_code = 'N+E')
  ),
  (
    'PIYUSH GUPTA',
    'N+E',
    (SELECT id FROM public.rsh_directory
      WHERE name = 'RAJIV DWIVEDI' AND region_code = 'N+E')
  ),
  (
    'VIKRAM KUMAR',
    'N+E',
    (SELECT id FROM public.rsh_directory
      WHERE name = 'RAJIV DWIVEDI' AND region_code = 'N+E')
  ),
  ('RAJ KUMAR',          'S+W', NULL),
  ('ANURANJAN',          'S+W', NULL),
  ('NAVEEN KUMAR GAMPA', 'S+W', NULL),
  ('NITHAN S',           'S+W', NULL),
  ('JOSEPH THOMSON',     'S+W', NULL),
  ('DHARMESH CHAUHAN',   'S+W', NULL),
  ('HEMANT BEENORE',     'S+W', NULL),
  ('SHOAIB SHAIKH',      'S+W', NULL),
  ('NILESH DHAYALKAR',   'S+W', NULL)
ON CONFLICT (name) DO UPDATE SET
  region_code = EXCLUDED.region_code,
  rsh_id = EXCLUDED.rsh_id,
  is_active = true,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 5. Updated-at trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_directory_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_regions_set_updated_at
  ON public.service_regions;
CREATE TRIGGER service_regions_set_updated_at
  BEFORE UPDATE ON public.service_regions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_directory_updated_at();

DROP TRIGGER IF EXISTS rsh_directory_set_updated_at
  ON public.rsh_directory;
CREATE TRIGGER rsh_directory_set_updated_at
  BEFORE UPDATE ON public.rsh_directory
  FOR EACH ROW
  EXECUTE FUNCTION public.set_directory_updated_at();

DROP TRIGGER IF EXISTS ash_directory_set_updated_at
  ON public.ash_directory;
CREATE TRIGGER ash_directory_set_updated_at
  BEFORE UPDATE ON public.ash_directory
  FOR EACH ROW
  EXECUTE FUNCTION public.set_directory_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Convenient hierarchy view
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.reporting_hierarchy
WITH (security_invoker = true)
AS
SELECT
  ash.id AS ash_id,
  ash.name AS ash_name,
  ash.profile_id AS ash_profile_id,
  region.code AS region_code,
  region.name AS region_name,
  rsh.id AS rsh_id,
  COALESCE(rsh.name, 'VACANT') AS rsh_name,
  rsh.profile_id AS rsh_profile_id,
  ash.is_active
FROM public.ash_directory AS ash
JOIN public.service_regions AS region
  ON region.code = ash.region_code
LEFT JOIN public.rsh_directory AS rsh
  ON rsh.id = ash.rsh_id;

-- ---------------------------------------------------------------------------
-- 7. Row Level Security
-- Active users can read the directory. Only admins can change it directly.
-- ---------------------------------------------------------------------------

ALTER TABLE public.service_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsh_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ash_directory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active users can read service regions"
  ON public.service_regions;
CREATE POLICY "Active users can read service regions"
  ON public.service_regions
  FOR SELECT
  TO authenticated
  USING (public.is_active_user());

DROP POLICY IF EXISTS "Admins can manage service regions"
  ON public.service_regions;
CREATE POLICY "Admins can manage service regions"
  ON public.service_regions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Active users can read RSH directory"
  ON public.rsh_directory;
CREATE POLICY "Active users can read RSH directory"
  ON public.rsh_directory
  FOR SELECT
  TO authenticated
  USING (public.is_active_user());

DROP POLICY IF EXISTS "Admins can manage RSH directory"
  ON public.rsh_directory;
CREATE POLICY "Admins can manage RSH directory"
  ON public.rsh_directory
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Active users can read ASH directory"
  ON public.ash_directory;
CREATE POLICY "Active users can read ASH directory"
  ON public.ash_directory
  FOR SELECT
  TO authenticated
  USING (public.is_active_user());

DROP POLICY IF EXISTS "Admins can manage ASH directory"
  ON public.ash_directory;
CREATE POLICY "Admins can manage ASH directory"
  ON public.ash_directory
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 8. Grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON public.service_regions FROM anon;
REVOKE ALL ON public.rsh_directory FROM anon;
REVOKE ALL ON public.ash_directory FROM anon;
REVOKE ALL ON public.reporting_hierarchy FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.service_regions,
     public.rsh_directory,
     public.ash_directory
  TO authenticated;

GRANT SELECT ON public.reporting_hierarchy TO authenticated;

GRANT ALL
  ON public.service_regions,
     public.rsh_directory,
     public.ash_directory
  TO service_role;

GRANT SELECT ON public.reporting_hierarchy TO service_role;

GRANT USAGE, SELECT
  ON SEQUENCE public.rsh_directory_id_seq,
              public.ash_directory_id_seq
  TO authenticated;

GRANT ALL
  ON SEQUENCE public.rsh_directory_id_seq,
              public.ash_directory_id_seq
  TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
