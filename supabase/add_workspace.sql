-- Migration: Add workspace column to projects
-- Run this in Supabase SQL Editor if you already have the projects table

alter table projects
  add column if not exists workspace text not null default 'corporate'
  check (workspace in ('personal', 'corporate'));

-- Set all existing projects to 'corporate' (already done by default)
-- update projects set workspace = 'corporate' where workspace is null;

-- Add index for workspace queries
create index if not exists idx_projects_workspace on projects(workspace);
