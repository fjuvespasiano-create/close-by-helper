
CREATE SEQUENCE IF NOT EXISTS public.user_requests_seq START 1;

CREATE TABLE public.user_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_number TEXT NOT NULL UNIQUE DEFAULT ('SOL-' || lpad(nextval('public.user_requests_seq')::text, 6, '0')),
  category TEXT NOT NULL DEFAULT 'outro' CHECK (category IN ('duvida','sugestao','parceria','orcamento','cadastro_empresa','cadastro_evento','imprensa','elogio','reclamacao','outro')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  page_url TEXT,
  attachment_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','em_analise','respondido','resolvido','arquivado')),
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa','media','alta','critica')),
  admin_response TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip TEXT,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_requests TO authenticated;
GRANT INSERT ON public.user_requests TO anon;
GRANT ALL ON public.user_requests TO service_role;
GRANT USAGE ON SEQUENCE public.user_requests_seq TO anon, authenticated, service_role;

ALTER TABLE public.user_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a request"
  ON public.user_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all requests"
  ON public.user_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner can view own requests"
  ON public.user_requests FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can update requests"
  ON public.user_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete requests"
  ON public.user_requests FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_user_requests_status ON public.user_requests(status);
CREATE INDEX idx_user_requests_created_at ON public.user_requests(created_at DESC);
CREATE INDEX idx_user_requests_user_id ON public.user_requests(user_id);

CREATE TRIGGER trg_user_requests_updated_at
  BEFORE UPDATE ON public.user_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.notify_admins_new_user_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin UUID;
BEGIN
  FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications(user_id, type, title, body, data)
    VALUES (
      _admin,
      'new_user_request',
      'Nova solicitação: ' || NEW.request_number,
      COALESCE(NEW.subject, 'Solicitação recebida') || ' — ' || COALESCE(NEW.user_name, NEW.user_email, 'visitante'),
      jsonb_build_object('request_id', NEW.id, 'request_number', NEW.request_number, 'category', NEW.category)
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_requests_notify_admins
  AFTER INSERT ON public.user_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_user_request();
