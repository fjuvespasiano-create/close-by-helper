
-- Fix: media rows exposed publicly. Restrict SELECT to owner/company-owner/admin.
DROP POLICY IF EXISTS "Public read media" ON public.media;

CREATE POLICY "Owner/company-owner/admin can read media"
  ON public.media FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR (
      company_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = media.company_id AND c.owner_id = auth.uid()
      )
    )
  );

-- Drop anon SELECT grant, keep authenticated
REVOKE SELECT ON public.media FROM anon;
