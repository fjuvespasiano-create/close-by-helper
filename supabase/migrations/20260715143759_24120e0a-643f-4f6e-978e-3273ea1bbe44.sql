GRANT INSERT ON public.qa_tickets TO anon;
GRANT SELECT, INSERT, UPDATE ON public.qa_tickets TO authenticated;
GRANT ALL ON public.qa_tickets TO service_role;