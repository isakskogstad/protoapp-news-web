-- Slack Watchlist Notifications tracking table
-- Run this in Supabase SQL Editor AFTER slack_watchlist.sql

-- Table to track sent notifications (prevents duplicates)
CREATE TABLE IF NOT EXISTS slack_watchlist_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES slack_watchlist(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('protokoll', 'kungorelse')),
  item_id TEXT NOT NULL, -- The id/org_number + date combo that was notified about
  slack_channel_id TEXT NOT NULL,
  slack_user_id TEXT NOT NULL,
  org_number TEXT NOT NULL,
  notified_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate notifications
  UNIQUE(watchlist_id, item_type, item_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_watchlist_notifications_item
  ON slack_watchlist_notifications(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_notifications_watchlist
  ON slack_watchlist_notifications(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_notifications_org
  ON slack_watchlist_notifications(org_number);
CREATE INDEX IF NOT EXISTS idx_watchlist_notifications_time
  ON slack_watchlist_notifications(notified_at);

-- Enable RLS
ALTER TABLE slack_watchlist_notifications ENABLE ROW LEVEL SECURITY;

-- Allow all operations for service role
CREATE POLICY "Allow all for service role" ON slack_watchlist_notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON slack_watchlist_notifications TO authenticated;
GRANT ALL ON slack_watchlist_notifications TO service_role;

-- Cleanup function to remove old notification records (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_watchlist_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM slack_watchlist_notifications
  WHERE notified_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE slack_watchlist_notifications IS 'Tracks sent watchlist notifications to prevent duplicates';
