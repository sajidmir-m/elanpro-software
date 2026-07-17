-- =============================================================================
-- Departments + employee role (safe to re-run)
-- For databases that already applied 20240715000001 before department existed.
-- Fresh installs already include these in 01 — this is a no-op then.
-- =============================================================================

-- Add employee role if missing
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'employee';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department TEXT;

CREATE INDEX IF NOT EXISTS profiles_department_idx ON public.profiles(department);

-- Profile trigger: copy name, role, department from signup metadata
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
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Managers can read profiles of their direct reports
DROP POLICY IF EXISTS "Managers can read their team" ON public.profiles;
CREATE POLICY "Managers can read their team"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS mgr
      WHERE mgr.id = auth.uid()
        AND mgr.role = 'manager'
        AND mgr.is_active = true
        AND profiles.manager_id = mgr.id
    )
  );

-- Managers can update their direct employee reports
DROP POLICY IF EXISTS "Managers can update their team" ON public.profiles;
CREATE POLICY "Managers can update their team"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS mgr
      WHERE mgr.id = auth.uid()
        AND mgr.role = 'manager'
        AND mgr.is_active = true
        AND profiles.manager_id = mgr.id
        AND profiles.role = 'employee'
    )
  );
