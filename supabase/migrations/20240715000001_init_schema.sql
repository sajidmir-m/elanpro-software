-- =============================================================================
-- Report Automation Hub — Initial Schema
-- Replaces Drizzle-managed tables with Supabase Auth + profiles
-- =============================================================================

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
-- Profiles (extends auth.users — replaces old users + sessions tables)
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

CREATE INDEX profiles_role_idx ON public.profiles(role);
CREATE INDEX profiles_manager_id_idx ON public.profiles(manager_id);
CREATE INDEX profiles_department_idx ON public.profiles(department);

-- Auto-create profile when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'service_partner'
    ),
    NEW.raw_user_meta_data->>'department'
  );
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
  id           SERIAL PRIMARY KEY,
  filename     TEXT NOT NULL,
  file_type    public.upload_file_type NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  status       public.upload_status NOT NULL DEFAULT 'processing',
  error_message TEXT,
  uploaded_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX uploads_uploaded_at_idx ON public.uploads(uploaded_at DESC);
CREATE INDEX uploads_status_idx ON public.uploads(status);

-- ---------------------------------------------------------------------------
-- Active Tickets
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

CREATE INDEX active_tickets_upload_id_idx ON public.active_tickets(upload_id);
CREATE INDEX active_tickets_state_idx ON public.active_tickets(state);
CREATE INDEX active_tickets_category_idx ON public.active_tickets(category);
CREATE INDEX active_tickets_ticket_id_idx ON public.active_tickets(ticket_id);

-- ---------------------------------------------------------------------------
-- Closed Tickets
-- ---------------------------------------------------------------------------

CREATE TABLE public.closed_tickets (
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
  payment_value         NUMERIC,
  territory_category    TEXT,
  closure_remarks       TEXT,
  closure_comments      TEXT,
  technician_closed_date TEXT,
  partially_closed_by_ecp TEXT,
  partially_closed_date TEXT,
  partially_closed_by_ash_rsh TEXT,
  closed_from           TEXT,
  closed_date           TEXT,
  total_duration        TEXT,
  tat_minutes           NUMERIC,
  distance_travelled    TEXT,
  closure_type          TEXT,
  service_report_number TEXT,
  ticket_closed_by      TEXT,
  consumed_components   TEXT,
  imported_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX closed_tickets_upload_id_idx ON public.closed_tickets(upload_id);
CREATE INDEX closed_tickets_state_idx ON public.closed_tickets(state);
CREATE INDEX closed_tickets_category_idx ON public.closed_tickets(category);
CREATE INDEX closed_tickets_closed_date_idx ON public.closed_tickets(closed_date);

-- ---------------------------------------------------------------------------
-- MRF Data
-- ---------------------------------------------------------------------------

CREATE TABLE public.mrf_data (
  id                        SERIAL PRIMARY KEY,
  upload_id                 INTEGER NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  ticket_id                 TEXT NOT NULL,
  created_on                TEXT,
  customer_name             TEXT,
  state                     TEXT,
  rsh                       TEXT,
  rsh_email                 TEXT,
  service_partner_name      TEXT,
  ash                       TEXT,
  national_head             TEXT,
  category                  TEXT,
  product                   TEXT,
  support_type              TEXT,
  ticket_type               TEXT,
  mrf_no                    TEXT,
  mrf_created_date          TEXT,
  component_name            TEXT,
  part_code                 TEXT,
  description               TEXT,
  quantity                  INTEGER DEFAULT 0,
  remarks                   TEXT,
  component_to_be_issued_from TEXT,
  dispatch_to               TEXT,
  dispatch_city             TEXT,
  dispatch_state            TEXT,
  contact_name              TEXT,
  contact_number            TEXT,
  mrf_status                TEXT,
  mrf_requested_by          TEXT,
  ash_approved_date         TEXT,
  approved_by               TEXT,
  approved_date             TEXT,
  dispatch_from             TEXT,
  dispatch_date             TEXT,
  courier_name              TEXT,
  docket_no                 TEXT,
  delivery_date             TEXT,
  org_stock_approved_qty    INTEGER DEFAULT 0,
  own_stock_approved_qty    INTEGER DEFAULT 0,
  imported_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX mrf_data_upload_id_idx ON public.mrf_data(upload_id);
CREATE INDEX mrf_data_state_idx ON public.mrf_data(state);

-- ---------------------------------------------------------------------------
-- Schedules
-- ---------------------------------------------------------------------------

CREATE TABLE public.schedules (
  id                SERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  report_types      TEXT[] NOT NULL DEFAULT '{}',
  frequency         TEXT NOT NULL DEFAULT 'daily',
  week_day          INTEGER,
  month_day         INTEGER,
  custom_cron       TEXT,
  audiences         TEXT[] NOT NULL DEFAULT '{}',
  product_categories TEXT[] NOT NULL DEFAULT '{}',
  filters           JSONB,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  last_run_at       TIMESTAMPTZ,
  next_run_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX schedules_is_active_idx ON public.schedules(is_active);
