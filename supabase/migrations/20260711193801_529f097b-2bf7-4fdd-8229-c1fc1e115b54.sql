-- 1. Tabela de editais/licitações
CREATE TABLE IF NOT EXISTS public.procurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  source_site TEXT NOT NULL,               -- ex.: "vespasiano.mg.gov.br"
  source_url TEXT NOT NULL,                -- URL do edital/lista
  external_id TEXT,                        -- número/identificador do edital na origem
  process_number TEXT,                     -- número do processo administrativo
  modality TEXT,                           -- pregao_eletronico | pregao_presencial | tomada_precos | concorrencia | dispensa | inexigibilidade | chamada_publica | outros
  title TEXT NOT NULL,
  object TEXT,                             -- descrição do objeto licitado
  agency TEXT,                             -- órgão/secretaria responsável
  status TEXT NOT NULL DEFAULT 'open',     -- open | suspended | canceled | finished | unknown
  publish_date DATE,
  opening_date TIMESTAMPTZ,                -- data/hora de abertura das propostas
  deadline_date TIMESTAMPTZ,               -- limite de entrega
  estimated_value NUMERIC(14,2),
  files JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{name, url, mime}]
  raw_excerpt TEXT,                        -- trecho markdown de referência (debug)
  content_hash TEXT,                       -- hash sha256 do conteúdo relevante
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. GRANTs (obrigatórios em toda tabela pública)
GRANT SELECT ON public.procurements TO anon;
GRANT SELECT ON public.procurements TO authenticated;
GRANT ALL ON public.procurements TO service_role;

-- 3. RLS
ALTER TABLE public.procurements ENABLE ROW LEVEL SECURITY;

-- 4. Policies: leitura pública, escrita apenas via service_role (bypassa RLS)
CREATE POLICY "procurements_public_read"
  ON public.procurements FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. Índices
CREATE INDEX IF NOT EXISTS ix_procurements_city ON public.procurements(city_id);
CREATE INDEX IF NOT EXISTS ix_procurements_status ON public.procurements(status);
CREATE INDEX IF NOT EXISTS ix_procurements_modality ON public.procurements(modality);
CREATE INDEX IF NOT EXISTS ix_procurements_publish_date ON public.procurements(publish_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS ix_procurements_opening_date ON public.procurements(opening_date DESC NULLS LAST);

-- Dedupe: (cidade, site fonte, external_id) — quando external_id existe
CREATE UNIQUE INDEX IF NOT EXISTS ux_procurements_city_source_extid
  ON public.procurements(city_id, source_site, external_id)
  WHERE external_id IS NOT NULL;

-- Fallback dedupe: (cidade, source_url, lower(title))
CREATE UNIQUE INDEX IF NOT EXISTS ux_procurements_city_url_title
  ON public.procurements(city_id, source_url, lower(title))
  WHERE external_id IS NULL;

-- Busca textual em título/objeto
CREATE INDEX IF NOT EXISTS ix_procurements_title_trgm
  ON public.procurements USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_procurements_object_trgm
  ON public.procurements USING gin (object gin_trgm_ops);

-- 6. Trigger updated_at (reusa função existente public.set_updated_at)
DROP TRIGGER IF EXISTS trg_procurements_updated_at ON public.procurements;
CREATE TRIGGER trg_procurements_updated_at
  BEFORE UPDATE ON public.procurements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
