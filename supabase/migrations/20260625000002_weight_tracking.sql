-- Add weight tracking columns to users table.
-- weight_logs: JSONB array of { date: 'YYYY-MM-DD', weight_lbs: number }
-- weight_goal: JSONB object with goal weight, target date, and baseline snapshot (null when no active goal)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS weight_logs JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS weight_goal JSONB;
