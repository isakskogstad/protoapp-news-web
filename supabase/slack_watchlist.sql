-- Slack Watchlist table for company monitoring
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS slack_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_user_id TEXT NOT NULL,
  slack_channel_id TEXT NOT NULL,
  org_number TEXT NOT NULL,
  company_name TEXT NOT NULL,
  watch_types TEXT[] DEFAULT ARRAY['all'],
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint per user per company
  UNIQUE(slack_user_id, org_number)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON slack_watchlist(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_org ON slack_watchlist(org_number);
CREATE INDEX IF NOT EXISTS idx_watchlist_channel ON slack_watchlist(slack_channel_id);

-- Enable RLS
ALTER TABLE slack_watchlist ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (service role)
CREATE POLICY "Allow all for service role" ON slack_watchlist
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON slack_watchlist TO authenticated;
GRANT ALL ON slack_watchlist TO service_role;
