import { useState, useRef, useEffect } from 'react'
import type { Task, TaskStatus, TaskPriority, TaskImportance } from '../../types'
import { tasksApi } from '../../lib/api'
import './TaskTable.css'

interface Props {
  projectName: string
  projectColor: string
  tasks: Task[]
  onClose: () => void
  onDataChange: () => void
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'Por hacer' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'done', label: 'Hecho' },
]

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'urgent', label: 'Urgente' },
  { value: 'not_urgent', label: 'No urgente' },
]

const IMPORTANCE_OPTIONS: { value: TaskImportance; label: string }[] = [
  { value: 'important', label: 'Importante' },
  { value: 'not_important', label: 'No importante' },
]

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  backlog: { bg: '#f1f5f9', color: '#475569' },
  todo: { bg: '#dbeafe', color: '#1e40af' },
  in_progress: { bg: '#fef3c7', color: '#92400e' },
  done: { bg: '#d1fae5', color: '#065f46' },
}

type EditableField = 'title' | 'status' | 'assignee_name' | 'priority' | 'importance' | 'due_date' | 'description'

interface EditingCell {
  taskId: string
  field: EditableField
}

function EditableText({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [text, setText] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])

  const save = () => { if (text !== value) onSave(text) }

  return (
    <input
      ref={ref}
      className="cell-input"
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onSave(value) }}
    />
  )
}

function EditableSelect({ value, options, onSave }: { value: string; options: { value: string; label: string }[]; onSave: (v: string) => void }) {
  const ref = useRef<HTMLSelectElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  return (
    <select
      ref={ref}
      className="cell-select"
      value={value}
      onChange={e => onSave(e.target.value)}
      onBlur={() => onSave(value)}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export default function TaskTable({ projectName, projectColor, tasks, onClose, onDataChange }: Props) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [localTasks, setLocalTasks] = useState(tasks)

  useEffect(() => { setLocalTasks(tasks) }, [tasks])

  const handleSave = async (taskId: string, field: EditableField, value: string) => {
    setEditingCell(null)
    const task = localTasks.find(t => t.id === taskId)
    if (!task) return

    const currentValue = String(task[field] || '')
    if (value === currentValue) return

    // Optimistic update
    setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: value || undefined } : t))
    setSaving(taskId)

    try {
      if (field === 'status') {
        await tasksApi.updateStatus(taskId, value as TaskStatus, task.position)
      } else {
        await tasksApi.update(taskId, { [field]: value || undefined })
      }
      onDataChange()
    } catch (err) {
      console.error('Error saving:', err)
      setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: currentValue || undefined } : t))
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm('Eliminar esta tarea?')) return
    setLocalTasks(prev => prev.filter(t => t.id !== taskId))
    try {
      await tasksApi.delete(taskId)
      onDataChange()
    } catch (err) {
      console.error('Error deleting:', err)
      setLocalTasks(tasks)
    }
  }

  const startEdit = (taskId: string, field: EditableField) => {
    setEditingCell({ taskId, field })
  }

  const isEditing = (taskId: string, field: EditableField) =>
    editingCell?.taskId === taskId && editingCell?.field === field

  const renderCell = (task: Task, field: EditableField) => {
    if (isEditing(task.id, field)) {
      const value = String(task[field] || '')
      switch (field) {
        case 'status':
          return <EditableSelect value={value} options={STATUS_OPTIONS} onSave={v => handleSave(task.id, field, v)} />
        case 'priority':
          return <EditableSelect value={value} options={PRIORITY_OPTIONS} onSave={v => handleSave(task.id, field, v)} />
        case 'importance':
          return <EditableSelect value={value} options={IMPORTANCE_OPTIONS} onSave={v => handleSave(task.id, field, v)} />
        case 'due_date':
          return (
            <input
              type="date"
              className="cell-input"
              defaultValue={task.due_date?.split('T')[0] || ''}
              autoFocus
              onChange={e => handleSave(task.id, field, e.target.value)}
              onBlur={() => setEditingCell(null)}
            />
          )
        default:
          return <EditableText value={value} onSave={v => handleSave(task.id, field, v)} />
      }
    }

    // Display mode
    const value = task[field]
    switch (field) {
      case 'status': {
        const colors = STATUS_COLORS[task.status] || STATUS_COLORS.backlog
        const label = STATUS_OPTIONS.find(o => o.value === task.status)?.label || task.status
        return (
          <span className="cell-badge" style={{ background: colors.bg, color: colors.color }} onClick={() => startEdit(task.id, field)}>
            {label}
          </span>
        )
      }
      case 'priority':
        return (
          <span
            className={`cell-badge ${task.priority === 'urgent' ? 'badge-urgent' : 'badge-normal'}`}
            onClick={() => startEdit(task.id, field)}
          >
            {task.priority === 'urgent' ? 'Urgente' : 'No urgente'}
          </span>
        )
      case 'importance':
        return (
          <span
            className={`cell-badge ${task.importance === 'important' ? 'badge-important' : 'badge-normal'}`}
            onClick={() => startEdit(task.id, field)}
          >
            {task.importance === 'important' ? 'Importante' : 'No importante'}
          </span>
        )
      case 'due_date':
        return (
          <span className="cell-clickable" onClick={() => startEdit(task.id, field)}>
            {task.due_date ? new Date(task.due_date).toLocaleDateString('es-PE') : '-'}
          </span>
        )
      default:
        return (
          <span className="cell-clickable" onClick={() => startEdit(task.id, field)}>
            {String(value || '') || '-'}
          </span>
        )
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="table-dialog card" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <div className="gantt-title">
            <span className="gantt-dot" style={{ background: projectColor }} />
            <h2>{projectName}</h2>
            <span className="table-task-count">{localTasks.length} tareas</span>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="table-container">
          <table className="task-table">
            <thead>
              <tr>
                <th className="th-num">#</th>
                <th className="th-title">Tarea</th>
                <th className="th-status">Estado</th>
                <th className="th-assignee">Responsable</th>
                <th className="th-priority">Prioridad</th>
                <th className="th-importance">Importancia</th>
                <th className="th-date">Fecha Limite</th>
                <th className="th-desc">Descripcion</th>
                <th className="th-actions"></th>
              </tr>
            </thead>
            <tbody>
              {localTasks.map((task, i) => (
                <tr key={task.id} className={`${saving === task.id ? 'row-saving' : ''} ${i % 2 === 0 ? '' : 'row-alt'}`}>
                  <td className="td-num">{i + 1}</td>
                  <td className="td-title">{renderCell(task, 'title')}</td>
                  <td className="td-status">{renderCell(task, 'status')}</td>
                  <td className="td-assignee">{renderCell(task, 'assignee_name')}</td>
                  <td className="td-priority">{renderCell(task, 'priority')}</td>
                  <td className="td-importance">{renderCell(task, 'importance')}</td>
                  <td className="td-date">{renderCell(task, 'due_date')}</td>
                  <td className="td-desc">{renderCell(task, 'description')}</td>
                  <td className="td-actions">
                    <button className="row-delete-btn" onClick={() => handleDelete(task.id)} title="Eliminar">&times;</button>
                  </td>
                </tr>
              ))}
              {localTasks.length === 0 && (
                <tr><td colSpan={9} className="table-empty">Sin tareas en este proyecto</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span>Click en cualquier celda para editar. Los cambios se guardan automaticamente.</span>
        </div>
      </div>
    </div>
  )
}
