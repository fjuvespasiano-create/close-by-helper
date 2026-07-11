
-- Novas colunas em companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS founded_year integer,
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS response_time_minutes integer,
  ADD COLUMN IF NOT EXISTS response_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS services_completed integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clients_served integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS certifications jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS coverage_cities uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tour_360_url text,
  ADD COLUMN IF NOT EXISTS catalog_url text,
  ADD COLUMN IF NOT EXISTS pricebook_url text,
  ADD COLUMN IF NOT EXISTS portfolio_pdf_url text,
  ADD COLUMN IF NOT EXISTS tiktok text,
  ADD COLUMN IF NOT EXISTS youtube text,
  ADD COLUMN IF NOT EXISTS quality_scores jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reputation_score integer,
  ADD COLUMN IF NOT EXISTS badges text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS price_range smallint,
  ADD COLUMN IF NOT EXISTS promotions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS financing_info jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS differentials text[] DEFAULT '{}';

-- Tabela de projetos (antes/depois)
CREATE TABLE IF NOT EXISTS public.company_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  description text,
  before_url text,
  after_url text,
  images text[] DEFAULT '{}',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.company_projects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_projects TO authenticated;
GRANT ALL ON public.company_projects TO service_role;

ALTER TABLE public.company_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read company projects"
  ON public.company_projects FOR SELECT
  USING (true);

CREATE POLICY "Owners manage their projects"
  ON public.company_projects FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()));

CREATE POLICY "Admins manage all projects"
  ON public.company_projects FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER company_projects_updated_at
  BEFORE UPDATE ON public.company_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tabela de FAQ da empresa
CREATE TABLE IF NOT EXISTS public.company_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.company_faqs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_faqs TO authenticated;
GRANT ALL ON public.company_faqs TO service_role;

ALTER TABLE public.company_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read company faqs"
  ON public.company_faqs FOR SELECT
  USING (true);

CREATE POLICY "Owners manage their faqs"
  ON public.company_faqs FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()));

CREATE POLICY "Admins manage all faqs"
  ON public.company_faqs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER company_faqs_updated_at
  BEFORE UPDATE ON public.company_faqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
