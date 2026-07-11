
-- 1) Enum for public service categories
CREATE TYPE public.public_service_category AS ENUM (
  'saude', 'educacao', 'seguranca', 'prefeitura',
  'transporte', 'assistencia_social', 'emergencia', 'outros'
);

-- 2) public_services table
CREATE TABLE public.public_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  category public.public_service_category NOT NULL,
  name TEXT NOT NULL,
  subtype TEXT,
  description TEXT,
  address TEXT,
  neighborhood TEXT,
  phone TEXT,
  phone_secondary TEXT,
  whatsapp TEXT,
  email TEXT,
  website TEXT,
  hours TEXT,
  is_24h BOOLEAN NOT NULL DEFAULT false,
  lat NUMERIC(9,6),
  lng NUMERIC(9,6),
  active BOOLEAN NOT NULL DEFAULT true,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_public_services_city ON public.public_services(city_id);
CREATE INDEX idx_public_services_category ON public.public_services(category);
CREATE INDEX idx_public_services_active ON public.public_services(active);

GRANT SELECT ON public.public_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_services TO authenticated;
GRANT ALL ON public.public_services TO service_role;

ALTER TABLE public.public_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_services public read"
  ON public.public_services FOR SELECT
  USING (active = true);

CREATE POLICY "public_services admin all"
  ON public.public_services FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_public_services_updated_at
  BEFORE UPDATE ON public.public_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) emergency_contacts table (national + local)
CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES public.cities(id) ON DELETE CASCADE, -- NULL = national/universal
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- lucide icon name
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_emergency_contacts_city ON public.emergency_contacts(city_id);

GRANT SELECT ON public.emergency_contacts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated;
GRANT ALL ON public.emergency_contacts TO service_role;

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "emergency_contacts public read"
  ON public.emergency_contacts FOR SELECT
  USING (active = true);

CREATE POLICY "emergency_contacts admin all"
  ON public.emergency_contacts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_emergency_contacts_updated_at
  BEFORE UPDATE ON public.emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Seed national emergency contacts (universal in Brazil)
INSERT INTO public.emergency_contacts (city_id, name, phone, description, icon, sort_order) VALUES
  (NULL, 'SAMU',            '192', 'Emergência médica',                  'Ambulance',   1),
  (NULL, 'Bombeiros',       '193', 'Incêndios, resgates e emergências',  'Flame',       2),
  (NULL, 'Polícia Militar', '190', 'Emergência policial',                'Shield',      3),
  (NULL, 'Polícia Civil',   '197', 'Registro de ocorrências',            'Badge',       4),
  (NULL, 'Defesa Civil',    '199', 'Enchentes, deslizamentos, riscos',   'CloudRain',   5),
  (NULL, 'Disque Denúncia', '181', 'Denúncia anônima',                   'PhoneCall',   6);

-- 5) Soft-deactivate companies outside Vespasiano and São José da Lapa
UPDATE public.companies
   SET status = 'inactive'
 WHERE city_id NOT IN (
   SELECT id FROM public.cities WHERE slug IN ('vespasiano', 'sao-jose-da-lapa')
 );
