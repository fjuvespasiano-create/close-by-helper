
CREATE POLICY "promo_images_public_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'promotion-images');

CREATE POLICY "promo_images_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'promotion-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "promo_images_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'promotion-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "promo_images_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'promotion-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "promo_images_admin_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'promotion-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'promotion-images' AND public.has_role(auth.uid(), 'admin'));
