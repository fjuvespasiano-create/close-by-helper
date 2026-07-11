CREATE OR REPLACE VIEW public.blog_posts AS
SELECT id, slug, title, excerpt, content,
  featured_image AS cover_url, author_name,
  (status = 'published'::public.publish_status) AS published,
  published_at, created_at, updated_at,
  meta_title, meta_description, og_image,
  COALESCE(tags, '{}'::text[]) AS keywords
FROM public.posts
WHERE type = 'blog'::public.post_type;
ALTER VIEW public.blog_posts SET (security_invoker = true);
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT ALL ON public.blog_posts TO service_role;