
DROP POLICY IF EXISTS "qa_attachments_public_insert" ON storage.objects;
CREATE POLICY "qa_attachments_public_insert"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'qa-attachments');

DROP POLICY IF EXISTS "qa_attachments_admin_read" ON storage.objects;
CREATE POLICY "qa_attachments_admin_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'qa-attachments'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "qa_attachments_admin_delete" ON storage.objects;
CREATE POLICY "qa_attachments_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'qa-attachments'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
