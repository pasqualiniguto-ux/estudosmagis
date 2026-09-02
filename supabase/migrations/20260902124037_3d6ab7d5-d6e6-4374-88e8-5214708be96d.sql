ALTER TABLE public.law_readings ALTER COLUMN date SET DEFAULT '';
ALTER TABLE public.law_readings ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.law_readings ADD CONSTRAINT law_readings_status_check CHECK (status IN ('pending','partial','done'));
UPDATE public.law_readings SET status = CASE WHEN done THEN 'done' WHEN read_seconds > 0 THEN 'partial' ELSE 'pending' END;