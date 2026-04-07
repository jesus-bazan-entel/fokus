import { useState } from 'react'
import * as XLSX from 'xlsx'
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
  const done = tasks.filter(t => t.status === 'done').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const pctDone = total > 0 ? (done / total) * 100 : 0
  const pctInProgress = total > 0 ? (inProgress / total) * 100 : 0

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

  const STATUS_LABELS: Record<string, string> = {
    backlog: 'Backlog', todo: 'Por hacer', in_progress: 'En progreso', done: 'Hecho',
  }

  const exportProjectToExcel = (project: Project) => {
    const pTasks = getProjectTasks(project.id)
    const done = pTasks.filter(t => t.status === 'done').length
    const inProg = pTasks.filter(t => t.status === 'in_progress').length
    const todo = pTasks.filter(t => t.status === 'todo').length
    const backlog = pTasks.filter(t => t.status === 'backlog').length
    const status = computeProjectStatus(pTasks)
    const statusLabel = PROJECT_STATUS_CONFIG[status].label
    const today = new Date().toLocaleDateString('es-PE')

    // Build worksheet data with header section
    const wsData: (string | number)[][] = [
      ['REPORTE DE PROYECTO'],
      [],
      ['Proyecto:', project.name, '', 'Estado:', statusLabel],
      ['Descripcion:', project.description || '-', '', 'Fecha reporte:', today],
      ['Total tareas:', pTasks.length, '', 'Completadas:', done],
      ['En progreso:', inProg, '', 'Por hacer:', todo + backlog],
      [],
      ['#', 'TAREA', 'ESTADO', 'RESPONSABLE', 'PRIORIDAD', 'IMPORTANCIA', 'FECHA LIMITE', 'DESCRIPCION'],
    ]

    // Data rows
    pTasks.forEach((t, i) => {
      wsData.push([
        i + 1,
        t.title,
        STATUS_LABELS[t.status] || t.status,
        t.assignee_name || '',
        t.priority === 'urgent' ? 'Urgente' : 'No urgente',
        t.importance === 'important' ? 'Importante' : 'No importante',
        t.due_date ? new Date(t.due_date).toLocaleDateString('es-PE') : '',
        t.description || '',
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Column widths
    ws['!cols'] = [
      { wch: 4 }, { wch: 40 }, { wch: 14 }, { wch: 22 },
      { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 40 },
    ]

    // Merge title row
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    ]

    // Cell styles (xlsx community edition supports basic styling)
    const headerRow = 7 // 0-indexed row for column headers
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4F46E5' } },
      alignment: { horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } },
      },
    }

    const titleStyle = {
      font: { bold: true, sz: 16, color: { rgb: '4F46E5' } },
      alignment: { horizontal: 'center' },
    }

    const labelStyle = {
      font: { bold: true, color: { rgb: '374151' } },
      fill: { fgColor: { rgb: 'F3F4F6' } },
    }

    // Apply title style
    if (ws['A1']) ws['A1'].s = titleStyle

    // Apply header row styles
    const headerCols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    headerCols.forEach(col => {
      const cell = ws[`${col}${headerRow + 1}`]
      if (cell) cell.s = headerStyle
    })

    // Apply label styles for project info
    const labelCells = ['A3', 'A4', 'A5', 'A6', 'D3', 'D4', 'D5', 'D6']
    labelCells.forEach(ref => {
      if (ws[ref]) ws[ref].s = labelStyle
    })

    // Apply status-based coloring to data rows
    const statusColors: Record<string, string> = {
      'Hecho': 'DCFCE7',
      'En progreso': 'FEF9C3',
      'Por hacer': 'DBEAFE',
      'Backlog': 'F1F5F9',
    }

    pTasks.forEach((t, i) => {
      const rowNum = headerRow + 2 + i
      const statusText = STATUS_LABELS[t.status] || t.status
      const bgColor = statusColors[statusText] || 'FFFFFF'
      headerCols.forEach(col => {
        const cell = ws[`${col}${rowNum}`]
        if (cell) {
          cell.s = {
            fill: { fgColor: { rgb: bgColor } },
            border: {
              top: { style: 'thin', color: { rgb: 'E5E7EB' } },
              bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
              left: { style: 'thin', color: { rgb: 'E5E7EB' } },
              right: { style: 'thin', color: { rgb: 'E5E7EB' } },
            },
            alignment: col === 'A' ? { horizontal: 'center' } : undefined,
          }
        }
      })
      // Bold urgent tasks
      if (t.priority === 'urgent') {
        const cellE = ws[`E${rowNum}`]
        if (cellE) cellE.s = { ...cellE.s, font: { bold: true, color: { rgb: 'DC2626' } } }
      }
    })

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, project.name.slice(0, 31))
    XLSX.writeFile(wb, `${project.name.replace(/\s+/g, '-').toLowerCase()}-reporte.xlsx`)
  }

  return (
    <div>
      <div className="projects-header">
        <h2>Proyectos</h2>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo proyecto</button>
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
            {!editing && (
              <div className="import-section">
                <div className="import-section-divider">
                  <span>o importa tareas desde un archivo</span>
                </div>
                <ImportExcel onImportComplete={() => { setShowForm(false); onImportComplete() }} defaultProjectName={name || undefined} />
              </div>
            )}
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
                  <button className="btn btn-export btn-sm" onClick={() => exportProjectToExcel(p)}>Exportar</button>
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
