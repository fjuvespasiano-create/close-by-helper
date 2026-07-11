
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
        INSERT INTO public.notifications(user_id, type, title, body, payload)
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
