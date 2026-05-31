/**
 * Zod validation schemas for all API endpoints.
 * Owns: input shape validation for body, params, query.
 * Does NOT own: business logic validation (e.g. "does child belong to family").
 *
 * DESIGN RULE: Schemas match what the frontend ACTUALLY sends today.
 * Optional fields stay optional. No new required fields introduced.
 * If a field is currently optional/loose in the route, it stays optional here.
 */

const { z } = require('zod');

// ─── Shared primitives ────────────────────────────────────

/** UUID param — used for most :id params */
const uuid = z.string().uuid({ message: 'Ogiltigt ID-format' });

/** UUID param that can also be a named route segment */
const uuidParam = z.object({ id: uuid });

/** Safe text: non-empty, reasonable max length */
const shortText = z.string().min(1, 'Fältet får inte vara tomt').max(200, 'Texten är för lång');

/** Optional text field — can be empty or missing */
const optionalText = z.string().max(500, 'Texten är för lång').optional();

/** Emoji field — any short string (frontend picks from emoji picker, any unicode accepted) */
const emoji = z.string().max(10, 'Emoji-värde för långt').optional();

/** Star value 1–5 */
const starValue = z.coerce.number().int().min(1).max(5);

/** Positive integer (star costs, counts) */
const positiveInt = z.coerce.number().int().min(1);

/** 4-digit PIN string */
const pin4 = z
  .string()
  .regex(/^\d{4}$/, 'PIN-koden måste bestå av exakt 4 siffror');

/** Date string YYYY-MM-DD — nullable because clients send null for empty dates */
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ogiltigt datumformat, använd YYYY-MM-DD')
  .or(z.literal(''))
  .nullish();

/** Time string HH:MM — nullish because frontend sends null for empty time fields */
const timeString = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Ogiltigt tidsformat, använd HH:MM')
  .nullish();

/** Email */
const email = z.string().email({ message: 'Ogiltig e-postadress' }).max(254);

/** URL — optional, must be valid if provided */
const optionalUrl = z.string().url({ message: 'Ogiltig URL' }).optional().or(z.literal(''));

// ─── Auth ─────────────────────────────────────────────────

const RegisterSchema = z.object({
  email: email,
  password: z.string().min(8, 'Lösenord måste vara minst 8 tecken').max(128),
  name: z.string().min(1, 'Namn krävs').max(100),
  // invite_token is optional — used for multi-parent invite flow
  invite_token: z.string().max(128).optional(),
  // language is optional
  language: z.string().max(10).optional(),
});

const LoginSchema = z.object({
  email: email,
  password: z.string().min(1, 'Lösenord krävs').max(128),
});

const ChildLoginSchema = z.object({
  username: z.string().min(1, 'Användarnamn krävs').max(50),
  pin: pin4,
});

const ForgotPasswordSchema = z.object({
  email: email,
});

const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token krävs').max(256),
  password: z.string().min(8, 'Lösenord måste vara minst 8 tecken').max(128),
});

const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Token krävs').max(256),
});

const ResendVerificationSchema = z.object({
  email: email,
});

// ─── Children ────────────────────────────────────────────

const CreateChildSchema = z.object({
  name: z.string().min(1, 'Barnets namn krävs').max(100),
  emoji: z.string().min(1, 'Välj en emoji').max(10),
  birthday: dateString,
  // PIN is optional — auto-generated if not provided
  pin: z.string().regex(/^\d{4}$/).optional(),
  // avatar_url is optional — set after avatar upload; emoji is fallback when NULL
  avatar_url: z.string().url({ message: "Ogiltig URL" }).max(500).optional(),
});

const UpdateChildSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  emoji: z.string().min(1).max(10).optional(),
  birthday: dateString,
  pin: z.string().regex(/^\d{4}$/).optional(),
  timezone: z.string().max(50).optional(),
  view_mode: z.string().max(20).optional(),
  view_type: z.enum(['day_sections', 'now_next_later']).optional(),
  allow_child_reorder: z.boolean().optional(),
  show_now_next: z.boolean().optional(),
  show_mood_rating: z.boolean().optional(),
  hide_clock: z.boolean().optional(),
  lock_schedule: z.boolean().optional(),
  dopamin_animation: z.boolean().optional(),
  visual_timer: z.boolean().optional(),
  time_adjustment: z.boolean().optional(),
  color_coding: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
  // avatar_url: nullable — set to null to clear avatar and show emoji instead
  avatar_url: z.string().url({ message: "Ogiltig URL" }).max(500).nullable().optional(),
});

