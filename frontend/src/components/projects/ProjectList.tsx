import { useState } from 'react'
import XLSX from 'xlsx-js-style'
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
    const statusColor = PROJECT_STATUS_CONFIG[status].color.replace('#', '')
    const today = new Date().toLocaleDateString('es-PE')
    const pct = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) + '%' : '0%'

    // Styles
    const border = {
      top: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
      bottom: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
      left: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
      right: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
    }
    const titleS = { font: { bold: true, sz: 18, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4338CA' } }, alignment: { horizontal: 'center' as const, vertical: 'center' as const } }
    const subtitleS = { font: { bold: true, sz: 11, color: { rgb: '6366F1' } }, fill: { fgColor: { rgb: 'EEF2FF' } }, alignment: { horizontal: 'center' as const } }
    const labelS = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '6366F1' } }, alignment: { horizontal: 'right' as const }, border }
    const valueS = { font: { sz: 10, color: { rgb: '1F2937' } }, fill: { fgColor: { rgb: 'F9FAFB' } }, border }
    const headerS = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1E293B' } }, alignment: { horizontal: 'center' as const }, border }

    const statusBgColors: Record<string, string> = {
      'Hecho': 'D1FAE5', 'En progreso': 'FEF3C7', 'Por hacer': 'DBEAFE', 'Backlog': 'F1F5F9',
    }
    const statusFontColors: Record<string, string> = {
      'Hecho': '065F46', 'En progreso': '92400E', 'Por hacer': '1E40AF', 'Backlog': '475569',
    }

    // Row 1: Title bar
    // Row 2: Subtitle
    // Row 3-6: Project info
    // Row 7: spacer
    // Row 8: Column headers
    // Row 9+: Data
    const wsData: (string | number)[][] = [
      ['', '', '', 'REPORTE DE PROYECTO', '', '', '', ''],
      ['', '', '', project.name, '', '', '', ''],
      ['', 'Proyecto', project.name, '', 'Estado', statusLabel, '', ''],
      ['', 'Descripcion', project.description || '-', '', 'Fecha', today, '', ''],
      ['', 'Total tareas', String(pTasks.length), '', 'Completadas', String(done), '', ''],
      ['', 'En progreso', String(inProg), '', 'Pendientes', String(todo + backlog), '', ''],
      ['', '', '', '', 'Avance', pct, '', ''],
      ['#', 'TAREA', 'ESTADO', 'RESPONSABLE', 'PRIORIDAD', 'IMPORTANCIA', 'FECHA LIMITE', 'DESCRIPCION'],
    ]

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
    ws['!cols'] = [
      { wch: 5 }, { wch: 42 }, { wch: 15 }, { wch: 22 },
      { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 42 },
    ]
    ws['!rows'] = [{ hpt: 32 }, { hpt: 22 }]
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },  // Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },  // Subtitle
    ]

    const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

    // Title bar (row 1) - dark indigo
    cols.forEach(c => {
      const ref = `${c}1`
      if (!ws[ref]) ws[ref] = { v: '', t: 's' }
      ws[ref].s = titleS
    })
    // Make D1 the merged title
    if (ws['A1']) ws['A1'].s = titleS

    // Subtitle (row 2) - light indigo
    cols.forEach(c => {
      const ref = `${c}2`
      if (!ws[ref]) ws[ref] = { v: '', t: 's' }
      ws[ref].s = subtitleS
    })

    // Project info section (rows 3-7)
    for (let r = 2; r <= 6; r++) {
      const rowNum = r + 1
      // Labels: B and E
      const bRef = `B${rowNum}`
      const eRef = `E${rowNum}`
      if (ws[bRef]) ws[bRef].s = labelS
      if (ws[eRef]) ws[eRef].s = labelS
      // Values: C and F
      const cRef = `C${rowNum}`
      const fRef = `F${rowNum}`
      if (ws[cRef]) ws[cRef].s = valueS
      if (ws[fRef]) ws[fRef].s = valueS
      // Empty cols get light bg
      const aRef = `A${rowNum}`
      const dRef = `D${rowNum}`
      const gRef = `G${rowNum}`
      const hRef = `H${rowNum}`
      ;[aRef, dRef, gRef, hRef].forEach(ref => {
        if (!ws[ref]) ws[ref] = { v: '', t: 's' }
        ws[ref].s = { fill: { fgColor: { rgb: 'F9FAFB' } } }
      })
    }

    // Status value with color
    const statusCell = ws['F3']
    if (statusCell) {
      statusCell.s = { ...valueS, font: { bold: true, sz: 11, color: { rgb: statusColor } } }
    }

    // Column headers (row 8)
    cols.forEach(c => {
      const ref = `${c}8`
      if (ws[ref]) ws[ref].s = headerS
    })

    // Data rows (row 9+)
    pTasks.forEach((t, i) => {
      const rowNum = 9 + i
      const statusText = STATUS_LABELS[t.status] || t.status
      const bgColor = statusBgColors[statusText] || 'FFFFFF'
      const fontColor = statusFontColors[statusText] || '1F2937'
      const isEven = i % 2 === 0

      cols.forEach(c => {
        const ref = `${c}${rowNum}`
        if (!ws[ref]) ws[ref] = { v: '', t: 's' }
        ws[ref].s = {
          font: { sz: 10, color: { rgb: '374151' } },
          fill: { fgColor: { rgb: isEven ? 'FFFFFF' : 'F9FAFB' } },
          border,
          alignment: c === 'A' ? { horizontal: 'center' as const } : { wrapText: true },
        }
      })

      // Status cell with colored badge-style
      const statusRef = `C${rowNum}`
      if (ws[statusRef]) {
        ws[statusRef].s = {
          font: { bold: true, sz: 10, color: { rgb: fontColor } },
          fill: { fgColor: { rgb: bgColor } },
          border,
          alignment: { horizontal: 'center' as const },
        }
      }

      // Urgente in red bold
      if (t.priority === 'urgent') {
        const ref = `E${rowNum}`
        if (ws[ref]) {
          ws[ref].s = {
            font: { bold: true, sz: 10, color: { rgb: 'DC2626' } },
            fill: { fgColor: { rgb: 'FEF2F2' } },
            border,
            alignment: { horizontal: 'center' as const },
          }
        }
      }

      // Importante in amber
      if (t.importance === 'important') {
        const ref = `F${rowNum}`
        if (ws[ref]) {
          ws[ref].s = {
            font: { bold: true, sz: 10, color: { rgb: 'A16207' } },
            fill: { fgColor: { rgb: isEven ? 'FFFFFF' : 'F9FAFB' } },
            border,
            alignment: { horizontal: 'center' as const },
          }
        }
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
