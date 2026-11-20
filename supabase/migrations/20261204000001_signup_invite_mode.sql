-- Signup modes: 'paused' = closed (waitlist only, personal invite links still work),
-- 'invite' = invite code required, 'open' = everyone. Separate file: a new enum value must be
-- committed before other statements can rely on it.
alter type public.signup_mode add value if not exists 'invite' before 'paused';
