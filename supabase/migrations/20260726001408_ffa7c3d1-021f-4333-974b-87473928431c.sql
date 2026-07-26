
CREATE POLICY "Users manage own claim evidence"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'claim-evidence' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'claim-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins read claim evidence"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'claim-evidence' AND public.has_role(auth.uid(), 'admin'));
