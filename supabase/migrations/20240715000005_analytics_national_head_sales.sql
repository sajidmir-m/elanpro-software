-- Analytics: national_head hierarchy + sales_data for BD-by-sales

ALTER TYPE public.upload_file_type ADD VALUE IF NOT EXISTS 'sales_data';

ALTER TABLE public.active_tickets
  ADD COLUMN IF NOT EXISTS national_head TEXT;

ALTER TABLE public.closed_tickets
  ADD COLUMN IF NOT EXISTS national_head TEXT;

ALTER TABLE public.mrf_data
  ADD COLUMN IF NOT EXISTS national_head TEXT;

CREATE INDEX IF NOT EXISTS active_tickets_national_head_idx ON public.active_tickets(national_head);
CREATE INDEX IF NOT EXISTS closed_tickets_national_head_idx ON public.closed_tickets(national_head);
CREATE INDEX IF NOT EXISTS mrf_data_national_head_idx ON public.mrf_data(national_head);
CREATE INDEX IF NOT EXISTS active_tickets_ticket_status_idx ON public.active_tickets(ticket_status);
CREATE INDEX IF NOT EXISTS active_tickets_serial_number_idx ON public.active_tickets(serial_number);
CREATE INDEX IF NOT EXISTS closed_tickets_serial_number_idx ON public.closed_tickets(serial_number);
CREATE INDEX IF NOT EXISTS mrf_data_category_component_idx ON public.mrf_data(category, component_name);

CREATE TABLE IF NOT EXISTS public.sales_data (
  id                    SERIAL PRIMARY KEY,
  upload_id             INTEGER NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  product               TEXT,
  category              TEXT,
  state                 TEXT,
  service_partner_name  TEXT,
  period_month          TEXT,
  quantity              NUMERIC NOT NULL DEFAULT 0,
  imported_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sales_data_upload_id_idx ON public.sales_data(upload_id);
CREATE INDEX IF NOT EXISTS sales_data_product_category_state_idx ON public.sales_data(product, category, state);

ALTER TABLE public.sales_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read sales_data" ON public.sales_data;
CREATE POLICY "Authenticated can read sales_data"
  ON public.sales_data FOR SELECT
  TO authenticated
  USING (true);

NOTIFY pgrst, 'reload schema';
