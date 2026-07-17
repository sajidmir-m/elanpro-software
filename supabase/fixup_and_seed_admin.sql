-- =============================================================================
-- ONE-SHOT FIX for existing Supabase projects
-- Paste this entire file into Supabase SQL Editor and run once.
-- Order: add department + employee → seed admin
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) employee role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'employee';

-- 2) department column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department TEXT;

CREATE INDEX IF NOT EXISTS profiles_department_idx ON public.profiles(department);

-- 3) profile auto-create trigger
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

-- 4) manager RLS policies
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

-- 5) seed admin
DO $$
DECLARE
  admin_email TEXT := 'admin@elanpro.net';
  admin_password TEXT := 'Admin@1234';
  admin_name TEXT := 'System Admin';
  admin_id UUID;
  admin_permissions TEXT[] := ARRAY[
    'dashboard',
    'active_tickets',
    'closed_tickets',
    'product_failure',
    'component_failure',
    'warranty',
    'sales_complaint',
    'tat_analysis',
    'mrf_analysis',
    'schedules',
    'uploads',
    'users'
  ];
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE email = admin_email;

  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_id,
      'authenticated',
      'authenticated',
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'name', admin_name,
        'role', 'admin',
        'department', 'Administration'
      ),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      admin_id,
      jsonb_build_object('sub', admin_id::text, 'email', admin_email),
      'email',
      admin_id::text,
      now(),
      now(),
      now()
    );
  END IF;

  INSERT INTO public.profiles (id, name, email, role, is_active, permissions, department)
  SELECT
    u.id,
    admin_name,
    admin_email,
    'admin'::public.user_role,
    true,
    admin_permissions,
    'Administration'
  FROM auth.users u
  WHERE u.email = admin_email
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = 'admin'::public.user_role,
    is_active = true,
    department = 'Administration',
    permissions = EXCLUDED.permissions;

  RAISE NOTICE 'Admin ready: % / %', admin_email, admin_password;
END $$;
