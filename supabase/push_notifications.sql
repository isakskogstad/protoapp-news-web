-- Push Notifications Setup for LoopDesk
-- Run this in your Supabase SQL Editor

-- 1. Create PushSubscriptions table
CREATE TABLE IF NOT EXISTS "PushSubscriptions" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT,
  endpoint TEXT UNIQUE NOT NULL,
  keys JSONB NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user 
ON "PushSubscriptions"(user_email);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint 
ON "PushSubscriptions"(endpoint);

-- RLS policies
ALTER TABLE "PushSubscriptions" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own subscriptions
CREATE POLICY "Users can manage own subscriptions" ON "PushSubscriptions"
  FOR ALL USING (true);

-- 2. Create webhook trigger function
CREATE OR REPLACE FUNCTION notify_push_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
  -- Build payload
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', row_to_json(NEW)
  );

  -- Call the Edge Function via pg_net (async HTTP)
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create triggers for news tables
DROP TRIGGER IF EXISTS push_notification_protocol ON "ProtocolAnalysis";
CREATE TRIGGER push_notification_protocol
  AFTER INSERT ON "ProtocolAnalysis"
  FOR EACH ROW
  EXECUTE FUNCTION notify_push_on_insert();

DROP TRIGGER IF EXISTS push_notification_kungorelse ON "Kungorelser";
CREATE TRIGGER push_notification_kungorelse
  AFTER INSERT ON "Kungorelser"
  FOR EACH ROW
  EXECUTE FUNCTION notify_push_on_insert();

-- 4. Alternative: Use Supabase Database Webhooks (recommended)
-- Instead of pg_net triggers, configure Database Webhooks in Supabase Dashboard:
-- 1. Go to Database > Webhooks
-- 2. Create webhook for ProtocolAnalysis table (INSERT events)
-- 3. Create webhook for Kungorelser table (INSERT events)
-- 4. Set URL to: https://your-project.supabase.co/functions/v1/send-push-notification
-- 5. Add Authorization header with service role key

COMMENT ON TABLE "PushSubscriptions" IS 'Stores Web Push subscription data for sending notifications even when browser is closed';
