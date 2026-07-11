
-- Extend promotions with display metadata
ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS discount_percent int CHECK (discount_percent IS NULL OR (discount_percent BETWEEN 0 AND 100));

CREATE INDEX IF NOT EXISTS promotions_city_idx ON public.promotions(city_id);
CREATE INDEX IF NOT EXISTS promotions_status_valid_idx ON public.promotions(status, valid_to);

-- Enforce "premium companies may add only 1 promotion" (admins & featured plan bypass)
CREATE OR REPLACE FUNCTION public.enforce_promotion_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan text;
  _owner uuid;
  _count int;
BEGIN
  SELECT plan, owner_id INTO _plan, _owner FROM public.companies WHERE id = NEW.company_id;
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF _plan = 'premium' THEN
    SELECT COUNT(*) INTO _count FROM public.promotions
      WHERE company_id = NEW.company_id AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    IF _count >= 1 THEN
      RAISE EXCEPTION 'Empresas Premium podem cadastrar apenas 1 promoção. Faça upgrade para o plano Destaque para adicionar mais.' USING ERRCODE = '42501';
    END IF;
  ELSIF _plan IS NULL OR _plan = 'free' THEN
    RAISE EXCEPTION 'Promoções disponíveis apenas para empresas Premium ou Destaque.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS enforce_promotion_limit_trg ON public.promotions;
CREATE TRIGGER enforce_promotion_limit_trg
  BEFORE INSERT ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_promotion_limit();

-- Coupons table (discount codes for sponsored stores)
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  code text NOT NULL,
  discount_percent int CHECK (discount_percent IS NULL OR (discount_percent BETWEEN 0 AND 100)),
  discount_label text,
  category text,
  image_url text,
  link_url text,
  terms text,
  valid_from timestamptz,
  valid_to timestamptz,
  is_sponsored boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

CREATE INDEX IF NOT EXISTS coupons_city_idx ON public.coupons(city_id);
CREATE INDEX IF NOT EXISTS coupons_status_valid_idx ON public.coupons(status, valid_to);
CREATE INDEX IF NOT EXISTS coupons_sponsored_idx ON public.coupons(is_sponsored);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active coupons" ON public.coupons
  FOR SELECT
  USING (status = 'published' AND (valid_to IS NULL OR valid_to >= now()));

CREATE POLICY "Owners & admins manage coupons" ON public.coupons
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (company_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.companies c WHERE c.id = coupons.company_id AND c.owner_id = auth.uid()
    ))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (company_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.companies c WHERE c.id = coupons.company_id AND c.owner_id = auth.uid()
    ))
  );

CREATE TRIGGER coupons_set_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
