-- =============================================================================
-- Row Level Security Policies
-- API server uses service_role (bypasses RLS).
-- These policies protect direct client access via Supabase JS.
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closed_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mrf_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;

-- Helper: check if current user is active
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
  );
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- Data tables — authenticated active users can read; admins can write
-- ---------------------------------------------------------------------------

CREATE POLICY "Active users can read uploads"
  ON public.uploads FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Active users can insert uploads"
  ON public.uploads FOR INSERT
  WITH CHECK (public.is_active_user() AND uploaded_by = auth.uid());

CREATE POLICY "Admins can manage uploads"
  ON public.uploads FOR ALL
  USING (public.is_admin());

CREATE POLICY "Active users can read active_tickets"
  ON public.active_tickets FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Active users can read closed_tickets"
  ON public.closed_tickets FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Active users can read mrf_data"
  ON public.mrf_data FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Active users can read schedules"
  ON public.schedules FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Admins can manage schedules"
  ON public.schedules FOR ALL
  USING (public.is_admin());
