-- View com security invoker (respeita RLS do usuário)
ALTER VIEW public.blog_posts SET (security_invoker = on);

-- Tighten WITH CHECK on staff/owner update policies
DROP POLICY IF EXISTS "Staff update posts" ON public.posts;
CREATE POLICY "Staff update posts" ON public.posts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor') OR public.has_role(auth.uid(),'publisher'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor') OR public.has_role(auth.uid(),'publisher'));

DROP POLICY IF EXISTS "Owner updates own events" ON public.events;
CREATE POLICY "Owner updates own events" ON public.events FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor'));

DROP POLICY IF EXISTS "Owner updates appointments" ON public.appointments;
CREATE POLICY "Owner updates appointments" ON public.appointments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));