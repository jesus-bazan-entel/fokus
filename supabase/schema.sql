-- =============================================
-- Fokus Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Projects table
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text default '',
  color text default '#6366f1',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tasks table
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text default '',
  status text not null default 'todo' check (status in ('backlog', 'todo', 'in_progress', 'done')),
  priority text not null default 'not_urgent' check (priority in ('urgent', 'not_urgent')),
  importance text not null default 'not_important' check (importance in ('important', 'not_important')),
  project_id uuid not null references projects(id) on delete cascade,
  assignee_id uuid references auth.users(id) on delete set null,
  position integer not null default 0,
  due_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_projects_owner on projects(owner_id);
create index if not exists idx_tasks_project on tasks(project_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_assignee on tasks(assignee_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

-- Row Level Security (RLS)
alter table projects enable row level security;
alter table tasks enable row level security;

-- Projects: users can only see/modify their own projects
create policy "Users can view own projects"
  on projects for select using (auth.uid() = owner_id);

create policy "Users can create projects"
  on projects for insert with check (auth.uid() = owner_id);

create policy "Users can update own projects"
  on projects for update using (auth.uid() = owner_id);

create policy "Users can delete own projects"
  on projects for delete using (auth.uid() = owner_id);

-- Tasks: users can see/modify tasks in their projects
create policy "Users can view tasks in own projects"
  on tasks for select using (
    project_id in (select id from projects where owner_id = auth.uid())
  );

create policy "Users can create tasks in own projects"
  on tasks for insert with check (
    project_id in (select id from projects where owner_id = auth.uid())
  );

create policy "Users can update tasks in own projects"
  on tasks for update using (
    project_id in (select id from projects where owner_id = auth.uid())
  );

create policy "Users can delete tasks in own projects"
  on tasks for delete using (
    project_id in (select id from projects where owner_id = auth.uid())
  );
