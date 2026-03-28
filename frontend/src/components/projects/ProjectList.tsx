import { useState } from 'react'
import type { Project, Task, ProjectStatus } from '../../types'
import { computeProjectStatus, PROJECT_STATUS_CONFIG } from '../../types'
import ImportExcel from '../ImportExcel'
import GanttChart from './GanttChart'
import './ProjectList.css'

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']

interface Props {
  projects: Project[]
  tasks: Task[]
  onSave: (data: Partial<Project>) => void
  onDelete: (id: string) => void
  onImportComplete: () => void
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const config = PROJECT_STATUS_CONFIG[status]
  return (
    <span className="project-status-badge" style={{ background: config.bg, color: config.color }}>
      <span className="status-dot" style={{ background: config.color }} />
      {config.label}
    </span>
  )
}

function ProgressBar({ tasks }: { tasks: Task[] }) {
  const total = tasks.length
  if (total === 0) return null
  const done = tasks.filter(t => t.status === 'done').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const pctDone = (done / total) * 100
  const pctInProgress = (inProgress / total) * 100

  return (
    <div className="project-progress">
      <div className="progress-bar">
        <div className="progress-done" style={{ width: `${pctDone}%` }} />
        <div className="progress-in-progress" style={{ width: `${pctInProgress}%` }} />
      </div>
      <span className="progress-text">{done}/{total} completadas</span>
    </div>
  )
}

export default function ProjectList({ projects, tasks, onSave, onDelete, onImportComplete }: Props) {
  const [editing, setEditing] = useState<Project | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [ganttProject, setGanttProject] = useState<Project | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])

  const openNew = () => {
    setEditing(null)
    setName('')
    setDescription('')
    setColor(COLORS[0])
    setShowForm(true)
  }

  const openEdit = (p: Project) => {
    setEditing(p)
    setName(p.name)
    setDescription(p.description)
    setColor(p.color)
    setShowForm(true)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ ...(editing ? { id: editing.id } : {}), name, description, color })
    setShowForm(false)
  }

  const getProjectTasks = (projectId: string) => tasks.filter(t => t.project_id === projectId)

  return (
    <div>
      <div className="projects-header">
        <h2>Proyectos</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <ImportExcel onImportComplete={onImportComplete} />
          <button className="btn btn-primary" onClick={openNew}>+ Nuevo proyecto</button>
        </div>
      </div>

      {showForm && (
        <div className="dialog-overlay" onClick={() => setShowForm(false)}>
          <div className="dialog card" onClick={e => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>{editing ? 'Editar proyecto' : 'Nuevo proyecto'}</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave} className="dialog-form">
              <div className="form-group">
                <label>Nombre</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} required placeholder="Nombre del proyecto" />
              </div>
              <div className="form-group">
                <label>Descripcion</label>
                <textarea className="input" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripcion breve..." />
              </div>
              <div className="form-group">
                <label>Color</label>
                <div className="color-picker">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`color-swatch ${c === color ? 'active' : ''}`}
                      style={{ background: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>
              <div className="dialog-actions">
                <div style={{ flex: 1 }} />
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Guardar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="projects-grid">
        {projects.map(p => {
          const pTasks = getProjectTasks(p.id)
          const computedStatus = computeProjectStatus(pTasks)
          return (
            <div key={p.id} className="project-card card">
              <div className="project-color-bar" style={{ background: p.color }} />
              <div className="project-card-body">
                <div className="project-card-top">
                  <h3>{p.name}</h3>
                  <StatusBadge status={computedStatus} />
                </div>
                <p className="project-desc">{p.description}</p>
                <ProgressBar tasks={pTasks} />
                <div className="project-actions">
                  <button className="btn btn-gantt btn-sm" onClick={() => setGanttProject(p)}>Gantt</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => onDelete(p.id)}>Eliminar</button>
                </div>
              </div>
            </div>
          )
        })}
        {projects.length === 0 && (
          <p className="empty-message">No hay proyectos. Crea uno para empezar.</p>
        )}
      </div>

      {ganttProject && (
        <GanttChart
          projectName={ganttProject.name}
          projectColor={ganttProject.color}
          tasks={getProjectTasks(ganttProject.id)}
          onClose={() => setGanttProject(null)}
        />
      )}
    </div>
  )
}