const ChildPinLoginSchema = z.object({
  // childId is in params, PIN in body
  pin: pin4,
});

const UpdateChildPinSchema = z.object({
  pin: pin4,
});

const ChildViewConfigSchema = z.object({
  view_mode: z.enum(['classic', 'new']).optional(),
  show_countdown_timer: z.boolean().optional(),
  show_timeline_pipeline: z.boolean().optional(),
  show_child_profile_card: z.boolean().optional(),
  show_progress_ring: z.boolean().optional(),
  show_star_goal: z.boolean().optional(),
});

// ─── Activities ───────────────────────────────────────────

const timeGroupEnum = z.enum(['morgon', 'formiddag', 'eftermiddag', 'kvall']);
const feedbackForEnum = z.enum(['both', 'child', 'parent', 'none']);
const schemaTypeEnum = z.enum(['forskola', 'skola']).optional().nullable();

const CreateActivitySchema = z.object({
  name: z.string().min(1, 'Aktivitetsnamn krävs').max(200),
  icon: emoji,
  category_id: uuid.optional().nullable(),
  star_value: starValue.optional().default(1),
  is_favorite: z.boolean().optional().default(false),
  feedback_for: feedbackForEnum.optional().default('both'),
  time_group: timeGroupEnum.optional().default('morgon'),
  schema_type: schemaTypeEnum,
});

const UpdateActivitySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  icon: emoji,
  category_id: uuid.optional().nullable(),
  star_value: starValue.optional(),
  is_favorite: z.boolean().optional(),
  feedback_for: feedbackForEnum.optional(),
  sort_order: z.coerce.number().int().optional(),
  time_group: timeGroupEnum.optional(),
}).partial();

const ReorderSchema = z.object({
  order: z.array(
    z.object({
      id: uuid,
      sort_order: z.number().int(),
    })
  ).min(0),
});

const CreateSubStepSchema = z.object({
  name: z.string().min(1, 'Namn krävs').max(200),
  icon: emoji,
});

const UpdateSubStepSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  icon: emoji,
  sort_order: z.coerce.number().int().optional(),
}).partial();

// ─── Rewards ──────────────────────────────────────────────

const CreateRewardSchema = z.object({
  name: z.string().min(1, 'Namn krävs').max(200),
  icon: z.string().max(10).optional().default('🎁'),
  star_cost: positiveInt,
  requires_approval: z.boolean().optional().default(false),
  // visible_to_children: null = all, array = specific children UUIDs
  visible_to_children: z.array(uuid).optional().nullable(),
});

const UpdateRewardSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  icon: z.string().max(10).optional(),
  star_cost: positiveInt.optional(),
  requires_approval: z.boolean().optional(),
  is_active: z.boolean().optional(),
  visible_to_children: z.array(uuid).optional().nullable(),
}).partial();

// ─── Goals / Manual Stars ─────────────────────────────────

const SetGoalSchema = z.object({
  reward_id: uuid,
});

const ManualStarsSchema = z.object({
  child_id: uuid,
  star_count: z.coerce.number().int().min(1, 'Minst 1 stjärna').max(100, 'Max 100 stjärnor'),
  reason: z.string().min(1, 'Anledning krävs').max(500),
  image_url: optionalUrl,
});

const GoalChangeRequestSchema = z.object({
  to_reward_id: uuid,
});

const ChildSetGoalSchema = z.object({
  reward_id: uuid,
});

// ─── Schedules ────────────────────────────────────────────

const CreateScheduleSchema = z.object({
  // day_of_week: 0=sunday ... 6=saturday
  day_of_week: z.coerce.number().int().min(0).max(6),
  name: z.string().max(100).optional(),
  // template_group for creating from a library template
  template_group: z.string().max(50).optional(),
});

