DO $$ BEGIN
  CREATE POLICY "Authenticated upload media" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND owner = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner reads own media" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'media' AND owner = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner updates own media" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'media' AND owner = auth.uid())
    WITH CHECK (bucket_id = 'media' AND owner = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner deletes own media" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'media' AND owner = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;