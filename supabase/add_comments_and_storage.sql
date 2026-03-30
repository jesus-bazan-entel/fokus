-- Migration: Add task_comments table and storage bucket
-- Run this in Supabase SQL Editor

-- Task comments / activity log
create table if not exists task_comments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  content text default '',
  file_url text,
  file_name text,
  file_type text,
  created_at timestamptz default now()
);

create index if not exists idx_task_comments_task on task_comments(task_id);

-- RLS for task_comments
alter table task_comments enable row level security;

create policy "Users can view comments on tasks in own projects"
  on task_comments for select using (
    task_id in (
      select t.id from tasks t
      join projects p on t.project_id = p.id
      where p.owner_id = auth.uid()
    )
  );

create policy "Users can create comments on tasks in own projects"
  on task_comments for insert with check (
    task_id in (
      select t.id from tasks t
      join projects p on t.project_id = p.id
      where p.owner_id = auth.uid()
    )
  );

create policy "Users can delete comments on tasks in own projects"
  on task_comments for delete using (
    task_id in (
      select t.id from tasks t
      join projects p on t.project_id = p.id
      where p.owner_id = auth.uid()
    )
  );

-- Storage bucket for task files
-- NOTE: Run this separately in Supabase Dashboard > Storage > New Bucket
-- Bucket name: task-files
-- Public: Yes (so files can be viewed via URL)
--
-- Or run via SQL:
insert into storage.buckets (id, name, public)
values ('task-files', 'task-files', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Users can upload task files"
  on storage.objects for insert
  with check (bucket_id = 'task-files' and auth.role() = 'authenticated');

create policy "Anyone can view task files"
  on storage.objects for select
  using (bucket_id = 'task-files');

create policy "Users can delete own task files"
  on storage.objects for delete
  using (bucket_id = 'task-files' and auth.role() = 'authenticated');
