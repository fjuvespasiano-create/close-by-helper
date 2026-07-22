DROP POLICY IF EXISTS "profiles authenticated read" ON public.profiles;

CREATE POLICY "profiles self read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles admin read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE SELECT ON public.reviews FROM anon;
GRANT SELECT (
  id, company_id, rating, comment, author_name, created_at, source, review_date
) ON public.reviews TO anon;
