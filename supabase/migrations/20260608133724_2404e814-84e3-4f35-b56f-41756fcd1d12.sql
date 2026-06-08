ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY subject_id ORDER BY created_at) - 1 AS rn
  FROM public.topics
)
UPDATE public.topics t SET sort_order = o.rn FROM ordered o WHERE t.id = o.id;

CREATE INDEX IF NOT EXISTS idx_topics_subject_sort ON public.topics(subject_id, sort_order);