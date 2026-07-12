
-- 1) Aplica admin para contas já existentes
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) IN ('fjuvespasiano@gmail.com','williamiurd.ramos@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Garante admin automático no signup para esses e-mails
CREATE OR REPLACE FUNCTION public.auto_grant_admin_for_seed_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) IN ('fjuvespasiano@gmail.com','williamiurd.ramos@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_seed_admins ON auth.users;
CREATE TRIGGER on_auth_user_created_seed_admins
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_grant_admin_for_seed_emails();
