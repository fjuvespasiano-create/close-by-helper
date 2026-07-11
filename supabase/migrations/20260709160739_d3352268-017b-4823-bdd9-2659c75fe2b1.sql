ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'publisher';

DO $$ BEGIN CREATE TYPE public.post_type AS ENUM ('article','news','blog','promo','event');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.publish_status AS ENUM ('draft','scheduled','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.appointment_status AS ENUM ('pending','confirmed','cancelled','completed','no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;