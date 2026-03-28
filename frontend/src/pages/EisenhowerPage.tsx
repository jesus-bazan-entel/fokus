import { useState, useEffect, useCallback } from 'react'
import EisenhowerMatrix from '../components/eisenhower/EisenhowerMatrix'
import TaskDialog from '../components/TaskDialog'
import { tasksApi, projectsApi } from '../lib/api'
import type { Task, Project } from '../types'

export default function EisenhowerPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([tasksApi.list(), projectsApi.list()])
      setTasks(t)
      setProjects(p)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

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

  if (loading) return <p>Cargando matriz...</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Matriz de Eisenhower</h2>
        <button className="btn btn-primary" onClick={() => { setSelectedTask(null); setShowDialog(true) }}>
          + Nueva tarea
        </button>
      </div>
      <EisenhowerMatrix tasks={tasks} onTaskClick={(task) => { setSelectedTask(task); setShowDialog(true) }} />
      {showDialog && (
        <TaskDialog
          task={selectedTask}
          projects={projects}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => { setShowDialog(false); setSelectedTask(null) }}
        />
      )}
    </div>
  )
}
