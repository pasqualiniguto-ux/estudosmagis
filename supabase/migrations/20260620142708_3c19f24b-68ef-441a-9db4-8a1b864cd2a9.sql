WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY subject_id ORDER BY sort_order ASC, created_at ASC) - 1 AS new_order
  FROM public.topics
)
UPDATE public.topics t
SET sort_order = ranked.new_order
FROM ranked
WHERE t.id = ranked.id AND t.sort_order IS DISTINCT FROM ranked.new_order;