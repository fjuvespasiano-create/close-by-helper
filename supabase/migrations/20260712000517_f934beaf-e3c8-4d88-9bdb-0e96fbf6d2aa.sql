
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_logo_url text,
  ADD COLUMN IF NOT EXISTS company_size text,
  ADD COLUMN IF NOT EXISTS company_culture text,
  ADD COLUMN IF NOT EXISTS requirements text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nice_to_have text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS benefits text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS responsibilities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS workload text,
  ADD COLUMN IF NOT EXISTS apply_email text,
  ADD COLUMN IF NOT EXISTS apply_whatsapp text,
  ADD COLUMN IF NOT EXISTS application_deadline date,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz;

CREATE INDEX IF NOT EXISTS jobs_premium_idx
  ON public.jobs (is_premium, featured_until DESC NULLS LAST, posted_at DESC NULLS LAST)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS jobs_company_id_idx
  ON public.jobs (company_id) WHERE company_id IS NOT NULL;
