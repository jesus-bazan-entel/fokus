import { useMemo } from 'react'
import type { Task } from '../../types'
import './GanttChart.css'

interface Props {
  projectName: string
  projectColor: string
  tasks: Task[]
  onClose: () => void
}

const STATUS_COLORS: Record<string, string> = {
  done: '#22c55e',
  in_progress: '#f59e0b',
  todo: '#3b82f6',
  backlog: '#94a3b8',
}

const STATUS_LABELS: Record<string, string> = {
  done: 'Hecho',
  in_progress: 'En progreso',
  todo: 'Por hacer',
  backlog: 'Backlog',
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDate(date: Date): string {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${date.getDate()} ${months[date.getMonth()]}`
}

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export default function GanttChart({ projectName, projectColor, tasks, onClose }: Props) {
  const { ganttTasks, startDate, endDate, totalDays, weeks } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Build gantt tasks with start/end dates
    const ganttTasks = tasks
      .filter(t => t.due_date || t.created_at)
      .map(t => {
        const created = new Date(t.created_at)
        created.setHours(0, 0, 0, 0)
        const due = t.due_date ? new Date(t.due_date) : addDays(created, 7)
        due.setHours(0, 0, 0, 0)
        // Task start is created_at, end is due_date
        const start = created < due ? created : addDays(due, -3)
        return { ...t, ganttStart: start, ganttEnd: due }
      })
      .sort((a, b) => a.ganttStart.getTime() - b.ganttStart.getTime())

    if (ganttTasks.length === 0) {
      return { ganttTasks: [], startDate: today, endDate: addDays(today, 30), totalDays: 30, weeks: [] }
    }

    // Calculate timeline bounds with padding
    let minDate = ganttTasks.reduce((min, t) => t.ganttStart < min ? t.ganttStart : min, ganttTasks[0].ganttStart)
    let maxDate = ganttTasks.reduce((max, t) => t.ganttEnd > max ? t.ganttEnd : max, ganttTasks[0].ganttEnd)

    // Add padding
    minDate = addDays(minDate, -3)
    maxDate = addDays(maxDate, 5)

    const totalDays = Math.max(daysBetween(minDate, maxDate), 14)

    // Generate week markers
    const weeks: { date: Date; left: number }[] = []
    const current = new Date(minDate)
    // Start from next Monday
    current.setDate(current.getDate() + ((8 - current.getDay()) % 7))
    while (current <= maxDate) {
      const left = (daysBetween(minDate, current) / totalDays) * 100
      weeks.push({ date: new Date(current), left })
      current.setDate(current.getDate() + 7)
    }

    return { ganttTasks, startDate: minDate, endDate: maxDate, totalDays, weeks }
  }, [tasks])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayLeft = (daysBetween(startDate, today) / totalDays) * 100

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="gantt-dialog card" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <div className="gantt-title">
            <span className="gantt-dot" style={{ background: projectColor }} />
            <h2>Gantt - {projectName}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {ganttTasks.length === 0 ? (
          <div className="gantt-empty">
            <p>No hay tareas con fechas para mostrar el diagrama.</p>
          </div>
        ) : (
          <div className="gantt-container">
            {/* Legend */}
            <div className="gantt-legend">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <span key={key} className="gantt-legend-item">
                  <span className="gantt-legend-dot" style={{ background: STATUS_COLORS[key] }} />
                  {label}
                </span>
              ))}
            </div>

            {/* Timeline header */}
            <div className="gantt-timeline">
              <div className="gantt-labels-header">Tarea</div>
              <div className="gantt-bars-header">
                {weeks.map((w, i) => (
                  <div key={i} className="gantt-week-marker" style={{ left: `${w.left}%` }}>
                    {formatDate(w.date)}
                  </div>
                ))}
                {todayLeft >= 0 && todayLeft <= 100 && (
                  <div className="gantt-today-marker" style={{ left: `${todayLeft}%` }}>
                    <span className="gantt-today-label">Hoy</span>
                  </div>
                )}
              </div>
            </div>

            {/* Rows */}
            <div className="gantt-body">
              {ganttTasks.map((task, i) => {
                const left = (daysBetween(startDate, task.ganttStart) / totalDays) * 100
                const width = Math.max((daysBetween(task.ganttStart, task.ganttEnd) / totalDays) * 100, 2)
                const barColor = STATUS_COLORS[task.status] || '#94a3b8'
                const isOverdue = task.status !== 'done' && task.ganttEnd < today

                return (
                  <div key={task.id} className={`gantt-row ${i % 2 === 0 ? 'even' : ''}`}>
                    <div className="gantt-label" title={task.title}>
                      <span className="gantt-task-name">{task.title}</span>
                      <span className="gantt-task-date">
                        {task.due_date ? formatDate(new Date(task.due_date)) : ''}
                      </span>
                    </div>
                    <div className="gantt-bar-area">
                      {/* Week grid lines */}
                      {weeks.map((w, j) => (
                        <div key={j} className="gantt-grid-line" style={{ left: `${w.left}%` }} />
                      ))}
                      {/* Today line */}
                      {todayLeft >= 0 && todayLeft <= 100 && (
                        <div className="gantt-today-line" style={{ left: `${todayLeft}%` }} />
                      )}
                      {/* Task bar */}
                      <div
                        className={`gantt-bar ${task.status === 'done' ? 'bar-done' : ''} ${isOverdue ? 'bar-overdue' : ''}`}
                        style={{
                          left: `${Math.max(left, 0)}%`,
                          width: `${Math.min(width, 100 - Math.max(left, 0))}%`,
                          background: task.status === 'done'
                            ? `repeating-linear-gradient(45deg, ${barColor}, ${barColor} 4px, ${barColor}cc 4px, ${barColor}cc 8px)`
                            : barColor,
                        }}
                        title={`${task.title} | ${STATUS_LABELS[task.status]}`}
                      >
                        {width > 8 && (
                          <span className="gantt-bar-label">{task.title}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Summary */}
            <div className="gantt-summary">
              <span>{tasks.filter(t => t.status === 'done').length}/{tasks.length} completadas</span>
              <span>
                {formatDate(ganttTasks[0]?.ganttStart || startDate)} — {formatDate(ganttTasks[ganttTasks.length - 1]?.ganttEnd || endDate)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
