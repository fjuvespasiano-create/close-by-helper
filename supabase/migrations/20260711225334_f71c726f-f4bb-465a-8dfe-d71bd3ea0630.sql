
CREATE TABLE IF NOT EXISTS public.editorial_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_date date NOT NULL,
  theme text NOT NULL,
  format text NOT NULL DEFAULT 'Reels',
  caption text NOT NULL,
  status text NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado','producao','agendado','publicado','cancelado')),
  campaign text,
  city text,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  tags text[] DEFAULT ARRAY[]::text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS editorial_posts_publish_date_idx ON public.editorial_posts (publish_date);
CREATE INDEX IF NOT EXISTS editorial_posts_status_idx ON public.editorial_posts (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.editorial_posts TO authenticated;
GRANT ALL ON public.editorial_posts TO service_role;

ALTER TABLE public.editorial_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "editorial_posts_admin_all" ON public.editorial_posts;
CREATE POLICY "editorial_posts_admin_all"
  ON public.editorial_posts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS editorial_posts_set_updated_at ON public.editorial_posts;
CREATE TRIGGER editorial_posts_set_updated_at
  BEFORE UPDATE ON public.editorial_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed: Calendário editorial de agosto/2026 — Auto Limpeza Pro
INSERT INTO public.editorial_posts (publish_date, theme, format, caption, campaign, city, tags) VALUES
('2026-08-04','Estiagem chegou: poeira no ar-condicionado do carro (dor)','Reels 15s','Seu ar-condicionado tá cuspindo poeira em SJL? A gente higieniza em 40 min. Agenda pelo AgendaAqui.','Sazonal','São José da Lapa',ARRAY['dor','estiagem']),
('2026-08-05','Agosto Lilás — respeito começa em casa','Card estático + Stories','Neste Agosto Lilás, a Auto Limpeza Pro apoia o 180. Denuncie. Proteja. Compartilhe.','Agosto Lilás',NULL,ARRAY['conscientizacao']),
('2026-08-06','Antes/Depois: banco de tecido do Onix','Reels 30s slider','Achou que ia trocar de banco? Trocamos o estado dele. Orçamento no direct.','Transformação',NULL,ARRAY['antes-depois']),
('2026-08-07','Bastidor — conheça o Rafael, dono da Auto Limpeza Pro','Reels apresentação','Quem cuida do seu carro tem nome, CNPJ e 4.9★ no Google. Fale com a gente.','Autoridade',NULL,ARRAY['bastidor']),
('2026-08-08','Dia dos Pais chegando — presente que ele vai usar','Carrossel 5 slides','Vale-presente Auto Limpeza Pro. Ele merece dirigir num carro impecável. Compre até 09/08.','Dia dos Pais',NULL,ARRAY['sazonal','oferta']),
('2026-08-09','Última chamada Dia dos Pais','Stories interativos','Corre: só hoje entregamos o vale-presente por WhatsApp. Toca no link.','Dia dos Pais',NULL,ARRAY['urgencia']),
('2026-08-10','Dia dos Pais — homenagem','Reels emocional','Feliz Dia dos Pais. Que a estrada seja limpa. 🚗❤️','Dia dos Pais',NULL,ARRAY['institucional']),
('2026-08-11','Dia do Estudante — universitário que roda muito','Carrossel educativo','Passa mais tempo no carro do que na sala de aula? Higieniza a cada 6 meses.','Dia do Estudante',NULL,ARRAY['educativo']),
('2026-08-12','Mito ou verdade: lavar estofado estraga a espuma','Reels didático','Mito. Nossa extração seca em 4h. Salva o print e me manda dúvidas.','Educativo',NULL,ARRAY['mito-verdade']),
('2026-08-13','Depoimento cliente Vespasiano','Reels UGC','Marina, de Vespasiano, é cliente há 2 anos. Ouve ela. Sua vez?','Prova social','Vespasiano',ARRAY['depoimento']),
('2026-08-14','Agosto Dourado — carro limpo, bebê protegido','Carrossel','Ácaro, fungo e resto de leite. Higienização hipoalergênica para o bebê.','Agosto Dourado',NULL,ARRAY['conscientizacao','familia']),
('2026-08-15','Sextou — combo lava-jato + higienização interna','Stories cupom','Só até domingo: 15% no combo completo. Cupom SEXTOU15 no AgendaAqui.','Oferta',NULL,ARRAY['promo']),
('2026-08-16','Live Q&A: quanto custa higienizar?','Live 15min + Reels','Tira dúvidas ao vivo às 15h. Traz seu carro pra fila virtual.','Engajamento',NULL,ARRAY['live']),
('2026-08-17','Dica de domingo — como conservar entre higienizações','Carrossel','Salva esse post pra lembrar toda semana. Marca um amigo motorista.','Educativo',NULL,ARRAY['dica']),
('2026-08-18','Poeira em Vespasiano — dor do bairro industrial','Reels externo','Trabalha na região da Cimento Nacional? Seu carpete precisa disso aqui.','Geo-alvo','Vespasiano',ARRAY['dor','geo']),
('2026-08-19','Antes/depois — motorista de app','Reels 30s','Seu carro é seu escritório. Nota 5 começa no cheirinho. Agenda com desconto Uber.','Nicho',NULL,ARRAY['antes-depois']),
('2026-08-20','Diferença entre lavagem e higienização','Carrossel 6 slides','Não é a mesma coisa. Salva esse post antes que o vizinho salve.','Educativo',NULL,ARRAY['educativo']),
('2026-08-21','Bastidor — nova extratora profissional','Stories + Reels','Nova extratora profissional na Auto Limpeza Pro. Resultado até 40% mais rápido.','Autoridade',NULL,ARRAY['bastidor']),
('2026-08-22','Sua sogra vai entrar no carro esse fim de semana? (humor)','Reels roteirizado','Agenda emergencial pra sábado. Chama no WhatsApp.','Humor',NULL,ARRAY['humor']),
('2026-08-23','Depoimento cliente SJL','Card review','⭐⭐⭐⭐⭐ Parecia carro zero. — Cliente de SJL. Sua vez?','Prova social','São José da Lapa',ARRAY['depoimento']),
('2026-08-24','Enquete — próximo conteúdo','Story enquete','Você escolhe o próximo Reels. Vota aí 👆','Engajamento',NULL,ARRAY['engajamento']),
('2026-08-25','Dor: mancha de café no banco','Reels timelapse','Café derramado não é sentença. Removemos 9 em cada 10 manchas.','Dor',NULL,ARRAY['dor','antes-depois']),
('2026-08-26','Autoridade — certificações e produtos usados','Carrossel institucional','Só produtos automotivos certificados. Seu couro agradece.','Autoridade',NULL,ARRAY['institucional']),
('2026-08-27','2 anos atendendo SJL e Vespasiano','Reels retrospectiva','Mais de 800 carros. Obrigado, região. Vem o mês que vem com novidade.','Institucional',NULL,ARRAY['aniversario']),
('2026-08-28','Dica rápida — cheiro de cachorro no banco','Reels 15s','Amigo peludo é vida. Cheiro dele no banco, não. Higieniza a cada 3 meses.','Educativo',NULL,ARRAY['dica','pets']),
('2026-08-29','Fechamento — últimas vagas de agosto','Stories contador','Restam 4 horários pra sexta e sábado. Corre no AgendaAqui.','Urgência',NULL,ARRAY['urgencia']),
('2026-08-30','Antes/depois — o trabalho do mês','Reels destaque','O trabalho do mês. Marca aquele amigo que precisa ver isso.','Transformação',NULL,ARRAY['antes-depois']),
('2026-08-31','Prévia de setembro — Setembro Amarelo','Card teaser','Mês que vem a gente fala sobre uma dor que ninguém vê. #SetembroAmarelo','Setembro Amarelo',NULL,ARRAY['teaser','conscientizacao']);
