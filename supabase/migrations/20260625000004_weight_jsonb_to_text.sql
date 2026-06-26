-- Change weight_logs and weight_goal from JSONB to TEXT.
-- PowerSync stores column.text values as SQLite TEXT; when Supabase returns JSONB via the
-- sync stream the value arrives as a JS object. Some PowerSync SDK paths call String() on
-- it, producing "[object Object]" instead of a JSON string, which breaks JSON.parse in the
-- app. Storing these as TEXT columns means the value is always a plain string on both sides.
ALTER TABLE users
  ALTER COLUMN weight_logs TYPE TEXT USING COALESCE(weight_logs::text, '[]'),
  ALTER COLUMN weight_logs SET NOT NULL,
  ALTER COLUMN weight_logs SET DEFAULT '[]',
  ALTER COLUMN weight_goal TYPE TEXT USING weight_goal::text;
