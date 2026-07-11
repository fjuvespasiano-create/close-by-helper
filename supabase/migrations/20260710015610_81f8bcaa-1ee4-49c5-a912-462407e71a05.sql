-- Update function to also apply premium badges
CREATE OR REPLACE FUNCTION public.enforce_premium_verified()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  premium_badges text[] := ARRAY['Top atendimento','Especialista','Entrega garantida'];
  b text;
BEGIN
  IF NEW.plan = 'premium' THEN
    NEW.is_verified := true;
    IF NEW.badges IS NULL THEN
      NEW.badges := premium_badges;
    ELSE
      FOREACH b IN ARRAY premium_badges LOOP
        IF NOT (b = ANY(NEW.badges)) THEN
          NEW.badges := array_append(NEW.badges, b);
        END IF;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_premium_verified ON public.companies;
CREATE TRIGGER trg_enforce_premium_verified
BEFORE INSERT OR UPDATE OF plan, badges, is_verified ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.enforce_premium_verified();

-- Backfill existing premium companies
UPDATE public.companies SET plan = plan WHERE plan = 'premium';
