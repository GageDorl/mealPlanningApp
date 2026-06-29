-- Revert tutorial_chapters_completed from JSONB back to TEXT.
-- The JSONB type caused PowerSync to double-serialize the value when syncing
-- to SQLite (column.text in sync rules), resulting in chapter IDs being spread
-- into individual characters. TEXT is the correct type for PowerSync-managed columns.
ALTER TABLE public.users ALTER COLUMN tutorial_chapters_completed DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN tutorial_chapters_completed TYPE TEXT USING tutorial_chapters_completed::text;
ALTER TABLE public.users ALTER COLUMN tutorial_chapters_completed SET DEFAULT '[]';

-- Reset any rows with malformed data (individual-character arrays from the JSONB mismatch bug).
-- Uses a DO block so that rows with non-array JSON values are skipped or reset safely.
DO $$
DECLARE
  r RECORD;
  has_short_elem BOOLEAN;
BEGIN
  FOR r IN SELECT id, tutorial_chapters_completed FROM public.users LOOP
    BEGIN
      IF json_typeof(r.tutorial_chapters_completed::json) = 'array' THEN
        SELECT bool_or(length(elem) <= 2)
        INTO has_short_elem
        FROM json_array_elements_text(r.tutorial_chapters_completed::json) AS elem;
        IF COALESCE(has_short_elem, false) THEN
          UPDATE public.users SET tutorial_chapters_completed = '[]' WHERE id = r.id;
        END IF;
      ELSE
        -- Non-array value (scalar or object) — reset to empty array
        UPDATE public.users SET tutorial_chapters_completed = '[]' WHERE id = r.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.users SET tutorial_chapters_completed = '[]' WHERE id = r.id;
    END;
  END LOOP;
END;
$$;
