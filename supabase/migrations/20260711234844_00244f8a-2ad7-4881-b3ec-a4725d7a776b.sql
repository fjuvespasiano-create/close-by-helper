
-- 1) Verificação de dados em serviços públicos
ALTER TABLE public.public_services
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','auto','manual','stale')),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_source text,
  ADD COLUMN IF NOT EXISTS verified_by uuid;

CREATE INDEX IF NOT EXISTS idx_public_services_verification_status
  ON public.public_services (verification_status);

-- 2) Versão de onboarding no perfil
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_version text;

-- Marcar quem já concluiu como versão 1.0.0
UPDATE public.profiles
  SET onboarding_version = '1.0.0'
  WHERE onboarding_completed_at IS NOT NULL AND onboarding_version IS NULL;

-- 3) Restauração transacional de backups (por tabela, tudo-ou-nada)
CREATE OR REPLACE FUNCTION public.admin_restore_table_tx(
  _table text,
  _rows  jsonb,
  _mode  text DEFAULT 'upsert'   -- 'upsert' ou 'replace'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _allowed CONSTANT text[] := ARRAY[
    'cities','categories','event_categories','listing_categories',
    'profiles','user_roles','companies','company_categories',
    'company_media','company_faqs','company_projects',
    'listings','listing_categories','listing_messages','listing_reports',
    'reviews','favorites','leads','leads_planos',
    'jobs','job_sources','events','shows','appointments',
    'banners','ad_campaigns','promotions','coupons',
    'tourist_attractions','public_services','emergency_contacts',
    'bus_lines','representatives','representative_activities',
    'posts','post_categories','editorial_posts','plans_config',
    'notification_templates','system_settings'
  ];
  _inserted int := 0;
BEGIN
  -- Autorização: apenas admin autenticado
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin role required' USING ERRCODE = '42501';
  END IF;

  -- Allowlist de tabelas
  IF NOT (_table = ANY(_allowed)) THEN
    RAISE EXCEPTION 'table % is not restorable', _table USING ERRCODE = '42501';
  END IF;

  IF _mode NOT IN ('upsert','replace') THEN
    RAISE EXCEPTION 'invalid mode %', _mode USING ERRCODE = '22023';
  END IF;

  -- Toda a operação abaixo ocorre dentro da mesma transação implícita da função.
  -- Se qualquer statement falhar, o Postgres faz ROLLBACK automático de tudo
  -- que foi feito nesta chamada (delete + inserts do lote).
  IF _mode = 'replace' THEN
    EXECUTE format('DELETE FROM public.%I', _table);
  END IF;

  IF _rows IS NULL OR jsonb_typeof(_rows) <> 'array' OR jsonb_array_length(_rows) = 0 THEN
    RETURN jsonb_build_object('ok', true, 'inserted', 0);
  END IF;

  EXECUTE format(
    'INSERT INTO public.%I SELECT * FROM jsonb_populate_recordset(NULL::public.%I, $1) ' ||
    'ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at',
    _table, _table
  ) USING _rows;

  GET DIAGNOSTICS _inserted = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'inserted', _inserted);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_restore_table_tx(text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_restore_table_tx(text, jsonb, text) TO authenticated;
