import { useState, useEffect } from 'react'
import type { Task, TaskStatus, TaskPriority, TaskImportance, Project } from '../types'
import './TaskDialog.css'

interface Props {
  task?: Task | null
  projects: Project[]
  defaultStatus?: TaskStatus
  onSave: (data: Partial<Task>) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

export default function TaskDialog({ task, projects, defaultStatus, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [status, setStatus] = useState<TaskStatus>(task?.status || defaultStatus || 'todo')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'not_urgent')
  const [importance, setImportance] = useState<TaskImportance>(task?.importance || 'not_important')
  const [projectId, setProjectId] = useState(task?.project_id || projects[0]?.id || '')
  const [dueDate, setDueDate] = useState(task?.due_date?.split('T')[0] || '')

  useEffect(() => {
    if (!projectId && projects.length > 0) {
      setProjectId(projects[0].id)
    }
  }, [projects, projectId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...(task?.id ? { id: task.id } : {}),
      title,
      description,
      status,
      priority,
      importance,
      project_id: projectId,
      due_date: dueDate || undefined,
    })
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog card" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{task ? 'Editar tarea' : 'Nueva tarea'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="dialog-form">
          <div className="form-group">
            <label>Titulo</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Nombre de la tarea" />
          </div>
          <div className="form-group">
            <label>Descripcion</label>
            <textarea className="input" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalles opcionales..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Proyecto</label>
              <select className="input" value={projectId} onChange={e => setProjectId(e.target.value)} required>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
                <option value="backlog">Backlog</option>
                <option value="todo">Por hacer</option>
                <option value="in_progress">En progreso</option>
                <option value="done">Hecho</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Prioridad</label>
              <select className="input" value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
                <option value="urgent">Urgente</option>
                <option value="not_urgent">No urgente</option>
              </select>
            </div>
            <div className="form-group">
              <label>Importancia</label>
              <select className="input" value={importance} onChange={e => setImportance(e.target.value as TaskImportance)}>
                <option value="important">Importante</option>
                <option value="not_important">No importante</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Fecha limite</label>
            <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="dialog-actions">
            {task && onDelete && (
              <button type="button" className="btn btn-danger" onClick={() => onDelete(task.id)}>Eliminar</button>
            )}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{task ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
