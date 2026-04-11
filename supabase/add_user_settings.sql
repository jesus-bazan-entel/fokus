-- Migration: Add user_settings table
-- Run this in Supabase SQL Editor

create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  due_soon_days integer not null default 3,
  notify_email boolean not null default true,
  notify_whatsapp boolean not null default false,
  notify_overdue boolean not null default true,
  notify_due_today boolean not null default true,
  notify_due_soon boolean not null default true,
  updated_at timestamptz default now()
);

-- RLS
alter table user_settings enable row level security;

create policy "Users can view own settings"
  on user_settings for select using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on user_settings for insert with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on user_settings for update using (auth.uid() = user_id);
