import { useState, useEffect, useCallback } from 'react'
import { tasksApi, projectsApi } from '../lib/api'
import { useWorkspace } from '../context/WorkspaceContext'
import type { Task, TaskStatus, Project } from '../types'
import './DashboardPage.css'

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'Por hacer' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'done', label: 'Hecho' },
]

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  backlog: { bg: '#f1f5f9', color: '#475569' },
  todo: { bg: '#dbeafe', color: '#1e40af' },
  in_progress: { bg: '#fef3c7', color: '#92400e' },
  done: { bg: '#d1fae5', color: '#065f46' },
}

interface OverdueTask extends Task {
  daysOverdue: number
}

export default function DashboardPage() {
  const { workspace } = useWorkspace()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([tasksApi.list(workspace), projectsApi.list(workspace)])
      setTasks(t)
      setProjects(p)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }, [workspace])

  useEffect(() => { setLoading(true); loadData() }, [loadData])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const overdueTasks: OverdueTask[] = tasks
    .filter(t => {
      if (t.status === 'done' || !t.due_date) return false
      const due = new Date(t.due_date)
      due.setHours(0, 0, 0, 0)
      return due.getTime() < today.getTime()
    })
    .map(t => {
      const due = new Date(t.due_date!)
      due.setHours(0, 0, 0, 0)
      const daysOverdue = Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
      return { ...t, daysOverdue }
    })
    .sort((a, b) => {
      // Sort by priority first (urgent first), then by days overdue
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1
      if (a.priority !== 'urgent' && b.priority === 'urgent') return 1
      if (a.importance === 'important' && b.importance !== 'important') return -1
      if (a.importance !== 'important' && b.importance === 'important') return 1
      return b.daysOverdue - a.daysOverdue
    })

  const dueTodayTasks = tasks.filter(t => {
    if (t.status === 'done' || !t.due_date) return false
    const due = new Date(t.due_date)
    due.setHours(0, 0, 0, 0)
    return due.getTime() === today.getTime()
  })

  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const doneTasks = tasks.filter(t => t.status === 'done')

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setSaving(taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    try {
      const task = tasks.find(t => t.id === taskId)
      await tasksApi.updateStatus(taskId, newStatus, task?.position || 0)
    } catch {
      loadData()
    } finally {
      setSaving(null)
    }
  }

  const handleDescriptionUpdate = async (taskId: string, description: string) => {
    setSaving(taskId)
    try {
      await tasksApi.update(taskId, { description })
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, description } : t))
    } catch {
      loadData()
    } finally {
      setSaving(null)
    }
  }

  const getProjectName = (projectId: string) =>
    projects.find(p => p.id === projectId)?.name || ''

  const getProjectColor = (projectId: string) =>
    projects.find(p => p.id === projectId)?.color || '#94a3b8'

  if (loading) return <p>Cargando dashboard...</p>

  return (
    <div className="dashboard-page">
      <h2>Dashboard</h2>

      {/* Summary cards */}
      <div className="dashboard-summary">
        <div className="summary-card summary-overdue">
          <span className="summary-number">{overdueTasks.length}</span>
          <span className="summary-label">Atrasadas</span>
        </div>
        <div className="summary-card summary-today">
          <span className="summary-number">{dueTodayTasks.length}</span>
          <span className="summary-label">Vencen hoy</span>
        </div>
        <div className="summary-card summary-progress">
          <span className="summary-number">{inProgressTasks.length}</span>
          <span className="summary-label">En progreso</span>
        </div>
        <div className="summary-card summary-done">
          <span className="summary-number">{doneTasks.length}</span>
          <span className="summary-label">Completadas</span>
        </div>
      </div>

      {/* Overdue tasks table */}
      <div className="dashboard-section">
        <h3 className="section-title section-overdue">
          Tareas atrasadas
          <span className="section-count">{overdueTasks.length}</span>
        </h3>

        {overdueTasks.length === 0 ? (
          <div className="dashboard-empty card">
            <p>No hay tareas atrasadas. Todo al dia.</p>
          </div>
        ) : (
          <div className="dashboard-table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th className="th-days">Atraso</th>
                  <th className="th-priority">Prior.</th>
                  <th className="th-task">Tarea</th>
                  <th className="th-project">Proyecto</th>
                  <th className="th-assignee">Responsable</th>
                  <th className="th-due">Fecha limite</th>
                  <th className="th-status">Estado</th>
                  <th className="th-notes">Avance / Notas</th>
                </tr>
              </thead>
              <tbody>
                {overdueTasks.map((task, i) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    index={i}
                    projectName={getProjectName(task.project_id)}
                    projectColor={getProjectColor(task.project_id)}
                    saving={saving === task.id}
                    onStatusChange={handleStatusChange}
                    onDescriptionUpdate={handleDescriptionUpdate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Due today */}
      {dueTodayTasks.length > 0 && (
        <div className="dashboard-section">
          <h3 className="section-title section-today">
            Vencen hoy
            <span className="section-count">{dueTodayTasks.length}</span>
          </h3>
          <div className="dashboard-table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th className="th-priority">Prior.</th>
                  <th className="th-task">Tarea</th>
                  <th className="th-project">Proyecto</th>
                  <th className="th-assignee">Responsable</th>
                  <th className="th-status">Estado</th>
                  <th className="th-notes">Avance / Notas</th>
                </tr>
              </thead>
              <tbody>
                {dueTodayTasks.map((task, i) => (
                  <TaskRow
                    key={task.id}
                    task={{ ...task, daysOverdue: 0 } as OverdueTask}
                    index={i}
                    projectName={getProjectName(task.project_id)}
                    projectColor={getProjectColor(task.project_id)}
                    saving={saving === task.id}
                    onStatusChange={handleStatusChange}
                    onDescriptionUpdate={handleDescriptionUpdate}
                    hideDays
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function TaskRow({ task, index, projectName, projectColor, saving, onStatusChange, onDescriptionUpdate, hideDays }: {
  task: OverdueTask
  index: number
  projectName: string
  projectColor: string
  saving: boolean
  onStatusChange: (id: string, status: TaskStatus) => void
  onDescriptionUpdate: (id: string, desc: string) => void
  hideDays?: boolean
}) {
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(task.description || '')

  const saveNotes = () => {
    setEditingNotes(false)
    if (notes !== (task.description || '')) {
      onDescriptionUpdate(task.id, notes)
    }
  }

  const urgencyClass = task.priority === 'urgent' ? 'row-urgent' : ''
  const importanceClass = task.importance === 'important' ? 'row-important' : ''

  return (
    <tr className={`${index % 2 === 0 ? '' : 'row-alt'} ${urgencyClass} ${saving ? 'row-saving' : ''}`}>
      {!hideDays && (
        <td className="td-days">
          <span className={`days-badge ${task.daysOverdue > 7 ? 'days-critical' : task.daysOverdue > 3 ? 'days-warning' : 'days-mild'}`}>
            {task.daysOverdue}d
          </span>
        </td>
      )}
      <td className="td-priority">
        {task.priority === 'urgent' && <span className="priority-urgent">!</span>}
        {task.importance === 'important' && <span className={`priority-important ${importanceClass}`}>*</span>}
      </td>
      <td className="td-task-name">{task.title}</td>
      <td className="td-project">
        <span className="project-pill" style={{ background: projectColor + '20', color: projectColor }}>
          {projectName}
        </span>
      </td>
      <td className="td-assignee">{task.assignee_name || '-'}</td>
      {!hideDays && (
        <td className="td-due">{task.due_date ? new Date(task.due_date).toLocaleDateString('es-PE') : '-'}</td>
      )}
      <td className="td-status">
        <select
          className="status-select"
          value={task.status}
          onChange={e => onStatusChange(task.id, e.target.value as TaskStatus)}
          style={{ background: STATUS_COLORS[task.status]?.bg, color: STATUS_COLORS[task.status]?.color }}
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </td>
      <td className="td-notes">
        {editingNotes ? (
          <textarea
            className="notes-input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={saveNotes}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNotes() } }}
            autoFocus
            rows={2}
          />
        ) : (
          <span className="notes-text" onClick={() => setEditingNotes(true)}>
            {task.description || 'Click para agregar notas...'}
          </span>
        )}
      </td>
    </tr>
  )
}
