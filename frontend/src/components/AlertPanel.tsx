import type { TaskAlert } from '../types'
import './AlertPanel.css'

interface Props {
  alerts: TaskAlert[]
  onTaskClick: (taskId: string) => void
}

const LEVEL_CONFIG = {
  overdue: { label: 'Vencida', color: '#ef4444', bg: '#fef2f2', icon: '!' },
  due_today: { label: 'Vence hoy', color: '#f59e0b', bg: '#fffbeb', icon: '!' },
  due_soon: { label: 'Por vencer', color: '#3b82f6', bg: '#eff6ff', icon: 'i' },
}

function formatDays(days: number): string {
  if (days < 0) {
    const abs = Math.abs(days)
    return abs === 1 ? 'hace 1 dia' : `hace ${abs} dias`
  }
  if (days === 0) return 'hoy'
  return days === 1 ? 'manana' : `en ${days} dias`
}

export default function AlertPanel({ alerts, onTaskClick }: Props) {
  if (alerts.length === 0) return null

  const overdue = alerts.filter(a => a.level === 'overdue')
  const dueToday = alerts.filter(a => a.level === 'due_today')
  const dueSoon = alerts.filter(a => a.level === 'due_soon')

  return (
    <div className="alert-panel">
      <div className="alert-panel-header">
        <span className="alert-bell">&#9888;</span>
        <h3>Alertas ({alerts.length})</h3>
      </div>
      <div className="alert-list">
        {overdue.length > 0 && (
          <div className="alert-group">
            <div className="alert-group-title" style={{ color: LEVEL_CONFIG.overdue.color }}>
              Vencidas ({overdue.length})
            </div>
            {overdue.map(a => (
              <AlertItem key={a.task.id} alert={a} onClick={() => onTaskClick(a.task.id)} />
            ))}
          </div>
        )}
        {dueToday.length > 0 && (
          <div className="alert-group">
            <div className="alert-group-title" style={{ color: LEVEL_CONFIG.due_today.color }}>
              Vencen hoy ({dueToday.length})
            </div>
            {dueToday.map(a => (
              <AlertItem key={a.task.id} alert={a} onClick={() => onTaskClick(a.task.id)} />
            ))}
          </div>
        )}
        {dueSoon.length > 0 && (
          <div className="alert-group">
            <div className="alert-group-title" style={{ color: LEVEL_CONFIG.due_soon.color }}>
              Por vencer ({dueSoon.length})
            </div>
            {dueSoon.map(a => (
              <AlertItem key={a.task.id} alert={a} onClick={() => onTaskClick(a.task.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AlertItem({ alert, onClick }: { alert: TaskAlert; onClick: () => void }) {
  const config = LEVEL_CONFIG[alert.level]
  return (
    <div className="alert-item" onClick={onClick} style={{ borderLeftColor: config.color }}>
      <div className="alert-item-icon" style={{ background: config.bg, color: config.color }}>
        {config.icon}
      </div>
      <div className="alert-item-content">
        <p className="alert-item-title">{alert.task.title}</p>
        <div className="alert-item-meta">
          {alert.task.project && (
            <span className="task-project-badge" style={{ background: alert.task.project.color + '20', color: alert.task.project.color }}>
              {alert.task.project.name}
            </span>
          )}
          <span className="alert-item-date" style={{ color: config.color }}>
            {formatDays(alert.daysRemaining)}
          </span>
        </div>
      </div>
      <span className="alert-badge" style={{ background: config.bg, color: config.color }}>
        {config.label}
      </span>
    </div>
  )
}
