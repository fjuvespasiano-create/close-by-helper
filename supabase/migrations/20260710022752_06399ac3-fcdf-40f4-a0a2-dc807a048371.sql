CREATE OR REPLACE VIEW public.blog_posts AS
SELECT id, slug, title, excerpt, content,
  featured_image AS cover_url,
  author_name,
  status = 'published'::publish_status AS published,
  published_at, created_at, updated_at,
  meta_title, meta_description, og_image,
  COALESCE(tags, '{}'::text[]) AS keywords
FROM posts
WHERE type = 'blog'::post_type;