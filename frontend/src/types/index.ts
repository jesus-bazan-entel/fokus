export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
}

export interface Project {
  id: string
  name: string
  description: string
  color: string
  owner_id: string
  created_at: string
  updated_at: string
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'urgent' | 'not_urgent'
export type TaskImportance = 'important' | 'not_important'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  importance: TaskImportance
  project_id: string
  assignee_id?: string
  position: number
  due_date?: string
  created_at: string
  updated_at: string
  project?: Project
  assignee?: User
}

export type EisenhowerQuadrant = 'do_first' | 'schedule' | 'delegate' | 'eliminate'

export function getQuadrant(task: Task): EisenhowerQuadrant {
  if (task.importance === 'important' && task.priority === 'urgent') return 'do_first'
  if (task.importance === 'important' && task.priority === 'not_urgent') return 'schedule'
  if (task.importance === 'not_important' && task.priority === 'urgent') return 'delegate'
  return 'eliminate'
}
