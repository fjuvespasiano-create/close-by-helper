
-- Add WITH CHECK to UPDATE policies so owners can't reassign ownership.

DROP POLICY IF EXISTS "companies owner update" ON public.companies;
CREATE POLICY "companies owner update"
  ON public.companies FOR UPDATE
  TO authenticated
  USING ((auth.uid() = owner_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK ((auth.uid() = owner_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "profiles user update own" ON public.profiles;
CREATE POLICY "profiles user update own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "reviews user update own" ON public.reviews;
CREATE POLICY "reviews user update own"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
