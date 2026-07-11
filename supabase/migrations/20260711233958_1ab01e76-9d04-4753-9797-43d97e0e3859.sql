
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _admin uuid;
  _name text;
  _email text;
BEGIN
  _name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  _email := NEW.email;
  INSERT INTO public.profiles (id, name) VALUES (NEW.id, _name);

  FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications(user_id, type, title, body, data)
    VALUES (
      _admin,
      'new_user_signup',
      'Novo usuário cadastrado',
      COALESCE(_name,'Usuário') || ' (' || COALESCE(_email,'sem email') || ') acabou de se cadastrar.',
      jsonb_build_object('user_id', NEW.id, 'email', _email, 'name', _name)
    );
  END LOOP;

  RETURN NEW;
END $$;
