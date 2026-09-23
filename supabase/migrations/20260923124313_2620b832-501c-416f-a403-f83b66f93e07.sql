ALTER TABLE public.topics ADD COLUMN parent_id uuid REFERENCES public.topics(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS topics_parent_id_idx ON public.topics(parent_id);