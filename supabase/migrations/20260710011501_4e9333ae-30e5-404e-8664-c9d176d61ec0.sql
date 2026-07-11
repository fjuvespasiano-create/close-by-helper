
CREATE POLICY "qa attachments upload" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'qa-attachments');
CREATE POLICY "qa attachments admin read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'qa-attachments' AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "qa attachments admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'qa-attachments' AND public.has_role(auth.uid(), 'admin'::public.app_role));
