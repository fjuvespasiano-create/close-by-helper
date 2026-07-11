DROP INDEX IF EXISTS public.ux_public_services_city_cat_name;
CREATE UNIQUE INDEX IF NOT EXISTS ux_public_services_city_cat_name ON public.public_services (city_id, category, name);