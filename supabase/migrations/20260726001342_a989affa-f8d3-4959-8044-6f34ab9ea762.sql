
-- Enum de status
DO $$ BEGIN
  CREATE TYPE public.company_claim_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.company_claim_role AS ENUM ('owner','collaborator');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1) Tabela
CREATE TABLE IF NOT EXISTS public.company_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.company_claim_status NOT NULL DEFAULT 'pending',
  role_requested public.company_claim_role NOT NULL DEFAULT 'owner',
  full_name TEXT NOT NULL,
  position TEXT,
  corporate_email TEXT,
  phone TEXT,
  justification TEXT,
  evidence_url TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) GRANTs
GRANT SELECT, INSERT, UPDATE ON public.company_claims TO authenticated;
GRANT ALL ON public.company_claims TO service_role;

-- 3) RLS
ALTER TABLE public.company_claims ENABLE ROW LEVEL SECURITY;

-- 4) Policies
CREATE POLICY "Users insert own claims"
  ON public.company_claims FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own claims"
  ON public.company_claims FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update claims"
  ON public.company_claims FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete claims"
  ON public.company_claims FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5) Índices
CREATE INDEX IF NOT EXISTS idx_company_claims_company ON public.company_claims(company_id);
CREATE INDEX IF NOT EXISTS idx_company_claims_user ON public.company_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_company_claims_status ON public.company_claims(status);

-- Uma solicitação pendente por (empresa, usuário)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_claim_per_user_company
  ON public.company_claims(company_id, user_id)
  WHERE status = 'pending';

-- 6) updated_at
DROP TRIGGER IF EXISTS trg_company_claims_updated ON public.company_claims;
CREATE TRIGGER trg_company_claims_updated
  BEFORE UPDATE ON public.company_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7) Notificar admins ao criar
CREATE OR REPLACE FUNCTION public.notify_admins_new_company_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin UUID;
  _company_name TEXT;
BEGIN
  SELECT name INTO _company_name FROM public.companies WHERE id = NEW.company_id;
  FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications(user_id, type, title, body, data)
    VALUES (
      _admin,
      'company_claim_new',
      'Nova reivindicação de empresa',
      COALESCE(NEW.full_name,'Usuário') || ' quer reivindicar ' || COALESCE(_company_name,'uma empresa'),
      jsonb_build_object('claim_id', NEW.id, 'company_id', NEW.company_id, 'user_id', NEW.user_id)
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_claims_notify_admins ON public.company_claims;
CREATE TRIGGER trg_company_claims_notify_admins
  AFTER INSERT ON public.company_claims
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_company_claim();

-- 8) Trigger de aprovação/rejeição
CREATE OR REPLACE FUNCTION public.company_claims_on_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_name TEXT;
  _current_owner UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
    NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());

    SELECT name, owner_id INTO _company_name, _current_owner
      FROM public.companies WHERE id = NEW.company_id;

    IF NEW.status = 'approved' THEN
      IF NEW.role_requested = 'owner' THEN
        -- Só toma posse se ainda não houver dono, OU se o admin sinalizou substituição.
        IF _current_owner IS NULL
           OR _current_owner = NEW.user_id
           OR COALESCE(NEW.admin_notes,'') ILIKE '%substituir%' THEN
          UPDATE public.companies SET owner_id = NEW.user_id WHERE id = NEW.company_id;
        END IF;
      END IF;

      INSERT INTO public.notifications(user_id, type, title, body, data)
      VALUES (
        NEW.user_id,
        'company_claim_approved',
        'Sua reivindicação foi aprovada 🎉',
        'Você agora gerencia ' || COALESCE(_company_name,'a empresa') || ' no AgenddaAqui.',
        jsonb_build_object('claim_id', NEW.id, 'company_id', NEW.company_id)
      );

    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications(user_id, type, title, body, data)
      VALUES (
        NEW.user_id,
        'company_claim_rejected',
        'Sua reivindicação foi recusada',
        COALESCE(NULLIF(NEW.admin_notes,''), 'A solicitação de ' || COALESCE(_company_name,'a empresa') || ' foi recusada.'),
        jsonb_build_object('claim_id', NEW.id, 'company_id', NEW.company_id, 'reason', NEW.admin_notes)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_claims_on_review ON public.company_claims;
CREATE TRIGGER trg_company_claims_on_review
  BEFORE UPDATE ON public.company_claims
  FOR EACH ROW EXECUTE FUNCTION public.company_claims_on_review();
