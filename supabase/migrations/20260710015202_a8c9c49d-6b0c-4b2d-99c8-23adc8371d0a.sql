
ALTER TABLE public.reviews ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS author_name text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS review_date timestamptz;
