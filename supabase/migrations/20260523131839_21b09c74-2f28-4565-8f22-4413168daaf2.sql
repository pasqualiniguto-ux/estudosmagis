CREATE TABLE public.schedule_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own presets" ON public.schedule_presets
FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.schedule_preset_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  preset_id UUID NOT NULL REFERENCES public.schedule_presets(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL,
  planned_minutes INTEGER NOT NULL DEFAULT 30,
  recurring BOOLEAN NOT NULL DEFAULT false,
  day_of_week INTEGER NOT NULL DEFAULT 0,
  date TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_preset_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preset entries" ON public.schedule_preset_entries
FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_preset_entries_preset ON public.schedule_preset_entries(preset_id);