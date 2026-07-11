-- Habilita Realtime para as mensagens do marketplace.
-- REPLICA IDENTITY FULL é necessário para que os eventos UPDATE tragam a linha completa
-- (usado para propagar leituras marcadas do outro lado).
ALTER TABLE public.listing_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_messages;