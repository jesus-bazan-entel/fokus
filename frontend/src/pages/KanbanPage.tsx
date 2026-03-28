import { useState, useEffect, useCallback } from 'react'
import KanbanBoard from '../components/kanban/KanbanBoard'
import TaskDialog from '../components/TaskDialog'
import AlertPanel from '../components/AlertPanel'
import { tasksApi, projectsApi } from '../lib/api'
import { getTaskAlerts } from '../types'
import { useWorkspace } from '../context/WorkspaceContext'
import type { Task, TaskStatus, Project } from '../types'

export default function KanbanPage() {
  const { workspace } = useWorkspace()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo')
  const [loading, setLoading] = useState(true)

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

  const alerts = getTaskAlerts(tasks)

  const handleTaskMove = async (taskId: string, status: TaskStatus, position: number) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status, position } : t))
    try {
      await tasksApi.updateStatus(taskId, status, position)
    } catch {
      loadData()
    }
  }

  const handleSave = async (data: Partial<Task>) => {
    try {
      if (data.id) {
        await tasksApi.update(data.id, data)
      } else {
        await tasksApi.create(data)
      }
      await loadData()
      setShowDialog(false)
      setSelectedTask(null)
    } catch (err) {
      console.error('Error saving task:', err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await tasksApi.delete(id)
      await loadData()
      setShowDialog(false)
      setSelectedTask(null)
    } catch (err) {
      console.error('Error deleting task:', err)
    }
  }

  const handleAddTask = (status: TaskStatus) => {
    setSelectedTask(null)
    setDefaultStatus(status)
    setShowDialog(true)
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setShowDialog(true)
  }

  const handleAlertClick = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) handleTaskClick(task)
  }

  if (loading) return <p>Cargando tablero...</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Tablero Kanban</h2>
      </div>
      {alerts.length > 0 && <AlertPanel alerts={alerts} onTaskClick={handleAlertClick} />}
      <KanbanBoard tasks={tasks} onTaskMove={handleTaskMove} onTaskClick={handleTaskClick} onAddTask={handleAddTask} />
      {showDialog && (
        <TaskDialog
          task={selectedTask}
          projects={projects}
          defaultStatus={defaultStatus}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => { setShowDialog(false); setSelectedTask(null) }}
        />
      )}
    </div>
  )
}
