
-- Blog/News categorization
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  sort INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_categories TO anon, authenticated;
GRANT ALL ON public.blog_categories TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.blog_categories TO authenticated;

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_categories public read" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "blog_categories admin write" ON public.blog_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_blog_categories_updated BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add category_id to posts (blog + news)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON public.posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_type_status_pub ON public.posts(type, status, published_at DESC);

-- Recreate blog_posts view to include category
DROP VIEW IF EXISTS public.blog_posts;
CREATE VIEW public.blog_posts AS
SELECT p.id, p.slug, p.title, p.excerpt, p.content,
  p.featured_image AS cover_url, p.author_name,
  (p.status = 'published'::publish_status) AS published,
  p.published_at, p.created_at, p.updated_at,
  p.meta_title, p.meta_description, p.og_image,
  COALESCE(p.tags, '{}'::text[]) AS keywords,
  p.type::text AS post_type,
  p.category_id,
  bc.slug AS category_slug,
  bc.name AS category_name,
  bc.color AS category_color,
  bc.icon AS category_icon
FROM public.posts p
LEFT JOIN public.blog_categories bc ON bc.id = p.category_id
WHERE p.type IN ('blog'::post_type, 'news'::post_type);

GRANT SELECT ON public.blog_posts TO anon, authenticated;

-- Seed categories
INSERT INTO public.blog_categories (slug, name, icon, color, sort) VALUES
  ('noticias', 'Notícias', 'Newspaper', '#EF4444', 1),
  ('cidade', 'Cidade', 'Building2', '#3B82F6', 2),
  ('negocios', 'Negócios', 'Briefcase', '#10B981', 3),
  ('turismo', 'Turismo', 'MapPin', '#F59E0B', 4),
  ('gastronomia', 'Gastronomia', 'UtensilsCrossed', '#EC4899', 5),
  ('cultura', 'Cultura', 'Palette', '#8B5CF6', 6),
  ('servicos', 'Serviços', 'Wrench', '#06B6D4', 7),
  ('dicas', 'Dicas', 'Lightbulb', '#EAB308', 8)
ON CONFLICT (slug) DO NOTHING;
