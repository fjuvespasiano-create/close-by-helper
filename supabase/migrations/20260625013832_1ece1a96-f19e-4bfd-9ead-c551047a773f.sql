
DROP POLICY "newsletter_public_insert" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_public_insert" ON public.newsletter_subscribers
  FOR INSERT TO anon, authenticated
  WITH CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 255);

DROP POLICY "leads_planos_public_insert" ON public.leads_planos;
CREATE POLICY "leads_planos_public_insert" ON public.leads_planos
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(company_name) BETWEEN 1 AND 200
    AND length(contact_name) BETWEEN 1 AND 120
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND plan IN ('basico','profissional','premium')
  );

DROP POLICY "fav_insert_own" ON public.favorites;
CREATE POLICY "fav_insert_own" ON public.favorites
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id));
