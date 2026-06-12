import { useState, useEffect, useCallback } from 'react'
import { tasksApi, projectsApi } from '../lib/api'
import { useWorkspace } from '../context/WorkspaceContext'
import TaskDialog from '../components/TaskDialog'
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showDialog, setShowDialog] = useState(false)

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

  // Group overdue tasks by project
  const groupByProject = (taskList: OverdueTask[]) => {
    const map = new Map<string, { name: string; color: string; tasks: OverdueTask[] }>()
    for (const t of taskList) {
      const pid = t.project_id
      if (!map.has(pid)) {
        map.set(pid, {
          name: getProjectName(pid),
          color: getProjectColor(pid),
          tasks: [],
        })
      }
      map.get(pid)!.tasks.push(t)
    }
    // Sort groups by most overdue task
    return Array.from(map.values()).sort((a, b) => {
      const maxA = Math.max(...a.tasks.map(t => t.daysOverdue))
      const maxB = Math.max(...b.tasks.map(t => t.daysOverdue))
      return maxB - maxA
    })
  }

  const overdueGroups = groupByProject(overdueTasks)
  const dueTodayGroups = groupByProject(dueTodayTasks.map(t => ({ ...t, daysOverdue: 0 })))

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setShowDialog(true)
  }

  const handleSaveTask = async (data: Partial<Task>) => {
    try {
      if (data.id) {
        await tasksApi.update(data.id, data)
      }
      await loadData()
      setShowDialog(false)
      setSelectedTask(null)
    } catch (err) {
      console.error('Error saving task:', err)
    }
  }

  const handleDeleteTask = async (id: string) => {
    try {
      await tasksApi.delete(id)
      await loadData()
      setShowDialog(false)
      setSelectedTask(null)
    } catch (err) {
      console.error('Error deleting task:', err)
    }
  }

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
          overdueGroups.map(group => {
            const groupKey = `overdue-${group.name}`
            const isCollapsed = collapsedGroups.has(groupKey)
            return (
              <div key={groupKey} className="dashboard-project-group">
                <button className="dashboard-group-header" onClick={() => toggleGroup(groupKey)}>
                  <span className="dashboard-group-dot" style={{ background: group.color }} />
                  <span className="dashboard-group-name">{group.name}</span>
                  <span className="dashboard-group-count">{group.tasks.length}</span>
                  <span className="dashboard-group-toggle">{isCollapsed ? '+' : '−'}</span>
                </button>
                {!isCollapsed && (
                  <div className="dashboard-table-container">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th className="th-days">Atraso</th>
                          <th className="th-priority">Prior.</th>
                          <th className="th-task">Tarea</th>
                          <th className="th-assignee">Responsable</th>
                          <th className="th-due">Fecha limite</th>
                          <th className="th-status">Estado</th>
                          <th className="th-notes">Avance / Notas</th>
                          <th className="th-edit"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.tasks.map((task, i) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            index={i}
                            saving={saving === task.id}
                            onStatusChange={handleStatusChange}
                            onDescriptionUpdate={handleDescriptionUpdate}
                            onEdit={handleEditTask}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Due today */}
      {dueTodayTasks.length > 0 && (
        <div className="dashboard-section">
          <h3 className="section-title section-today">
            Vencen hoy
            <span className="section-count">{dueTodayTasks.length}</span>
          </h3>
          {dueTodayGroups.map(group => {
            const groupKey = `today-${group.name}`
            const isCollapsed = collapsedGroups.has(groupKey)
            return (
              <div key={groupKey} className="dashboard-project-group">
                <button className="dashboard-group-header" onClick={() => toggleGroup(groupKey)}>
                  <span className="dashboard-group-dot" style={{ background: group.color }} />
                  <span className="dashboard-group-name">{group.name}</span>
                  <span className="dashboard-group-count">{group.tasks.length}</span>
                  <span className="dashboard-group-toggle">{isCollapsed ? '+' : '−'}</span>
                </button>
                {!isCollapsed && (
                  <div className="dashboard-table-container">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th className="th-priority">Prior.</th>
                          <th className="th-task">Tarea</th>
                          <th className="th-assignee">Responsable</th>
                          <th className="th-status">Estado</th>
                          <th className="th-notes">Avance / Notas</th>
                          <th className="th-edit"></th>
                </tr>
              </thead>
              <tbody>
                {dueTodayTasks.map((task, i) => (
                  <TaskRow
                    key={task.id}
                    task={{ ...task, daysOverdue: 0 } as OverdueTask}
                    index={i}
                    saving={saving === task.id}
                    onStatusChange={handleStatusChange}
                    onDescriptionUpdate={handleDescriptionUpdate}
                    onEdit={handleEditTask}
                    hideDays
                  />
                ))}
              </tbody>
            </table>
          </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {showDialog && selectedTask && (
        <TaskDialog
          task={selectedTask}
          projects={projects}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onClose={() => { setShowDialog(false); setSelectedTask(null) }}
        />
      )}
    </div>
  )
}

function TaskRow({ task, index, saving, onStatusChange, onDescriptionUpdate, onEdit, hideDays }: {
  task: OverdueTask
  index: number
  saving: boolean
  onStatusChange: (id: string, status: TaskStatus) => void
  onDescriptionUpdate: (id: string, desc: string) => void
  onEdit: (task: Task) => void
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
      <td className="td-edit">
        <button className="edit-row-btn" onClick={() => onEdit(task)} title="Editar tarea">&#9998;</button>
      </td>
    </tr>
  )
}
