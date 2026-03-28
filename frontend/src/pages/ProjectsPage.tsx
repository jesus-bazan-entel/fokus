import { useState, useEffect, useCallback } from 'react'
import ProjectList from '../components/projects/ProjectList'
import { projectsApi } from '../lib/api'
import type { Project } from '../types'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const loadProjects = useCallback(async () => {
    try {
      const data = await projectsApi.list()
      setProjects(data)
    } catch (err) {
      console.error('Error loading projects:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  const handleSave = async (data: Partial<Project>) => {
    try {
      if (data.id) {
        await projectsApi.update(data.id, data)
      } else {
        await projectsApi.create(data)
      }
      await loadProjects()
    } catch (err) {
      console.error('Error saving project:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este proyecto y todas sus tareas?')) return
    try {
      await projectsApi.delete(id)
      await loadProjects()
    } catch (err) {
      console.error('Error deleting project:', err)
    }
  }

  if (loading) return <p>Cargando proyectos...</p>

  return <ProjectList projects={projects} onSave={handleSave} onDelete={handleDelete} onImportComplete={loadProjects} />
}
