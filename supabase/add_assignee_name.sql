-- Migration: Add assignee_name column to tasks
-- Run this in Supabase SQL Editor

alter table tasks
  add column if not exists assignee_name text;
