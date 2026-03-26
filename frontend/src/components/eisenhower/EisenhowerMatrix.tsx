import type { Task } from '../../types'
import { getQuadrant } from '../../types'
import './EisenhowerMatrix.css'

const QUADRANTS = [
  { id: 'do_first', title: 'Hacer primero', subtitle: 'Urgente + Importante', color: '#ef4444', bg: '#fef2f2' },
  { id: 'schedule', title: 'Programar', subtitle: 'No urgente + Importante', color: '#3b82f6', bg: '#eff6ff' },
  { id: 'delegate', title: 'Delegar', subtitle: 'Urgente + No importante', color: '#f59e0b', bg: '#fffbeb' },
  { id: 'eliminate', title: 'Eliminar', subtitle: 'No urgente + No importante', color: '#94a3b8', bg: '#f8fafc' },
] as const

interface Props {
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

export default function EisenhowerMatrix({ tasks, onTaskClick }: Props) {
  const activeTasks = tasks.filter(t => t.status !== 'done')

  const getQuadrantTasks = (quadrantId: string) =>
    activeTasks.filter(t => getQuadrant(t) === quadrantId)

  return (
    <div className="eisenhower-grid">
      <div className="axis-label axis-y-top">Importante</div>
      <div className="axis-label axis-y-bottom">No importante</div>
      <div className="axis-label axis-x-left">Urgente</div>
      <div className="axis-label axis-x-right">No urgente</div>
      {QUADRANTS.map(q => {
        const qTasks = getQuadrantTasks(q.id)
        return (
          <div key={q.id} className="quadrant" style={{ background: q.bg }}>
            <div className="quadrant-header">
              <span className="quadrant-dot" style={{ background: q.color }} />
              <h3 style={{ color: q.color }}>{q.title}</h3>
              <span className="quadrant-count">{qTasks.length}</span>
            </div>
            <p className="quadrant-subtitle">{q.subtitle}</p>
            <div className="quadrant-tasks">
              {qTasks.map(task => (
                <div key={task.id} className="quadrant-task card" onClick={() => onTaskClick(task)}>
                  <p className="task-title">{task.title}</p>
                  {task.project && (
                    <span className="task-project-badge" style={{ background: task.project.color + '20', color: task.project.color }}>
                      {task.project.name}
                    </span>
                  )}
                </div>
              ))}
              {qTasks.length === 0 && (
                <p className="quadrant-empty">Sin tareas</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
