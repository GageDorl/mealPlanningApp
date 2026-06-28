ALTER TABLE users ADD COLUMN IF NOT EXISTS tutorial_chapters_completed TEXT NOT NULL DEFAULT '[]';
