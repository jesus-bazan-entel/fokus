-- Migration: Add notification schedule columns to projects
-- Run this in Supabase SQL Editor

alter table projects add column if not exists notify_enabled boolean default false;
alter table projects add column if not exists notify_time text default '08:00';
alter table projects add column if not exists notify_days text[] default '{1,2,3,4,5}';
