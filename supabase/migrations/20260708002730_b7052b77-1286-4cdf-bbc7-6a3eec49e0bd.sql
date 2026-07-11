
DROP POLICY IF EXISTS "anyone can insert view" ON public.company_views;
CREATE POLICY "anyone can insert view" ON public.company_views
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_views.company_id AND c.status = 'active')
  );

DROP POLICY IF EXISTS "leads anyone insert" ON public.leads;
CREATE POLICY "leads anyone insert" ON public.leads
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = leads.company_id AND c.status = 'active')
  );
