ALTER TABLE users
  ADD COLUMN selected_calendar_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN calendar_export_enabled BOOLEAN NOT NULL DEFAULT FALSE;
