CREATE TABLE public.day_times (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  day_of_week integer NOT NULL,
  start_time text,
  break_start text,
  break_end text,
  end_time text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_of_week)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_times TO authenticated;
GRANT ALL ON public.day_times TO service_role;

ALTER TABLE public.day_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own day times" ON public.day_times FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_day_times_updated_at BEFORE UPDATE ON public.day_times FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();