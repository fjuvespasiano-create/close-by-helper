
-- Central de Qualidade (QA)
CREATE TYPE public.qa_status AS ENUM ('novo','em_analise','reproduzido','em_desenvolvimento','corrigido','publicado','fechado');
CREATE TYPE public.qa_priority AS ENUM ('baixa','media','alta','critica');
CREATE TYPE public.qa_type AS ENUM ('erro','bug','info_incorreta','empresa','evento','noticia','layout','lentidao','funcionalidade','sugestao','outro');

CREATE SEQUENCE public.qa_ticket_seq START 1;

CREATE TABLE public.qa_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE DEFAULT ('QA-' || lpad(nextval('public.qa_ticket_seq')::text, 6, '0')),
  type public.qa_type NOT NULL DEFAULT 'outro',
  priority public.qa_priority NOT NULL DEFAULT 'media',
  status public.qa_status NOT NULL DEFAULT 'novo',
  description TEXT NOT NULL,
  page_url TEXT,
  page_title TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  device JSONB NOT NULL DEFAULT '{}'::jsonb,
  console_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  network_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  screenshot_url TEXT,
  video_url TEXT,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fingerprint TEXT, -- p/ agrupar duplicidades
  resolved_at TIMESTAMPTZ,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX qa_tickets_status_idx ON public.qa_tickets(status);
CREATE INDEX qa_tickets_created_idx ON public.qa_tickets(created_at DESC);
CREATE INDEX qa_tickets_fingerprint_idx ON public.qa_tickets(fingerprint);
CREATE INDEX qa_tickets_user_idx ON public.qa_tickets(user_id);

GRANT SELECT, INSERT, UPDATE ON public.qa_tickets TO authenticated;
GRANT INSERT ON public.qa_tickets TO anon;
GRANT ALL ON public.qa_tickets TO service_role;
ALTER TABLE public.qa_tickets ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode criar (anon + authenticated), sem poder ler os alheios
CREATE POLICY qa_tickets_insert_public ON public.qa_tickets FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(description) BETWEEN 3 AND 5000
    AND (user_id IS NULL OR user_id = auth.uid())
  );
CREATE POLICY qa_tickets_select_own ON public.qa_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY qa_tickets_admin_all ON public.qa_tickets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Comentários internos (só admin)
CREATE TABLE public.qa_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.qa_tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX qa_ticket_comments_ticket_idx ON public.qa_ticket_comments(ticket_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.qa_ticket_comments TO authenticated;
GRANT ALL ON public.qa_ticket_comments TO service_role;
ALTER TABLE public.qa_ticket_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY qa_comments_admin ON public.qa_ticket_comments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND author_id = auth.uid());

-- Histórico de eventos
CREATE TABLE public.qa_ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.qa_tickets(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX qa_ticket_events_ticket_idx ON public.qa_ticket_events(ticket_id, created_at);
GRANT SELECT, INSERT ON public.qa_ticket_events TO authenticated;
GRANT ALL ON public.qa_ticket_events TO service_role;
ALTER TABLE public.qa_ticket_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY qa_events_admin ON public.qa_ticket_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Trigger updated_at
CREATE TRIGGER qa_tickets_updated_at BEFORE UPDATE ON public.qa_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ao mudar status, registra evento e notifica autor quando resolvido
CREATE OR REPLACE FUNCTION public.qa_on_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.qa_ticket_events(ticket_id, actor_id, kind, payload)
    VALUES (NEW.id, auth.uid(), 'status_change',
            jsonb_build_object('from', OLD.status, 'to', NEW.status));

    IF NEW.status IN ('corrigido','publicado') AND OLD.status NOT IN ('corrigido','publicado') THEN
      NEW.resolved_at := COALESCE(NEW.resolved_at, now());
      IF NEW.user_id IS NOT NULL THEN
        INSERT INTO public.notifications(user_id, type, title, body, data)
        VALUES (
          NEW.user_id,
          'qa_resolved',
          'Problema resolvido: ' || NEW.ticket_number,
          'O problema que você reportou foi resolvido. Obrigado por ajudar a melhorar o AgendaAqui!',
          jsonb_build_object('ticket_id', NEW.id, 'ticket_number', NEW.ticket_number)
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER qa_tickets_status_trg BEFORE UPDATE ON public.qa_tickets
  FOR EACH ROW EXECUTE FUNCTION public.qa_on_status_change();
