-- 1) Corrigir dados existentes: toda empresa Premium vira verificada
UPDATE public.companies
SET is_verified = true
WHERE plan = 'premium' AND is_verified = false;

-- 2) Trigger para manter regra: Premium => verificada
CREATE OR REPLACE FUNCTION public.enforce_premium_verified()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.plan = 'premium' THEN
    NEW.is_verified := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_premium_verified ON public.companies;
CREATE TRIGGER trg_enforce_premium_verified
BEFORE INSERT OR UPDATE OF plan ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.enforce_premium_verified();