-- Baseline schema for fresh Postgres (no prod dump).
-- Inferred from application code — use for local/VPS bootstrap + import:harvest.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── family ──
CREATE TABLE IF NOT EXISTS family (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  timezone VARCHAR(64) DEFAULT 'Europe/Stockholm',
  time_display_mode VARCHAR(32) DEFAULT 'simple',
  morning_start VARCHAR(8),
  morning_end VARCHAR(8),
  day_start VARCHAR(8),
  day_end VARCHAR(8),
  evening_start VARCHAR(8),
  evening_end VARCHAR(8),
  night_start VARCHAR(8),
  night_end VARCHAR(8),
  streak_start_day SMALLINT DEFAULT 1,
  sound_enabled BOOLEAN DEFAULT true,
  subscription_status VARCHAR(32) DEFAULT 'none',
  trial_ends_at TIMESTAMPTZ,
  is_lifetime_free BOOLEAN DEFAULT false,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  rc_customer_id VARCHAR(255),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT,
  name VARCHAR(255),
  verified BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  family_role VARCHAR(64),
  onboarding_completed BOOLEAN DEFAULT false,
  newsletter_subscribed BOOLEAN DEFAULT true,
  account_type VARCHAR(32) DEFAULT 'family',
  preferred_view_mode VARCHAR(32) DEFAULT 'parent',
  apple_user_id VARCHAR(255),
  apple_email VARCHAR(255),
  locked BOOLEAN DEFAULT false,
  pending_deletion BOOLEAN DEFAULT false,
  deletion_requested_at TIMESTAMPTZ,
  widget_order JSONB,
  push_preferences JSONB DEFAULT '{}'::jsonb,
  admin_push_enabled BOOLEAN DEFAULT false,
  parent_pin_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS parent_email_lower_idx ON parent (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS parent_apple_user_id_idx ON parent (apple_user_id) WHERE apple_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS child (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  emoji VARCHAR(32) DEFAULT '⭐',
  avatar_url TEXT,
  birthday DATE,
  timezone VARCHAR(64) DEFAULT 'Europe/Stockholm',
  view_mode VARCHAR(32) DEFAULT 'auto',
  view_type VARCHAR(32),
  username VARCHAR(64),
  pin TEXT,
  pin_fingerprint TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  allow_child_reorder BOOLEAN DEFAULT false,
  show_now_next BOOLEAN DEFAULT true,
  show_mood_rating BOOLEAN DEFAULT false,
  hide_clock BOOLEAN DEFAULT false,
  lock_schedule BOOLEAN DEFAULT false,
  dopamin_animation BOOLEAN DEFAULT true,
  visual_timer BOOLEAN DEFAULT false,
  time_adjustment BOOLEAN DEFAULT false,
  color_coding BOOLEAN DEFAULT false,
  child_view_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS child_username_idx ON child (username) WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS parent_child (
  parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'shared',
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES parent(id),
  connected_at TIMESTAMPTZ,
  PRIMARY KEY (parent_id, child_id)
);

CREATE TABLE IF NOT EXISTS category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS activity_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  category_id UUID REFERENCES category(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(64) DEFAULT '⭐',
  star_value INTEGER DEFAULT 1,
  is_favorite BOOLEAN DEFAULT false,
  feedback_for VARCHAR(32) DEFAULT 'both',
  time_group VARCHAR(32) DEFAULT 'morgon',
  schema_type VARCHAR(32),
  sort_order INTEGER DEFAULT 0,
  source VARCHAR(32),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_sub_step (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_template_id UUID NOT NULL REFERENCES activity_template(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(64) DEFAULT '⭐',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS weekly_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES child(id) ON DELETE CASCADE,
  family_id UUID REFERENCES family(id) ON DELETE CASCADE,
  day_of_week SMALLINT,
  name VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_schedule_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_schedule_id UUID NOT NULL REFERENCES weekly_schedule(id) ON DELETE CASCADE,
  activity_template_id UUID NOT NULL REFERENCES activity_template(id) ON DELETE CASCADE,
  start_time VARCHAR(8),
  end_time VARCHAR(8),
  sort_order INTEGER DEFAULT 0,
  section VARCHAR(32) DEFAULT 'morgon'
);

CREATE TABLE IF NOT EXISTS special_day_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (child_id, date)
);

CREATE TABLE IF NOT EXISTS special_day_schedule_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  special_day_schedule_id UUID NOT NULL REFERENCES special_day_schedule(id) ON DELETE CASCADE,
  activity_template_id UUID REFERENCES activity_template(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(64) DEFAULT '⭐',
  start_time VARCHAR(8),
  end_time VARCHAR(8),
  star_value INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  section VARCHAR(32) DEFAULT 'morgon'
);

CREATE TABLE IF NOT EXISTS reward (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(32) DEFAULT '🎁',
  star_cost INTEGER DEFAULT 1,
  requires_approval BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  visible_to_children UUID[],
  source_default_id UUID,
  modified_by_family BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS child_reward_goal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES reward(id) ON DELETE CASCADE,
  status VARCHAR(32) DEFAULT 'active',
  set_by UUID REFERENCES parent(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_paused BOOLEAN DEFAULT false,
  generated_from UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (child_id, date)
);

CREATE TABLE IF NOT EXISTS daily_log_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID NOT NULL REFERENCES daily_log(id) ON DELETE CASCADE,
  activity_template_id UUID REFERENCES activity_template(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(64) DEFAULT '⭐',
  start_time VARCHAR(8),
  end_time VARCHAR(8),
  star_value INTEGER DEFAULT 1,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_date DATE,
  sort_order INTEGER DEFAULT 0,
  child_sort_order INTEGER DEFAULT 0,
  section VARCHAR(32) DEFAULT 'morgon',
  parent_note TEXT,
  child_note TEXT
);

CREATE TABLE IF NOT EXISTS daily_log_item_sub_step (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_item_id UUID NOT NULL REFERENCES daily_log_item(id) ON DELETE CASCADE,
  activity_sub_step_id UUID NOT NULL REFERENCES activity_sub_step(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE (daily_log_item_id, activity_sub_step_id)
);

CREATE TABLE IF NOT EXISTS reward_redemption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID NOT NULL REFERENCES reward(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  status VARCHAR(32) DEFAULT 'pending',
  star_cost INTEGER,
  sort_order INTEGER DEFAULT 0,
  approved_by UUID REFERENCES parent(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  redeemed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS streak (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL UNIQUE REFERENCES child(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  cycle_day INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE
);

CREATE TABLE IF NOT EXISTS child_observation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  section VARCHAR(16) NOT NULL,
  content TEXT NOT NULL,
  is_important BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS general_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_important BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS family_subscriptions (
  family_id UUID PRIMARY KEY REFERENCES family(id) ON DELETE CASCADE,
  tier VARCHAR(32) NOT NULL DEFAULT 'trial',
  trial_expires_at TIMESTAMPTZ,
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS family_subscriptions_components_gin ON family_subscriptions USING GIN (components);

CREATE OR REPLACE FUNCTION has_component(p_family_id UUID, p_component TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM family_subscriptions fs,
         jsonb_array_elements(fs.components) AS elem
    WHERE fs.family_id = p_family_id
      AND elem->>'component' = p_component
      AND (
        elem->>'expires_at' IS NULL
        OR (elem->>'expires_at')::timestamptz > NOW()
      )
  );
$$;

CREATE TABLE IF NOT EXISTS notification_preference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL UNIQUE REFERENCES parent(id) ON DELETE CASCADE,
  weekly_summary BOOLEAN DEFAULT true,
  reward_redemption BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS system_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  dismissed_by_parent_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── auth / session ──
CREATE TABLE IF NOT EXISTS email_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  token VARCHAR(256) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  resend_count INTEGER DEFAULT 0,
  last_resent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  token VARCHAR(256) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_change_token (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  new_email VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_token (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES parent(id) ON DELETE CASCADE,
  child_id UUID REFERENCES child(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL,
  family_id UUID REFERENCES family(id) ON DELETE CASCADE,
  user_type VARCHAR(16) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID UNIQUE REFERENCES parent(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  subscribed BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_token UUID DEFAULT gen_random_uuid(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_attempt (
  id SERIAL PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  ip_address VARCHAR(64),
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role VARCHAR(32) NOT NULL,
  family_id UUID REFERENCES family(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_consent (
  parent_id UUID PRIMARY KEY REFERENCES parent(id) ON DELETE CASCADE,
  analytics_storage VARCHAR(16) DEFAULT 'pending',
  ad_storage VARCHAR(16) DEFAULT 'pending',
  ad_user_data VARCHAR(16) DEFAULT 'pending',
  ad_personalization VARCHAR(16) DEFAULT 'pending',
  email_communication VARCHAR(16) DEFAULT 'pending',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── invites / pedagog ──
CREATE TABLE IF NOT EXISTS family_invite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  child_ids UUID[],
  token VARCHAR(128) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted BOOLEAN DEFAULT false,
  inviter_name VARCHAR(255),
  invitee_name VARCHAR(255),
  invitee_family_role VARCHAR(32),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedagog_invite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  inviter_parent_id UUID REFERENCES parent(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  invitee_name VARCHAR(255),
  child_ids UUID[],
  token VARCHAR(128) NOT NULL,
  expires_at TIMESTAMPTZ,
  accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── admin / platform stubs ──
CREATE TABLE IF NOT EXISTS features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(16) DEFAULT 'dev',
  tags TEXT[],
  priority VARCHAR(32),
  complexity INTEGER,
  estimated_hours NUMERIC(8,2),
  category VARCHAR(64),
  documentation JSONB DEFAULT '{}'::jsonb,
  dev_notes JSONB DEFAULT '[]'::jsonb,
  changelog JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_flag (
  key VARCHAR(128) PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS family_features (
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  feature_slug VARCHAR(128) NOT NULL,
  enabled_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (family_id, feature_slug)
);

CREATE TABLE IF NOT EXISTS default_activity_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(64) DEFAULT '⭐',
  star_value INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  sub_steps JSONB DEFAULT '[]'::jsonb,
  category_name VARCHAR(64),
  schema_type VARCHAR(32),
  template_group VARCHAR(32),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS default_reward (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(32) DEFAULT '🎁',
  star_cost INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS default_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(64),
  sort_order INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS default_schedule_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_schedule_id UUID NOT NULL REFERENCES default_schedule(id) ON DELETE CASCADE,
  default_activity_template_id UUID REFERENCES default_activity_template(id) ON DELETE SET NULL,
  name VARCHAR(255),
  icon VARCHAR(64),
  section VARCHAR(32),
  star_value INTEGER DEFAULT 1,
  start_time VARCHAR(8),
  end_time VARCHAR(8),
  sort_order INTEGER DEFAULT 0,
  sub_steps JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS welcome_email_template (
  id INTEGER PRIMARY KEY DEFAULT 1,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR(64) NOT NULL UNIQUE,
  label VARCHAR(255),
  subject TEXT,
  body_text TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES parent(id) ON DELETE SET NULL,
  target_family_id UUID REFERENCES family(id) ON DELETE SET NULL,
  action VARCHAR(128) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  endpoint TEXT,
  subscription_json JSONB,
  native_token TEXT,
  platform VARCHAR(16) DEFAULT 'web',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT,
  type VARCHAR(64),
  url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  event_type VARCHAR(128) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  time_bucket SMALLINT
);

CREATE TABLE IF NOT EXISTS analytics_daily_snapshots (
  date DATE PRIMARY KEY,
  active_families_24h INTEGER DEFAULT 0,
  active_families_7d INTEGER DEFAULT 0,
  total_stars_given BIGINT DEFAULT 0,
  total_rewards_claimed BIGINT DEFAULT 0,
  conversion_rate NUMERIC(8,2) DEFAULT 0,
  pwa_installed_count INTEGER DEFAULT 0,
  pwa_browser_count INTEGER DEFAULT 0,
  newsletter_subscribers_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pin_lockout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL UNIQUE REFERENCES child(id) ON DELETE CASCADE,
  ip_address VARCHAR(64),
  attempt_count INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  family_id UUID REFERENCES family(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  ip_address VARCHAR(64),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rating (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_item_id UUID NOT NULL REFERENCES daily_log_item(id) ON DELETE CASCADE,
  user_type VARCHAR(16) NOT NULL,
  score INTEGER,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (daily_log_item_id, user_type)
);

CREATE TABLE IF NOT EXISTS child_reward_goal_change_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  from_reward_id UUID REFERENCES reward(id) ON DELETE SET NULL,
  to_reward_id UUID REFERENCES reward(id) ON DELETE SET NULL,
  status VARCHAR(32) DEFAULT 'pending',
  resolved_by UUID REFERENCES parent(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS manual_star_grant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES parent(id) ON DELETE SET NULL,
  star_count INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedagog_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  pedagog_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood SMALLINT,
  sleep_quality VARCHAR(32),
  sleep_hours NUMERIC(4,1),
  meals TEXT,
  behavior TEXT,
  notes TEXT,
  meals_structured JSONB,
  is_draft BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (child_id, pedagog_id, date)
);

CREATE TABLE IF NOT EXISTS professional_share_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  label VARCHAR(255),
  parent_summary TEXT,
  date_from DATE,
  date_to DATE,
  pin_hash TEXT,
  fields TEXT[],
  created_by UUID REFERENCES parent(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  anonymous BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS parent_note (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES child(id) ON DELETE CASCADE,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminder_settings (
  family_id UUID PRIMARY KEY REFERENCES family(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  time VARCHAR(8),
  days INTEGER[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS waitlist (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) NOT NULL UNIQUE,
  utm_source VARCHAR(255),
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS professional_interest (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  organization VARCHAR(255),
  message TEXT,
  gdpr_consent BOOLEAN NOT NULL DEFAULT false,
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_professional_interest_created
  ON professional_interest (created_at DESC);

CREATE TABLE IF NOT EXISTS contact_message (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  message TEXT,
  message_type VARCHAR(32),
  is_read BOOLEAN DEFAULT false,
  internal_note TEXT,
  noted_at TIMESTAMPTZ,
  noted_by UUID REFERENCES parent(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_config (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES parent(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS dagens_nyhet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(280) NOT NULL,
  body VARCHAR(280) NOT NULL,
  show_landing BOOLEAN DEFAULT false,
  send_push BOOLEAN DEFAULT false,
  post_to_facebook BOOLEAN DEFAULT false,
  created_by UUID REFERENCES parent(id) ON DELETE SET NULL,
  status VARCHAR(32) DEFAULT 'draft',
  publish_at TIMESTAMPTZ,
  unpublish_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  facebook_post_id VARCHAR(255),
  push_sent_at TIMESTAMPTZ,
  email_sent_count INTEGER DEFAULT 0,
  email_failed_count INTEGER DEFAULT 0,
  email_sent_at TIMESTAMPTZ,
  email_failed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS library_update_log (
  id SERIAL PRIMARY KEY,
  kind VARCHAR(32) NOT NULL,
  change_count INTEGER NOT NULL DEFAULT 1,
  sample_description TEXT,
  flush_after TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS library_update_log_pending_kind_idx
  ON library_update_log (kind) WHERE sent_at IS NULL;

CREATE TABLE IF NOT EXISTS win_back_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES family(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES parent(id) ON DELETE SET NULL,
  parent_email VARCHAR(255),
  parent_name VARCHAR(255),
  child_id UUID REFERENCES child(id) ON DELETE SET NULL,
  child_name VARCHAR(255),
  subject TEXT,
  body TEXT,
  status VARCHAR(32) DEFAULT 'pending_approval',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO welcome_email_template (id, subject, body, is_active)
VALUES (1, 'Välkommen till Min Stjärndag', 'Hej {{foralderns_namn}}!', true)
ON CONFLICT (id) DO NOTHING;
