
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS rating numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0;

UPDATE public.companies c SET
  rating = COALESCE(s.avg_rating, 0),
  review_count = COALESCE(s.cnt, 0)
FROM (
  SELECT company_id, AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*) AS cnt
  FROM public.reviews GROUP BY company_id
) s
WHERE c.id = s.company_id;

CREATE OR REPLACE FUNCTION public.refresh_company_rating(_company_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.companies c
  SET rating = COALESCE(s.avg_rating, 0),
      review_count = COALESCE(s.cnt, 0)
  FROM (
    SELECT AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*) AS cnt
    FROM public.reviews WHERE company_id = _company_id
  ) s
  WHERE c.id = _company_id;
$$;
REVOKE ALL ON FUNCTION public.refresh_company_rating(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_reviews_refresh_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_company_rating(OLD.company_id);
    RETURN OLD;
  ELSE
    PERFORM public.refresh_company_rating(NEW.company_id);
    IF TG_OP = 'UPDATE' AND OLD.company_id <> NEW.company_id THEN
      PERFORM public.refresh_company_rating(OLD.company_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.trg_reviews_refresh_company() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS reviews_refresh_company ON public.reviews;
CREATE TRIGGER reviews_refresh_company
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.trg_reviews_refresh_company();

CREATE INDEX IF NOT EXISTS idx_companies_status_plan_rating
  ON public.companies (status, plan, rating DESC, review_count DESC);
CREATE INDEX IF NOT EXISTS idx_companies_city_id ON public.companies (city_id);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON public.companies (slug);
CREATE INDEX IF NOT EXISTS idx_company_categories_category ON public.company_categories (category_id);
CREATE INDEX IF NOT EXISTS idx_company_categories_company ON public.company_categories (company_id);
CREATE INDEX IF NOT EXISTS idx_reviews_company ON public.reviews (company_id);
