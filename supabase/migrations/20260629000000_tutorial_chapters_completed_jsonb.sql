ALTER TABLE public.users ALTER COLUMN tutorial_chapters_completed DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN tutorial_chapters_completed TYPE JSONB USING tutorial_chapters_completed::jsonb;
ALTER TABLE public.users ALTER COLUMN tutorial_chapters_completed SET DEFAULT '[]'::jsonb;