const CreateScheduleItemSchema = z.object({
  activity_template_id: uuid,
  start_time: timeString,
  end_time: timeString,
  section: z.string().max(50).optional(),
  sort_order: z.coerce.number().int().optional(),
  // time_group for section assignment
  time_group: timeGroupEnum.optional(),
});

const UpdateScheduleItemSchema = z.object({
  activity_template_id: uuid.optional(),
  start_time: timeString,
  end_time: timeString,
  section: z.string().max(50).optional(),
  sort_order: z.coerce.number().int().optional(),
  time_group: timeGroupEnum.optional(),
}).partial();

const CopyDaySchema = z.object({
  from_day: z.coerce.number().int().min(0).max(6),
  to_days: z.array(z.coerce.number().int().min(0).max(6)).min(1),
});

const CopyToChildSchema = z.object({
  target_child_id: uuid,
});

// ─── Special Day Schedules ────────────────────────────────

const CreateSpecialDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ogiltigt datumformat'),
  name: z.string().max(100).optional(),
});

// ─── Daily Logs ───────────────────────────────────────────

const CompleteDailyLogItemSchema = z.object({
  // No required body fields — completion is triggered by route alone
  // But allow optional metadata
  note: z.string().max(500).optional(),
});

const QueryDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const QueryDateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ─── Family ───────────────────────────────────────────────

const UpdateFamilySchema = z.object({
  name: z.string().max(100).optional(),
  timezone: z.string().max(50).optional(),
  time_display_mode: z.enum(['simple', 'starttime', 'full']).optional(),
  morning_start: timeString,
  morning_end: timeString,
  day_start: timeString,
  day_end: timeString,
  evening_start: timeString,
  evening_end: timeString,
  night_start: timeString,
  night_end: timeString,
  streak_start_day: z.coerce.number().int().min(0).max(6).optional(),
  sound_enabled: z.boolean().optional(),
}).partial();

const UpdateFamilyMemberSchema = z.object({
  family_role: z.enum(['mamma', 'pappa', 'bonusförälder', 'annan']).optional().nullable(),
});

const InviteMemberSchema = z.object({
  email: email,
  child_ids: z.array(uuid).optional(),
});

const AcceptInviteSchema = z.object({
  token: z.string().min(1).max(256),
  name: z.string().min(1).max(100),
  password: z.string().min(8, 'Lösenord måste vara minst 8 tecken').max(128),
});

// ─── Account ──────────────────────────────────────────────

const UpdateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: email.optional(),
  current_password: z.string().max(128).optional(),
  new_password: z.string().min(8, 'Lösenord måste vara minst 8 tecken').max(128).optional(),
}).partial();

const UpdateNotificationPrefsSchema = z.object({
  email_enabled: z.boolean().optional(),
  reward_redemption: z.boolean().optional(),
  child_completed_all: z.boolean().optional(),
  streak_milestone: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
}).partial();

// ─── Onboarding ───────────────────────────────────────────

const OnboardingChildSchema = z.object({
  name: z.string().min(1, 'Barnets namn krävs').max(100),
  emoji: z.string().min(1).max(10),
  birthday: dateString,
  avatar_url: z.string().url().optional().or(z.literal('')).nullable(),
});

const OnboardingScheduleSchema = z.object({
  child_id: uuid,
  template_group: z.string().min(1).max(50),
});

const OnboardingRewardSchema = z.object({
  name: z.string().min(1).max(200),
  icon: z.string().max(10).optional(),
  star_cost: positiveInt,
  requires_approval: z.boolean().optional().default(false),
});

// ─── Messages ────────────────────────────────────────────

const SendMessageSchema = z.object({
  message: z.string().min(1, 'Meddelande krävs').max(1000),
  family_id: uuid.optional(),
});

// ─── Contact ─────────────────────────────────────────────

const ContactSchema = z.object({
  name: z.string().min(1).max(100),
  email: email,
  message: z.string().min(1).max(2000),
});

// ─── Feedback ────────────────────────────────────────────

