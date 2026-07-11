
-- 1. FAVORITES
CREATE TABLE public.favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fav_select_own" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "fav_insert_own" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fav_delete_own" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. NEWSLETTER
CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  city_slug text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "newsletter_public_insert" ON public.newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "newsletter_admin_read" ON public.newsletter_subscribers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. BLOG
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL,
  cover_url text,
  author_name text,
  published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_public_read" ON public.blog_posts FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "blog_admin_all" ON public.blog_posts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER blog_posts_set_updated BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. LEADS PLANOS
CREATE TABLE public.leads_planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  city text,
  plan text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.leads_planos TO anon, authenticated;
GRANT ALL ON public.leads_planos TO service_role;
ALTER TABLE public.leads_planos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_planos_public_insert" ON public.leads_planos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "leads_planos_admin_read" ON public.leads_planos FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. SEED BLOG
INSERT INTO public.blog_posts (slug, title, excerpt, content, cover_url, author_name) VALUES
('como-escolher-prestador-servicos-mg', 'Como escolher o melhor prestador de serviços em MG', 'Dicas práticas para contratar profissionais confiáveis em Minas Gerais.', E'## Pesquise antes de contratar\n\nAntes de fechar qualquer serviço, verifique avaliações de outros clientes, peça referências e compare orçamentos.\n\n## Verifique documentação\n\nProfissionais sérios apresentam CNPJ, MEI ou registro em conselhos de classe.\n\n## Use o AgendaAqui\n\nNossa plataforma reúne empresas verificadas em toda Minas Gerais com avaliações reais.', 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200', 'Equipe AgendaAqui'),
('top-5-categorias-vespasiano', 'Top 5 categorias de serviços mais buscadas em Vespasiano', 'Descubra os serviços mais procurados pela população vespasianense.', E'## 1. Beleza e Estética\n\nSalões, barbearias e estúdios de unha lideram as buscas.\n\n## 2. Restaurantes\n\nDelivery e refeições no local seguem em alta.\n\n## 3. Automotivo\n\nMecânica e estética automotiva.\n\n## 4. Saúde\n\nClínicas, dentistas e farmácias.\n\n## 5. Construção\n\nPedreiros, eletricistas e encanadores.', 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200', 'Equipe AgendaAqui'),
('anuncie-sua-empresa-online', 'Por que anunciar sua empresa online em 2026', 'Aumente sua visibilidade local com presença digital estratégica.', E'## A internet é o novo guia\n\nMais de 80% dos consumidores pesquisam online antes de contratar um serviço.\n\n## Vantagens do AgendaAqui\n\n- Visibilidade local\n- Avaliações reais\n- Contato direto via WhatsApp\n- SEO otimizado\n\nCadastre sua empresa hoje mesmo e comece a receber clientes.', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200', 'Equipe AgendaAqui');
