-- ============================================================
-- IK COIN — Supabase SQL Schema (Full)
-- Supabase Dashboard → SQL Editor mein yeh run karo
-- ============================================================

-- USERS
create table if not exists users (
  id               bigserial primary key,
  name             text not null,
  email            text unique not null,
  phone            text,
  wallet_cc        float8 default 0,
  wallet_addr      text,
  referral_code    text unique,
  ref_earned       float8 default 0,
  referred_by      text references users(email),
  avatar_url       text,
  surprise_claimed boolean default false,
  status           text default 'active', -- active | suspended | banned
  created_at       timestamptz default now()
);

-- OTPs
create table if not exists otps (
  email       text primary key,
  code        text not null,
  expires_at  timestamptz not null,
  created_at  timestamptz default now()
);

-- TRANSACTIONS
create table if not exists transactions (
  id          bigserial primary key,
  email       text references users(email),
  type        text not null,
  cc          float8 default 0,
  usd         float8 default 0,
  fee         float8 default 0,
  method      text default 'Binance',
  extra       text,
  created_at  timestamptz default now()
);

-- REFERRALS
create table if not exists referrals (
  id              bigserial primary key,
  referrer_email  text references users(email),
  referred_email  text references users(email),
  join_bonus      float8 default 50,
  has_bought      boolean default false,
  total_earned    float8 default 0,
  created_at      timestamptz default now()
);

-- SETTINGS
create table if not exists settings (
  key    text primary key,
  value  text not null
);

insert into settings (key, value) values
  ('price',      '0.01'),
  ('supply',     '500000000'),
  ('holders',    '12450'),
  ('network',    'BNB Smart Chain'),
  ('fee',        '0.5'),
  ('refSellPct', '10'),
  ('binanceId',  '123456789')
on conflict (key) do nothing;

-- SURPRISE CLAIMS
create table if not exists surprise_claims (
  id          bigserial primary key,
  email       text references users(email),
  name        text,
  phone       text,
  created_at  timestamptz default now()
);

-- ── NEW TABLES ────────────────────────────────────────────────────────────

-- DEPOSIT REQUESTS
create table if not exists deposit_requests (
  id          bigserial primary key,
  email       text references users(email),
  amount_usd  float8 not null,
  txid        text not null,
  status      text default 'pending', -- pending | approved | rejected
  cc_credited float8 default 0,
  note        text,
  created_at  timestamptz default now()
);

-- WITHDRAWAL REQUESTS
create table if not exists withdrawal_requests (
  id           bigserial primary key,
  email        text references users(email),
  amount_cc    float8 not null,
  amount_usd   float8 not null,
  binance_id   text not null,
  status       text default 'pending', -- pending | approved | rejected
  note         text,
  created_at   timestamptz default now()
);

-- SUPPORT TICKETS
create table if not exists support_tickets (
  id          bigserial primary key,
  email       text references users(email),
  subject     text not null,
  message     text not null,
  status      text default 'open',  -- open | replied | closed
  created_at  timestamptz default now()
);

-- TICKET REPLIES
create table if not exists ticket_replies (
  id          bigserial primary key,
  ticket_id   bigint references support_tickets(id),
  sender      text not null,  -- 'user' | 'admin'
  message     text not null,
  created_at  timestamptz default now()
);

-- NOTIFICATIONS
create table if not exists notifications (
  id          bigserial primary key,
  email       text references users(email),
  title       text not null,
  body        text not null,
  type        text default 'info', -- info | success | warning | error
  is_read     boolean default false,
  created_at  timestamptz default now()
);

-- ADMIN ACTIVITY LOGS
create table if not exists admin_logs (
  id          bigserial primary key,
  action      text not null,
  detail      text,
  created_at  timestamptz default now()
);

-- RLS disable
alter table users               disable row level security;
alter table otps                disable row level security;
alter table transactions        disable row level security;
alter table referrals           disable row level security;
alter table settings            disable row level security;
alter table surprise_claims     disable row level security;
alter table deposit_requests    disable row level security;
alter table withdrawal_requests disable row level security;
alter table support_tickets     disable row level security;
alter table ticket_replies      disable row level security;
alter table notifications       disable row level security;
alter table admin_logs          disable row level security;

-- Helper function
create or replace function increment_earned(ref_email text, ref_referrer text, amount float8)
returns float8 language sql as $$
  update referrals
  set total_earned = total_earned + amount
  where referrer_email = ref_referrer and referred_email = ref_email
  returning total_earned;
$$;
