CREATE OR REPLACE FUNCTION public.get_weekly_ranking()
RETURNS TABLE (
  rank_position bigint,
  company_id uuid,
  name text,
  slug text,
  logo_url text,
  city_id uuid,
  visits bigint,
  activity bigint,
  reviews bigint,
  avg_rating numeric,
  score numeric,
  is_self boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _has_premium boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.companies
    WHERE owner_id = _uid
      AND plan = 'premium'
      AND status = 'active'
      AND (plan_expires_at IS NULL OR plan_expires_at > now())
  ) INTO _has_premium;

  IF NOT _has_premium THEN
    RAISE EXCEPTION 'Ranking disponível apenas para empresas Premium' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH agg AS (
    SELECT
      c.id AS company_id,
      c.name,
      c.slug,
      c.logo_url,
      c.city_id,
      c.owner_id,
      COALESCE(v.visits, 0)::bigint AS visits,
      COALESCE(l.leads, 0)::bigint AS activity,
      COALESCE(r.reviews, 0)::bigint AS reviews,
      COALESCE(r.avg_rating, 0)::numeric(3,2) AS avg_rating,
      (COALESCE(v.visits,0) * 1
        + COALESCE(l.leads,0) * 5
        + COALESCE(r.reviews,0) * 8
        + COALESCE(r.avg_rating,0) * 4)::numeric AS score
    FROM public.companies c
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS visits FROM public.company_views
      WHERE company_id = c.id AND viewed_at >= now() - interval '7 days'
    ) v ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS leads FROM public.leads
      WHERE company_id = c.id AND created_at >= now() - interval '7 days'
    ) l ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS reviews, AVG(rating) AS avg_rating FROM public.reviews
      WHERE company_id = c.id AND created_at >= now() - interval '7 days'
    ) r ON true
    WHERE c.plan = 'premium'
      AND c.status = 'active'
      AND (c.plan_expires_at IS NULL OR c.plan_expires_at > now())
  )
  SELECT
    RANK() OVER (ORDER BY a.score DESC, a.reviews DESC, a.visits DESC) AS rank_position,
    a.company_id,
    a.name,
    a.slug,
    a.logo_url,
    a.city_id,
    a.visits,
    a.activity,
    a.reviews,
    a.avg_rating,
    a.score,
    (a.owner_id = _uid) AS is_self
  FROM agg a
  ORDER BY rank_position ASC
  LIMIT 100;
END;
$$;

REVOKE ALL ON FUNCTION public.get_weekly_ranking() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_weekly_ranking() TO authenticated;