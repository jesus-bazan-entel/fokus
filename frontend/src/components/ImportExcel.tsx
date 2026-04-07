import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { projectsApi, tasksApi } from '../lib/api'
import type { TaskStatus } from '../types'
import { useWorkspace } from '../context/WorkspaceContext'
import './ImportExcel.css'

interface ExcelRow {
  tarea: string
  proyecto: string
  estado: string
  responsable: string
  eta: string
  acciones: string
}

const STATUS_MAP: Record<string, TaskStatus> = {
  'completado': 'done',
  'completo': 'done',
  'hecho': 'done',
  'done': 'done',
  'en proceso': 'in_progress',
  'en progreso': 'in_progress',
  'en validacion': 'in_progress',
  'en validación': 'in_progress',
  'in_progress': 'in_progress',
  'pendiente': 'todo',
  'por hacer': 'todo',
  'todo': 'todo',
  'backlog': 'backlog',
}

const PROJECT_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']

function parseStatus(raw: string): TaskStatus {
  const normalized = raw.trim().toLowerCase()
  return STATUS_MAP[normalized] || 'todo'
}

function parseDate(raw: unknown): string | undefined {
  if (raw == null || raw === '') return undefined

  // JS Date object (from XLSX cellDates: true)
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return undefined
    const y = raw.getFullYear()
    const m = String(raw.getMonth() + 1).padStart(2, '0')
    const d = String(raw.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Excel serial date number
  if (typeof raw === 'number') {
    if (raw < 1 || raw > 200000) return undefined
    const utcDays = raw - 25569
    const date = new Date(utcDays * 86400 * 1000)
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const d = String(date.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const str = String(raw).trim()
  if (!str) return undefined

  // String that looks like a serial number (e.g. "46106")
  if (/^\d{4,6}$/.test(str)) {
    const serial = parseInt(str, 10)
    if (serial > 1 && serial < 200000) {
      const utcDays = serial - 25569
      const date = new Date(utcDays * 86400 * 1000)
      const y = date.getUTCFullYear()
      const m = String(date.getUTCMonth() + 1).padStart(2, '0')
      const d = String(date.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }

  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

  // DD/MM/YYYY or D/M/YYYY (most common in Spanish)
  const dmy = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  }

  // MM/DD/YYYY (US format fallback)
  const mdy = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/)
  if (mdy) {
    const year = parseInt(mdy[3], 10) + 2000
    return `${year}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`
  }

  // Formats like "25 Mar 2026", "Mar 25, 2026", "2026/03/25", etc.
  const d = new Date(str)
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear()
    if (y > 1990 && y < 2100) {
      const mo = String(d.getMonth() + 1).padStart(2, '0')
      const da = String(d.getDate()).padStart(2, '0')
      return `${y}-${mo}-${da}`
    }
  }

  return undefined
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
}

interface Props {
  onImportComplete: () => void
}

export default function ImportExcel({ onImportComplete }: Props) {
  const { workspace } = useWorkspace()
  const [showModal, setShowModal] = useState(false)
  const [rows, setRows] = useState<ExcelRow[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        // Use raw: true so dates come as Date objects (cellDates) or numbers
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

        if (jsonData.length === 0) {
          setError('El archivo esta vacio')
          return
        }

        // Map headers to our fields
        const headerMap: Record<string, string> = {}
        const firstRow = jsonData[0]
        for (const key of Object.keys(firstRow)) {
          const norm = normalizeHeader(key)
          if (norm.includes('tarea') || norm === 'task' || norm === 'titulo' || norm === 'title') headerMap[key] = 'tarea'
          else if (norm.includes('proyecto') || norm === 'project') headerMap[key] = 'proyecto'
          else if (norm.includes('estado') || norm === 'status') headerMap[key] = 'estado'
          else if (norm.includes('responsable') || norm === 'assignee' || norm === 'owner') headerMap[key] = 'responsable'
          else if (norm === 'eta' || norm.includes('fecha') || norm === 'date' || norm === 'due_date') headerMap[key] = 'eta'
          else if (norm.includes('accion') || norm.includes('descripcion') || norm === 'description' || norm === 'notas') headerMap[key] = 'acciones'
        }

        const parsed: ExcelRow[] = []
        let lastTarea = ''
        let lastProyecto = ''

        for (const row of jsonData) {
          const mapped: Record<string, string> = {}
          for (const [origKey, field] of Object.entries(headerMap)) {
            mapped[field] = String(row[origKey] ?? '').trim()
          }

          // Inherit task name and project from previous row if empty (subtasks)
          const tarea = mapped.tarea || lastTarea
          const proyecto = mapped.proyecto || lastProyecto
          if (mapped.tarea) lastTarea = mapped.tarea
          if (mapped.proyecto) lastProyecto = mapped.proyecto

          // Skip completely empty rows
          if (!tarea && !mapped.estado) continue

          // Get the raw ETA value (Date object, number, or string)
          const etaKey = Object.keys(headerMap).find(k => headerMap[k] === 'eta')
          const rawEta = etaKey ? row[etaKey] : undefined
          const parsedDate = parseDate(rawEta)

          parsed.push({
            tarea,
            proyecto: proyecto || 'Sin proyecto',
            estado: mapped.estado || 'Pendiente',
            responsable: mapped.responsable || '',
            eta: parsedDate || '',
            acciones: mapped.acciones || '',
          })
        }

        setRows(parsed)
        setShowModal(true)
      } catch {
        setError('Error al leer el archivo. Asegurate de que sea un archivo Excel valido (.xlsx)')
      }
    }
    reader.readAsArrayBuffer(file)
    // Reset input
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleImport = async () => {
    setImporting(true)
    setError('')

    try {
      // 1. Collect unique project names
      const projectNames = [...new Set(rows.map(r => r.proyecto).filter(Boolean))]
      setProgress(`Creando ${projectNames.length} proyecto(s)...`)

      // 2. Get existing projects in current workspace
      const existingProjects = await projectsApi.list(workspace)
      const projectMap = new Map(existingProjects.map(p => [p.name.toLowerCase(), p]))

      // 3. Create missing projects in current workspace
      for (let i = 0; i < projectNames.length; i++) {
        const name = projectNames[i]
        if (!projectMap.has(name.toLowerCase())) {
          const color = PROJECT_COLORS[i % PROJECT_COLORS.length]
          const created = await projectsApi.create({ name, description: '', color, workspace })
          projectMap.set(name.toLowerCase(), created)
        }
      }

      // 4. Load existing tasks to detect duplicates
      setProgress('Verificando duplicados...')
      const existingTasks = await tasksApi.list(workspace)
      const existingSet = new Set(
        existingTasks.map(t => `${t.title.toLowerCase().trim()}::${t.project_id}`)
      )

      // 5. Create tasks (skip duplicates)
      let created = 0
      let skipped = 0
      let errors = 0
      for (const row of rows) {
        const project = projectMap.get(row.proyecto.toLowerCase())
        if (!project) continue

        // Duplicate check: same title + same project
        const key = `${row.tarea.toLowerCase().trim()}::${project.id}`
        if (existingSet.has(key)) {
          skipped++
          setProgress(`Procesando... ${created + skipped + errors}/${rows.length} (${skipped} duplicadas)`)
          continue
        }

        const status = parseStatus(row.estado)
        const dueDate = row.eta || undefined

        const description = [
          row.responsable ? `Responsable: ${row.responsable}` : '',
          row.acciones || '',
        ].filter(Boolean).join('\n')

        try {
          await tasksApi.create({
            title: row.tarea,
            description,
            status,
            priority: 'not_urgent',
            importance: 'important',
            project_id: project.id,
            due_date: dueDate || undefined,
          })
          created++
          existingSet.add(key) // Prevent duplicates within same import
        } catch (taskErr) {
          console.error(`Error creando tarea "${row.tarea}":`, taskErr)
          errors++
        }
        setProgress(`Procesando... ${created + skipped + errors}/${rows.length} (${skipped} duplicadas)`)
      }

      const parts = [`${created} creada(s)`]
      if (skipped > 0) parts.push(`${skipped} duplicada(s) omitida(s)`)
      if (errors > 0) parts.push(`${errors} con error`)
      setProgress(`Listo! ${parts.join(', ')}.`)
      setTimeout(() => {
        setShowModal(false)
        setRows([])
        setProgress('')
        onImportComplete()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar')
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const sampleRows = [
      { TAREA: 'Disenar landing page', PROYECTO: 'Mi Proyecto', ESTADO: 'Por hacer', RESPONSABLE: 'Juan Perez', ETA: '15/04/2026', ACCIONES: 'Crear mockup en Figma' },
      { TAREA: 'Configurar base de datos', PROYECTO: 'Mi Proyecto', ESTADO: 'En proceso', RESPONSABLE: 'Maria Lopez', ETA: '10/04/2026', ACCIONES: 'Definir schema PostgreSQL' },
      { TAREA: 'Pruebas unitarias', PROYECTO: 'Mi Proyecto', ESTADO: 'Pendiente', RESPONSABLE: 'Carlos Ruiz', ETA: '20/04/2026', ACCIONES: 'Cubrir endpoints principales' },
      { TAREA: 'Deploy a produccion', PROYECTO: 'Otro Proyecto', ESTADO: 'Pendiente', RESPONSABLE: 'Ana Torres', ETA: '25/04/2026', ACCIONES: 'Verificar variables de entorno' },
      { TAREA: 'Revision de seguridad', PROYECTO: 'Otro Proyecto', ESTADO: 'Completado', RESPONSABLE: 'Pedro Diaz', ETA: '05/04/2026', ACCIONES: 'Audit OWASP top 10' },
    ]

    const ws = XLSX.utils.json_to_sheet(sampleRows)
    ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 35 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
    XLSX.writeFile(wb, 'fokus-plantilla-importacion.xlsx')
  }

  return (
    <>
      <label className="btn btn-secondary import-btn">
        Importar Excel
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
      </label>

      {showModal && (
        <div className="dialog-overlay" onClick={() => !importing && setShowModal(false)}>
          <div className="dialog card import-dialog" onClick={e => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>Importar desde Excel</h2>
              <button className="close-btn" onClick={() => !importing && setShowModal(false)}>&times;</button>
            </div>

            <div className="import-summary">
              <p><strong>{rows.length}</strong> tareas encontradas en <strong>{new Set(rows.map(r => r.proyecto)).size}</strong> proyecto(s)</p>
              <button className="template-link" onClick={downloadTemplate}>
                Descargar plantilla de ejemplo
              </button>
            </div>

            <div className="import-preview">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Tarea</th>
                    <th>Proyecto</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td className="cell-task">{row.tarea}</td>
                      <td><span className="preview-project">{row.proyecto}</span></td>
                      <td><span className={`preview-status status-${parseStatus(row.estado)}`}>{row.estado}</span></td>
                      <td className="cell-date">{row.eta || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && <div className="login-error">{error}</div>}
            {progress && <div className="import-progress">{progress}</div>}

            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={importing}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                {importing ? 'Importando...' : `Importar ${rows.length} tareas`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
