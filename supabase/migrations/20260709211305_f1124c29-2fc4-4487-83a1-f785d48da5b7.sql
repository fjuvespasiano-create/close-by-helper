-- push_subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  platform TEXT,
  is_pwa BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subs read"   ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own subs insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own subs update" ON public.push_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own subs delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- notification_templates
CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  emoji TEXT,
  color TEXT,
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  icon_url TEXT,
  default_url TEXT,
  sort INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_templates TO authenticated, anon;
GRANT ALL ON public.notification_templates TO service_role;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates public read" ON public.notification_templates FOR SELECT USING (true);
CREATE POLICY "templates admin write" ON public.notification_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.notification_templates (slug,name,category,emoji,color,title_template,body_template,sort) VALUES
  ('promocao','Promoção','promocao','🎉','#F97316','Promoção especial pra você!','Confira as melhores ofertas de hoje no AgendaAqui.',1),
  ('novidade','Novidade','novidade','🚀','#3B82F6','Novidade no AgendaAqui','Acabou de chegar uma novidade que você vai gostar.',2),
  ('destaque','Empresa em destaque','empresa','⭐','#FACC15','Empresa em destaque','Conheça a empresa que está bombando na sua cidade.',3),
  ('comunicado','Comunicado','sistema','📢','#0EA5E9','Aviso importante','Uma novidade oficial do AgendaAqui pra você.',4),
  ('noticia','Notícia','noticias','📰','#8B5CF6','Notícia quentinha','Fique por dentro do que está acontecendo na sua região.',5),
  ('oferta','Oferta relâmpago','promocao','🎁','#EC4899','Oferta imperdível','Aproveite antes que acabe.',6),
  ('evento','Evento','evento','📅','#22C55E','Evento chegando','Não perca o próximo evento da sua cidade.',7),
  ('manutencao','Manutenção','sistema','⚠️','#EF4444','Manutenção programada','O AgendaAqui passará por manutenção rápida.',8);

-- push_notifications (campanhas / envios)
CREATE TABLE public.push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon_url TEXT,
  image_url TEXT,
  url TEXT,
  category TEXT NOT NULL DEFAULT 'geral',
  priority TEXT NOT NULL DEFAULT 'normal',
  color TEXT,
  emoji TEXT,
  buttons JSONB,
  audience JSONB NOT NULL DEFAULT '{"kind":"all"}'::jsonb,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_count INT NOT NULL DEFAULT 0,
  delivered_count INT NOT NULL DEFAULT 0,
  opened_count INT NOT NULL DEFAULT 0,
  clicked_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  unsubscribed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_notif_status ON public.push_notifications(status, scheduled_at);
CREATE INDEX idx_push_notif_created ON public.push_notifications(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_notifications TO authenticated;
GRANT ALL ON public.push_notifications TO service_role;
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push notif admin all" ON public.push_notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER push_notif_updated BEFORE UPDATE ON public.push_notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- push_deliveries
CREATE TABLE public.push_deliveries (
  id BIGSERIAL PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES public.push_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.push_subscriptions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  device TEXT,
  browser TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (notification_id, user_id, subscription_id)
);
CREATE INDEX idx_deliv_notif ON public.push_deliveries(notification_id);
CREATE INDEX idx_deliv_user  ON public.push_deliveries(user_id);
GRANT SELECT, INSERT, UPDATE ON public.push_deliveries TO authenticated;
GRANT ALL ON public.push_deliveries TO service_role;
ALTER TABLE public.push_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliv own read"  ON public.push_deliveries FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "deliv admin all" ON public.push_deliveries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- push_inbox (caixa de entrada)
CREATE TABLE public.push_inbox (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.push_notifications(id) ON DELETE CASCADE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  favorite_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  UNIQUE (user_id, notification_id)
);
CREATE INDEX idx_inbox_user_time ON public.push_inbox(user_id, received_at DESC);
CREATE INDEX idx_inbox_unread ON public.push_inbox(user_id) WHERE read_at IS NULL AND archived_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_inbox TO authenticated;
GRANT ALL ON public.push_inbox TO service_role;
ALTER TABLE public.push_inbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inbox own read"   ON public.push_inbox FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "inbox own upd"    ON public.push_inbox FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inbox own del"    ON public.push_inbox FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "inbox admin ins"  ON public.push_inbox FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR auth.uid() = user_id);

-- notification_preferences
CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  promocoes BOOLEAN NOT NULL DEFAULT true,
  novidades BOOLEAN NOT NULL DEFAULT true,
  eventos BOOLEAN NOT NULL DEFAULT true,
  atualizacoes BOOLEAN NOT NULL DEFAULT true,
  empresas BOOLEAN NOT NULL DEFAULT true,
  blog BOOLEAN NOT NULL DEFAULT true,
  marketplace BOOLEAN NOT NULL DEFAULT true,
  som BOOLEAN NOT NULL DEFAULT true,
  vibracao BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_start INT NOT NULL DEFAULT 20,
  quiet_end INT NOT NULL DEFAULT 8,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs own" ON public.notification_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER prefs_updated BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();