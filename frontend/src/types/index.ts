export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
}

export type ProjectStatus = 'on_track' | 'at_risk' | 'delayed' | 'on_hold'

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

// Alert utilities
export type AlertLevel = 'overdue' | 'due_today' | 'due_soon'

export interface TaskAlert {
  task: Task
  level: AlertLevel
  daysRemaining: number
}

export function getTaskAlerts(tasks: Task[], dueSoonDays = 3): TaskAlert[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const alerts: TaskAlert[] = []
  for (const task of tasks) {
    if (task.status === 'done' || !task.due_date) continue

    const due = new Date(task.due_date)
    due.setHours(0, 0, 0, 0)
    const diffMs = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      alerts.push({ task, level: 'overdue', daysRemaining: diffDays })
    } else if (diffDays === 0) {
      alerts.push({ task, level: 'due_today', daysRemaining: 0 })
    } else if (diffDays <= dueSoonDays) {
      alerts.push({ task, level: 'due_soon', daysRemaining: diffDays })
    }
  }

  // Sort: overdue first, then due_today, then due_soon
  alerts.sort((a, b) => a.daysRemaining - b.daysRemaining)
  return alerts
}

export function computeProjectStatus(tasks: Task[]): ProjectStatus {
  const activeTasks = tasks.filter(t => t.status !== 'done')
  if (activeTasks.length === 0) return 'on_track'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let overdue = 0
  let total = 0
  let hasDueDates = false

  for (const task of activeTasks) {
    total++
    if (task.due_date) {
      hasDueDates = true
      const due = new Date(task.due_date)
      due.setHours(0, 0, 0, 0)
      if (due.getTime() < today.getTime()) overdue++
    }
  }

  if (!hasDueDates) return 'on_track'

  // If all active tasks have no progress, consider on_hold
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  if (inProgress === 0 && total > 0 && tasks.filter(t => t.status === 'done').length === 0) {
    return 'on_hold'
  }

  if (overdue > 0) {
    // More than half overdue = delayed, otherwise at_risk
    return overdue / total > 0.5 ? 'delayed' : 'at_risk'
  }

  return 'on_track'
}

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string; icon: string }> = {
  on_track: { label: 'A tiempo', color: '#22c55e', bg: '#f0fdf4', icon: '●' },
  at_risk: { label: 'En riesgo', color: '#f59e0b', bg: '#fffbeb', icon: '●' },
  delayed: { label: 'Retrasado', color: '#ef4444', bg: '#fef2f2', icon: '●' },
  on_hold: { label: 'En pausa', color: '#94a3b8', bg: '#f8fafc', icon: '●' },
}
