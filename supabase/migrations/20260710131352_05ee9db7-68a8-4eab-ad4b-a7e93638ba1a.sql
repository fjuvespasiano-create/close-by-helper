
-- ============= MARKETPLACE P2P =============

-- Enums
CREATE TYPE public.listing_status AS ENUM ('ativo','vendido','pausado','removido');
CREATE TYPE public.listing_condition AS ENUM ('novo','seminovo','usado');

-- Categorias (lookup)
CREATE TABLE public.listing_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listing_categories TO anon, authenticated;
GRANT ALL ON public.listing_categories TO service_role;
ALTER TABLE public.listing_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categorias visíveis a todos" ON public.listing_categories
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admin gerencia categorias" ON public.listing_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed categorias
INSERT INTO public.listing_categories (slug, name, icon, sort_order) VALUES
  ('eletronicos','Eletrônicos','Smartphone',1),
  ('moveis','Móveis','Sofa',2),
  ('veiculos','Veículos','Car',3),
  ('imoveis','Imóveis','Home',4),
  ('moda','Moda e Beleza','Shirt',5),
  ('servicos','Serviços','Wrench',6),
  ('bebe-infantil','Bebê e Infantil','Baby',7),
  ('casa-jardim','Casa e Jardim','Flower',8),
  ('esportes','Esportes e Lazer','Dumbbell',9),
  ('outros','Outros','Package',99);

-- Listings
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  category_slug text NOT NULL REFERENCES public.listing_categories(slug) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  price numeric(12,2),
  condition public.listing_condition NOT NULL DEFAULT 'usado',
  neighborhood text,
  contact_phone text,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.listing_status NOT NULL DEFAULT 'ativo',
  views_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listings_title_len CHECK (char_length(title) BETWEEN 3 AND 120),
  CONSTRAINT listings_desc_len CHECK (description IS NULL OR char_length(description) <= 2000),
  CONSTRAINT listings_price_nonneg CHECK (price IS NULL OR price >= 0)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT SELECT ON public.listings TO anon;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anúncios ativos são públicos" ON public.listings
  FOR SELECT TO anon, authenticated USING (status = 'ativo');
CREATE POLICY "dono vê os próprios" ON public.listings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "autenticado cria o próprio" ON public.listings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dono edita o próprio" ON public.listings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dono exclui o próprio" ON public.listings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin gerencia listings" ON public.listings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX listings_city_status_idx ON public.listings (city_id, status, created_at DESC);
CREATE INDEX listings_category_status_idx ON public.listings (category_slug, status, created_at DESC);
CREATE INDEX listings_user_idx ON public.listings (user_id, created_at DESC);
CREATE INDEX listings_title_trgm ON public.listings USING gin (title gin_trgm_ops);

CREATE TRIGGER listings_set_updated_at BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Mensagens comprador ↔ dono
CREATE TABLE public.listing_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT msg_body_len CHECK (char_length(body) BETWEEN 1 AND 2000),
  CONSTRAINT msg_sender_valid CHECK (sender_id = buyer_id OR sender_id = seller_id)
);
GRANT SELECT, INSERT, UPDATE ON public.listing_messages TO authenticated;
GRANT ALL ON public.listing_messages TO service_role;
ALTER TABLE public.listing_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participantes leem mensagens" ON public.listing_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "participante envia mensagem" ON public.listing_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND (auth.uid() = buyer_id OR auth.uid() = seller_id));
CREATE POLICY "destinatário marca lida" ON public.listing_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE INDEX listing_msg_thread_idx ON public.listing_messages (listing_id, buyer_id, created_at);
CREATE INDEX listing_msg_seller_idx ON public.listing_messages (seller_id, created_at DESC);
CREATE INDEX listing_msg_buyer_idx ON public.listing_messages (buyer_id, created_at DESC);

-- Denúncias
CREATE TABLE public.listing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'aberto',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_reason_len CHECK (char_length(reason) BETWEEN 2 AND 80),
  CONSTRAINT report_notes_len CHECK (notes IS NULL OR char_length(notes) <= 1000)
);
GRANT SELECT, INSERT ON public.listing_reports TO authenticated;
GRANT ALL ON public.listing_reports TO service_role;
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticado cria denúncia" ON public.listing_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reporter vê a própria" ON public.listing_reports
  FOR SELECT TO authenticated USING (auth.uid() = reporter_id);
CREATE POLICY "admin lê/gerencia denúncias" ON public.listing_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX listing_reports_listing_idx ON public.listing_reports (listing_id, created_at DESC);
