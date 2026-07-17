-- =============================================================================
-- Report Automation Hub - Complete one-time Supabase setup
-- =============================================================================
-- Intended for a brand-new Supabase project.
-- Run this entire file once in Supabase Dashboard > SQL Editor.
--
-- This script intentionally:
--   * creates no Auth users
--   * creates no admin user
--   * inserts no seed/demo data
--
-- After running it, create your first user in Authentication > Users. The
-- profile trigger below will create a matching public.profiles row. You can
-- then assign that profile's role yourself.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM (
  'admin',
  'manager',
  'employee',
  'ash',
  'rsh',
  'service_partner'
);

CREATE TYPE public.upload_file_type AS ENUM (
  'active_tickets',
  'closed_tickets',
  'mrf_data',
  'sales_data'
);

CREATE TYPE public.upload_status AS ENUM (
  'processing',
  'completed',
  'failed'
);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        public.user_role NOT NULL DEFAULT 'service_partner',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  manager_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  department  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX profiles_role_idx
  ON public.profiles(role);

CREATE INDEX profiles_manager_id_idx
  ON public.profiles(manager_id);

CREATE INDEX profiles_department_idx
  ON public.profiles(department);

-- Automatically create a profile whenever an Auth user is created.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role public.user_role;
BEGIN
  -- Invalid or missing role metadata safely falls back to service_partner.
  BEGIN
    requested_role := COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'service_partner'::public.user_role
    );
  EXCEPTION
    WHEN invalid_text_representation THEN
      requested_role := 'service_partner'::public.user_role;
  END;

  INSERT INTO public.profiles (
    id,
    name,
    email,
    role,
    department
  )
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(BTRIM(NEW.raw_user_meta_data->>'name'), ''),
      split_part(NEW.email, '@', 1)
    ),
    LOWER(NEW.email),
    requested_role,
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'department'), '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Uploads
-- ---------------------------------------------------------------------------

