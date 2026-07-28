CREATE TABLE IF NOT EXISTS public.shopee_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  itemid BIGINT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  image_link TEXT,
  image_link_3 TEXT,
  product_link TEXT NOT NULL,
  product_short_link TEXT,
  price NUMERIC(12,2),
  sale_price NUMERIC(12,2),
  discount_percentage NUMERIC(6,2),
  item_rating NUMERIC(3,2),
  global_category1 TEXT,
  global_category2 TEXT,
  global_catid1 TEXT,
  global_catid2 TEXT,
  global_item_attributes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shopee_products TO anon, authenticated;
GRANT ALL ON public.shopee_products TO service_role;

ALTER TABLE public.shopee_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopee_products_public_read" ON public.shopee_products
  FOR SELECT USING (is_active = true);

CREATE POLICY "shopee_products_admin_all" ON public.shopee_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS shopee_products_category1_idx ON public.shopee_products (global_category1);
CREATE INDEX IF NOT EXISTS shopee_products_discount_idx ON public.shopee_products (discount_percentage DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS shopee_products_rating_idx ON public.shopee_products (item_rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS shopee_products_active_idx ON public.shopee_products (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS shopee_products_title_trgm ON public.shopee_products USING gin (title gin_trgm_ops);

CREATE TRIGGER shopee_products_set_updated_at
  BEFORE UPDATE ON public.shopee_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();