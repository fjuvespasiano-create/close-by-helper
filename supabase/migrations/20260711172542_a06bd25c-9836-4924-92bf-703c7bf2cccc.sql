CREATE OR REPLACE FUNCTION public.increment_push_counter(_notification_id uuid, _counter text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _counter = 'delivered_count' THEN
    UPDATE public.push_notifications SET delivered_count = COALESCE(delivered_count,0) + 1 WHERE id = _notification_id;
  ELSIF _counter = 'opened_count' THEN
    UPDATE public.push_notifications SET opened_count = COALESCE(opened_count,0) + 1 WHERE id = _notification_id;
  ELSIF _counter = 'clicked_count' THEN
    UPDATE public.push_notifications SET clicked_count = COALESCE(clicked_count,0) + 1 WHERE id = _notification_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_push_counter(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_push_counter(uuid, text) TO authenticated, service_role;