CREATE TABLE public.uploads (
  id            SERIAL PRIMARY KEY,
  filename      TEXT NOT NULL,
  file_type     public.upload_file_type NOT NULL,
  record_count  INTEGER NOT NULL DEFAULT 0 CHECK (record_count >= 0),
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  status        public.upload_status NOT NULL DEFAULT 'processing',
  error_message TEXT,
  uploaded_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX uploads_uploaded_at_idx
  ON public.uploads(uploaded_at DESC);

CREATE INDEX uploads_status_idx
  ON public.uploads(status);

CREATE INDEX uploads_uploaded_by_idx
  ON public.uploads(uploaded_by);

-- ---------------------------------------------------------------------------
-- Active tickets
-- ---------------------------------------------------------------------------

CREATE TABLE public.active_tickets (
  id                    SERIAL PRIMARY KEY,
  upload_id             INTEGER NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  ticket_id             TEXT NOT NULL,
  created_on            TEXT,
  customer_type         TEXT,
  customer_category     TEXT,
  customer_name         TEXT,
  city                  TEXT,
  state                 TEXT,
  rsh                   TEXT,
  rsh_email             TEXT,
  service_partner_name  TEXT,
  service_partner_email TEXT,
  ash                   TEXT,
  ash_phone             TEXT,
  national_head         TEXT,
  category              TEXT,
  product               TEXT,
  serial_number         TEXT,
  support               TEXT,
  support_type          TEXT,
  invoice_date          TEXT,
  invoice_number        TEXT,
  installation_date     TEXT,
  territory_type        TEXT,
  ticket_type           TEXT,
  service_type          TEXT,
  problem_description   TEXT,
  ticket_priority       TEXT,
  ticket_status         TEXT,
  wip_sub_stage         TEXT,
  wip_sub_stage_date    TEXT,
  last_action           TEXT,
  ticket_territory      TEXT,
  components            TEXT,
  re_open_ticket        TEXT,
  repeat_ticket         TEXT,
  free_of_cost          TEXT,
  payment_type          TEXT,
  territory_category    TEXT,
  imported_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX active_tickets_upload_id_idx
  ON public.active_tickets(upload_id);

CREATE INDEX active_tickets_ticket_id_idx
  ON public.active_tickets(ticket_id);

CREATE INDEX active_tickets_state_idx
  ON public.active_tickets(state);

CREATE INDEX active_tickets_category_idx
  ON public.active_tickets(category);

CREATE INDEX active_tickets_national_head_idx
  ON public.active_tickets(national_head);

CREATE INDEX active_tickets_ticket_status_idx
  ON public.active_tickets(ticket_status);

CREATE INDEX active_tickets_serial_number_idx
  ON public.active_tickets(serial_number);

CREATE INDEX active_tickets_hierarchy_idx
  ON public.active_tickets(rsh, ash, service_partner_name);

-- ---------------------------------------------------------------------------
-- Closed tickets
-- ---------------------------------------------------------------------------

CREATE TABLE public.closed_tickets (
  id                          SERIAL PRIMARY KEY,
  upload_id                   INTEGER NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  ticket_id                   TEXT NOT NULL,
  created_on                  TEXT,
  customer_type               TEXT,
  customer_category           TEXT,
  customer_name               TEXT,
  city                        TEXT,
  state                       TEXT,
  rsh                         TEXT,
  rsh_email                   TEXT,
  service_partner_name        TEXT,
  service_partner_email       TEXT,
  ash                         TEXT,
  ash_phone                   TEXT,
  national_head               TEXT,
  category                    TEXT,
  product                     TEXT,
  serial_number               TEXT,
  support                     TEXT,
  support_type                TEXT,
  invoice_date                TEXT,
  invoice_number              TEXT,
  installation_date           TEXT,
  territory_type              TEXT,
  ticket_type                 TEXT,
  service_type                TEXT,
  problem_description         TEXT,
  ticket_priority             TEXT,
  ticket_status               TEXT,
  wip_sub_stage               TEXT,
  wip_sub_stage_date          TEXT,
  last_action                 TEXT,
  ticket_territory            TEXT,
  components                  TEXT,
  re_open_ticket              TEXT,
  repeat_ticket               TEXT,
  free_of_cost                TEXT,
  payment_type                TEXT,
  payment_value               NUMERIC,
  territory_category          TEXT,
  closure_remarks             TEXT,
  closure_comments            TEXT,
  technician_closed_date      TEXT,
  partially_closed_by_ecp     TEXT,
  partially_closed_date       TEXT,
  partially_closed_by_ash_rsh TEXT,
  closed_from                 TEXT,
  closed_date                 TEXT,
  total_duration              TEXT,
  tat_minutes                 NUMERIC,
  distance_travelled          TEXT,
  closure_type                TEXT,
  service_report_number       TEXT,
  ticket_closed_by            TEXT,
  consumed_components         TEXT,
  imported_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX closed_tickets_upload_id_idx
  ON public.closed_tickets(upload_id);

CREATE INDEX closed_tickets_ticket_id_idx
  ON public.closed_tickets(ticket_id);

CREATE INDEX closed_tickets_state_idx
  ON public.closed_tickets(state);

CREATE INDEX closed_tickets_category_idx
  ON public.closed_tickets(category);

CREATE INDEX closed_tickets_closed_date_idx
  ON public.closed_tickets(closed_date);

CREATE INDEX closed_tickets_national_head_idx
  ON public.closed_tickets(national_head);

CREATE INDEX closed_tickets_serial_number_idx
  ON public.closed_tickets(serial_number);

CREATE INDEX closed_tickets_hierarchy_idx
  ON public.closed_tickets(rsh, ash, service_partner_name);

-- ---------------------------------------------------------------------------
-- MRF data
-- ---------------------------------------------------------------------------

CREATE TABLE public.mrf_data (
  id                          SERIAL PRIMARY KEY,
  upload_id                   INTEGER NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  ticket_id                   TEXT NOT NULL,
  created_on                  TEXT,
  customer_name               TEXT,
  state                       TEXT,
  rsh                         TEXT,
  rsh_email                   TEXT,
  service_partner_name        TEXT,
  ash                         TEXT,
  national_head               TEXT,
  category                    TEXT,
  product                     TEXT,
  support_type                TEXT,
  ticket_type                 TEXT,
  mrf_no                      TEXT,
  mrf_created_date            TEXT,
  component_name              TEXT,
  part_code                   TEXT,
  description                 TEXT,
  quantity                    INTEGER NOT NULL DEFAULT 0,
  remarks                     TEXT,
  component_to_be_issued_from TEXT,
  dispatch_to                 TEXT,
  dispatch_city               TEXT,
  dispatch_state              TEXT,
  contact_name                TEXT,
  contact_number              TEXT,
  mrf_status                  TEXT,
  mrf_requested_by            TEXT,
  ash_approved_date           TEXT,
  approved_by                 TEXT,
  approved_date               TEXT,
  dispatch_from               TEXT,
  dispatch_date               TEXT,
  courier_name                TEXT,
  docket_no                   TEXT,
  delivery_date               TEXT,
  org_stock_approved_qty      INTEGER NOT NULL DEFAULT 0,
  own_stock_approved_qty      INTEGER NOT NULL DEFAULT 0,
  imported_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX mrf_data_upload_id_idx
  ON public.mrf_data(upload_id);

CREATE INDEX mrf_data_ticket_id_idx
  ON public.mrf_data(ticket_id);

CREATE INDEX mrf_data_state_idx
  ON public.mrf_data(state);

CREATE INDEX mrf_data_national_head_idx
  ON public.mrf_data(national_head);

CREATE INDEX mrf_data_category_component_idx
  ON public.mrf_data(category, component_name);

CREATE INDEX mrf_data_hierarchy_idx
  ON public.mrf_data(rsh, ash, service_partner_name);

-- ---------------------------------------------------------------------------
-- Sales data
-- ---------------------------------------------------------------------------

CREATE TABLE public.sales_data (
  id                   SERIAL PRIMARY KEY,
  upload_id            INTEGER NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  product              TEXT,
  category             TEXT,
  state                TEXT,
  service_partner_name TEXT,
  period_month         TEXT,
  quantity             NUMERIC NOT NULL DEFAULT 0,
  imported_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sales_data_upload_id_idx
  ON public.sales_data(upload_id);

CREATE INDEX sales_data_product_category_state_idx
  ON public.sales_data(product, category, state);

CREATE INDEX sales_data_service_partner_idx
  ON public.sales_data(service_partner_name);

-- ---------------------------------------------------------------------------
-- Report schedules
-- ---------------------------------------------------------------------------

CREATE TABLE public.schedules (
  id                 SERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  report_types       TEXT[] NOT NULL DEFAULT '{}',
  frequency          TEXT NOT NULL DEFAULT 'daily',
  week_day           INTEGER CHECK (week_day IS NULL OR week_day BETWEEN 0 AND 6),
  month_day          INTEGER CHECK (month_day IS NULL OR month_day BETWEEN 1 AND 31),
  custom_cron        TEXT,
  audiences          TEXT[] NOT NULL DEFAULT '{}',
  product_categories TEXT[] NOT NULL DEFAULT '{}',
  filters            JSONB,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  last_run_at        TIMESTAMPTZ,
  next_run_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT schedules_frequency_check
    CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom'))
);

CREATE INDEX schedules_is_active_idx
  ON public.schedules(is_active);

CREATE INDEX schedules_created_at_idx
  ON public.schedules(created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS helper functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'manager'
      AND is_active = true
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closed_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mrf_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Profile policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin() AND id <> auth.uid());

CREATE POLICY "Managers can read direct reports"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_manager()
    AND manager_id = auth.uid()
  );

CREATE POLICY "Managers can update direct employees"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.is_active_manager()
    AND manager_id = auth.uid()
    AND role = 'employee'
  )
  WITH CHECK (
    public.is_active_manager()
    AND manager_id = auth.uid()
    AND role = 'employee'
  );

-- ---------------------------------------------------------------------------
-- Upload policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Active users can read uploads"
  ON public.uploads
  FOR SELECT
  TO authenticated
  USING (public.is_active_user());

CREATE POLICY "Active users can create own uploads"
  ON public.uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Admins can update uploads"
  ON public.uploads
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete uploads"
  ON public.uploads
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- Imported-data policies
-- Writes are performed by the API with the service-role key.
-- ---------------------------------------------------------------------------

CREATE POLICY "Active users can read active tickets"
  ON public.active_tickets
  FOR SELECT
  TO authenticated
  USING (public.is_active_user());

CREATE POLICY "Active users can read closed tickets"
  ON public.closed_tickets
  FOR SELECT
  TO authenticated
  USING (public.is_active_user());

CREATE POLICY "Active users can read MRF data"
  ON public.mrf_data
  FOR SELECT
  TO authenticated
  USING (public.is_active_user());

CREATE POLICY "Active users can read sales data"
  ON public.sales_data
  FOR SELECT
  TO authenticated
  USING (public.is_active_user());

-- ---------------------------------------------------------------------------
-- Schedule policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Active users can read schedules"
  ON public.schedules
  FOR SELECT
  TO authenticated
  USING (public.is_active_user());

CREATE POLICY "Admins can create schedules"
  ON public.schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update schedules"
  ON public.schedules
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete schedules"
  ON public.schedules
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- API privileges
-- RLS still controls authenticated-user access. The backend service role
-- bypasses RLS and performs imports and privileged application operations.
-- ---------------------------------------------------------------------------

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

GRANT USAGE ON SCHEMA public TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.profiles,
     public.uploads,
     public.active_tickets,
     public.closed_tickets,
     public.mrf_data,
     public.sales_data,
     public.schedules
  TO authenticated;

GRANT ALL
  ON public.profiles,
     public.uploads,
     public.active_tickets,
     public.closed_tickets,
     public.mrf_data,
     public.sales_data,
     public.schedules
  TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_manager() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_manager() TO authenticated, service_role;

COMMIT;

-- Refresh the PostgREST schema cache.
NOTIFY pgrst, 'reload schema';
