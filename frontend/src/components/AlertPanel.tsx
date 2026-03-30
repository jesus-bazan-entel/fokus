import { useState } from 'react'
import type { TaskAlert } from '../types'
import './AlertPanel.css'

interface Props {
  alerts: TaskAlert[]
  onTaskClick: (taskId: string) => void
}

const LEVEL_CONFIG = {
  overdue: { label: 'Vencida', groupLabel: 'Vencidas', color: '#ef4444', bg: '#fef2f2', icon: '!' },
  due_today: { label: 'Vence hoy', groupLabel: 'Vencen hoy', color: '#f59e0b', bg: '#fffbeb', icon: '!' },
  due_soon: { label: 'Por vencer', groupLabel: 'Por vencer', color: '#3b82f6', bg: '#eff6ff', icon: 'i' },
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
  const [panelOpen, setPanelOpen] = useState(false)

  if (alerts.length === 0) return null

  const overdue = alerts.filter(a => a.level === 'overdue')
  const dueToday = alerts.filter(a => a.level === 'due_today')
  const dueSoon = alerts.filter(a => a.level === 'due_soon')

  const groups = [
    { key: 'overdue', items: overdue, config: LEVEL_CONFIG.overdue },
    { key: 'due_today', items: dueToday, config: LEVEL_CONFIG.due_today },
    { key: 'due_soon', items: dueSoon, config: LEVEL_CONFIG.due_soon },
  ].filter(g => g.items.length > 0)

  return (
    <div className="alert-panel">
      <button className="alert-panel-header" onClick={() => setPanelOpen(!panelOpen)}>
        <div className="alert-header-left">
          <span className="alert-bell">&#9888;</span>
          <h3>Alertas ({alerts.length})</h3>
          <div className="alert-summary-badges">
            {overdue.length > 0 && <span className="alert-mini-badge" style={{ background: LEVEL_CONFIG.overdue.bg, color: LEVEL_CONFIG.overdue.color }}>{overdue.length} vencidas</span>}
            {dueToday.length > 0 && <span className="alert-mini-badge" style={{ background: LEVEL_CONFIG.due_today.bg, color: LEVEL_CONFIG.due_today.color }}>{dueToday.length} hoy</span>}
            {dueSoon.length > 0 && <span className="alert-mini-badge" style={{ background: LEVEL_CONFIG.due_soon.bg, color: LEVEL_CONFIG.due_soon.color }}>{dueSoon.length} pronto</span>}
          </div>
        </div>
        <span className={`alert-toggle ${panelOpen ? 'open' : ''}`}>&#9662;</span>
      </button>

      {panelOpen && (
        <div className="alert-list">
          {groups.map(group => (
            <AlertGroup
              key={group.key}
              label={group.config.groupLabel}
              color={group.config.color}
              items={group.items}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AlertGroup({ label, color, items, onTaskClick }: {
  label: string; color: string; items: TaskAlert[]; onTaskClick: (id: string) => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="alert-group">
      <button className="alert-group-title" onClick={() => setOpen(!open)} style={{ color }}>
        <span className={`group-toggle ${open ? 'open' : ''}`}>{open ? '−' : '+'}</span>
        {label} ({items.length})
      </button>
      {open && items.map(a => (
        <AlertItem key={a.task.id} alert={a} onClick={() => onTaskClick(a.task.id)} />
      ))}
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
