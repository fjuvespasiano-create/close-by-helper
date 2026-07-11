ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS route_patterns text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_company_id ON public.ad_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_active_dates ON public.ad_campaigns(active, starts_at, ends_at);

COMMENT ON COLUMN public.ad_campaigns.route_patterns IS
  'Lista de padrões de rota onde a campanha pode aparecer. Vazio = todas as rotas. Ex.: {/empregos,/vespasiano,/empresa/*}. Use * como curinga no final.';
COMMENT ON COLUMN public.ad_campaigns.company_id IS
  'Empresa anunciante (opcional). Se a empresa for Premium ativa, o peso da campanha é multiplicado por 3 na rotação.';