const FeedbackSchema = z.object({
  type: z.enum(['bug', 'feedback']),
  title: z.string().min(3).max(100),
  message: z.string().min(10).max(2000),
});

// ─── Push notifications ───────────────────────────────────

const PushSubscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
});

// Schema for PUT /api/push/preferences — push notification preference updates.
// NOT the same as UpdateNotificationPrefsSchema (which is for email prefs).
const PushPreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  per_child: z.record(z.string(), z.boolean()).optional(),
  admin_alerts: z.boolean().optional(),
  // Notification type toggles
  schedule_reminder:  z.boolean().optional(),
  inactivity_nudge:   z.boolean().optional(),
  star_milestone:     z.boolean().optional(),
  backfill_reminder:  z.boolean().optional(),
  // Scheduling
  reminder_lead_minutes: z.coerce.number().int().min(5).max(60).optional(),
  quiet_start: z.coerce.number().int().min(0).max(23).optional(),
  quiet_end:   z.coerce.number().int().min(0).max(23).optional(),
}).partial();

// ─── Consent ─────────────────────────────────────────────

const ConsentSchema = z.object({
  type: z.string().min(1).max(50),
  accepted: z.boolean(),
});

// ─── Reminders ────────────────────────────────────────────

const CreateReminderSchema = z.object({
  child_id: uuid.optional(),
  message: z.string().min(1).max(500),
  remind_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/).optional(),
  type: z.string().max(50).optional(),
});

// ─── Schedule Templates ───────────────────────────────────

const CreateScheduleTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  template_group: z.string().max(50).optional(),
});

// ─── Ratings ─────────────────────────────────────────────

const CreateRatingSchema = z.object({
  daily_log_item_id: uuid.optional(),
  rating: z.coerce.number().int().min(1).max(5),
  note: z.string().max(500).optional(),
});

// ─── UUID param schemas ───────────────────────────────────

const UUIDParam = z.object({ id: uuid });
const ChildIdParam = z.object({ childId: uuid });
const ScheduleIdParam = z.object({ scheduleId: uuid });
const ItemIdParam = z.object({ itemId: uuid });
const LogIdParam = z.object({ logId: uuid });

module.exports = {
  // Auth
  RegisterSchema,
  LoginSchema,
  ChildLoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  ResendVerificationSchema,
  // Children
  CreateChildSchema,
  UpdateChildSchema,
  ChildPinLoginSchema,
  UpdateChildPinSchema,
  ChildViewConfigSchema,
  // Activities
  CreateActivitySchema,
  UpdateActivitySchema,
  ReorderSchema,
  CreateSubStepSchema,
  UpdateSubStepSchema,
  // Rewards
  CreateRewardSchema,
  UpdateRewardSchema,
  // Goals / Manual Stars
  SetGoalSchema,
  ManualStarsSchema,
  GoalChangeRequestSchema,
  ChildSetGoalSchema,
  // Schedules
  CreateScheduleSchema,
  CreateScheduleItemSchema,
  UpdateScheduleItemSchema,
  CopyDaySchema,
  CopyToChildSchema,
  // Special day schedules
  CreateSpecialDaySchema,
  // Daily logs
  CompleteDailyLogItemSchema,
  QueryDateSchema,
  QueryDateRangeSchema,
  // Family
  UpdateFamilySchema,
  UpdateFamilyMemberSchema,
  InviteMemberSchema,
  AcceptInviteSchema,
  // Account
  UpdateAccountSchema,
  UpdateNotificationPrefsSchema,
  // Onboarding
  OnboardingChildSchema,
  OnboardingScheduleSchema,
  OnboardingRewardSchema,
  // Messages
  SendMessageSchema,
  // Contact
  ContactSchema,
  // Feedback
  FeedbackSchema,
  // Push
  PushSubscribeSchema,
  PushPreferencesSchema,
  // Consent
  ConsentSchema,
  // Reminders
  CreateReminderSchema,
  // Schedule Templates
  CreateScheduleTemplateSchema,
  // Ratings
  CreateRatingSchema,
  // Param schemas
  UUIDParam,
  ChildIdParam,
  ScheduleIdParam,
  ItemIdParam,
  LogIdParam,
};
