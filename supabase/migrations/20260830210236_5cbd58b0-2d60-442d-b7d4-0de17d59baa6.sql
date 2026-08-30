CREATE TABLE public.law_readings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date text NOT NULL,
  law text NOT NULL,
  articles text NOT NULL DEFAULT '',
  planned_minutes integer NOT NULL DEFAULT 15,
  read_seconds integer NOT NULL DEFAULT 0,
  done boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.law_readings TO authenticated;
GRANT ALL ON public.law_readings TO service_role;
ALTER TABLE public.law_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own law readings" ON public.law_readings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX law_readings_user_date_idx ON public.law_readings (user_id, date);