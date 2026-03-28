import { useState, useEffect, useCallback } from 'react'
import ProjectList from '../components/projects/ProjectList'
import { projectsApi, tasksApi } from '../lib/api'
import type { Project, Task } from '../types'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([projectsApi.list(), tasksApi.list()])
      setProjects(p)
      setTasks(t)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async (data: Partial<Project>) => {
    try {
      if (data.id) {
        await projectsApi.update(data.id, data)
      } else {
        await projectsApi.create(data)
      }
      await loadData()
    } catch (err) {
      console.error('Error saving project:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este proyecto y todas sus tareas?')) return
    try {
      await projectsApi.delete(id)
      await loadData()
    } catch (err) {
      console.error('Error deleting project:', err)
    }
  }

  if (loading) return <p>Cargando proyectos...</p>

  return <ProjectList projects={projects} tasks={tasks} onSave={handleSave} onDelete={handleDelete} onImportComplete={loadData} />
}
