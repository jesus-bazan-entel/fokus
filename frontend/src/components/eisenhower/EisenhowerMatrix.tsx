import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useState } from 'react'
import type { Task, TaskPriority, TaskImportance } from '../../types'
import { getQuadrant } from '../../types'
import './EisenhowerMatrix.css'

const QUADRANTS = [
  { id: 'do_first', title: 'Hacer primero', subtitle: 'Urgente + Importante', color: '#ef4444', bg: '#fef2f2', priority: 'urgent' as TaskPriority, importance: 'important' as TaskImportance },
  { id: 'schedule', title: 'Programar', subtitle: 'No urgente + Importante', color: '#3b82f6', bg: '#eff6ff', priority: 'not_urgent' as TaskPriority, importance: 'important' as TaskImportance },
  { id: 'delegate', title: 'Delegar', subtitle: 'Urgente + No importante', color: '#f59e0b', bg: '#fffbeb', priority: 'urgent' as TaskPriority, importance: 'not_important' as TaskImportance },
  { id: 'eliminate', title: 'Eliminar', subtitle: 'No urgente + No importante', color: '#94a3b8', bg: '#f8fafc', priority: 'not_urgent' as TaskPriority, importance: 'not_important' as TaskImportance },
] as const

interface Props {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onTaskMove: (taskId: string, priority: TaskPriority, importance: TaskImportance) => void
}

function DroppableQuadrant({ id, title, subtitle, color, bg, count, children }: {
  id: string; title: string; subtitle: string; color: string; bg: string; count: number; children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`quadrant ${isOver ? 'quadrant-over' : ''}`}
      style={{ background: isOver ? color + '15' : bg }}
    >
      <div className="quadrant-header">
        <span className="quadrant-dot" style={{ background: color }} />
        <h3 style={{ color }}>{title}</h3>
        <span className="quadrant-count">{count}</span>
      </div>
      <p className="quadrant-subtitle">{subtitle}</p>
      <div className="quadrant-tasks">
        {children}
      </div>
    </div>
  )
}

function DraggableTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({ id: task.id })
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.4 : 1,
    cursor: 'grab',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="quadrant-task card"
      onClick={!isDragging ? onClick : undefined}
    >
      <p className="task-title">{task.title}</p>
      {task.project && (
        <span className="task-project-badge" style={{ background: task.project.color + '20', color: task.project.color }}>
          {task.project.name}
        </span>
      )}
    </div>
  )
}

function OverlayCard({ task }: { task: Task }) {
  return (
    <div className="quadrant-task card dragging" style={{ cursor: 'grabbing', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
      <p className="task-title">{task.title}</p>
      {task.project && (
        <span className="task-project-badge" style={{ background: task.project.color + '20', color: task.project.color }}>
          {task.project.name}
        </span>
      )}
    </div>
  )
}

export default function EisenhowerMatrix({ tasks, onTaskClick, onTaskMove }: Props) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const activeTasks = tasks.filter(t => t.status !== 'done')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const getQuadrantTasks = (quadrantId: string) =>
    activeTasks.filter(t => getQuadrant(t) === quadrantId)

  const handleDragStart = (event: DragStartEvent) => {
    const task = activeTasks.find(t => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return

    const taskId = active.id as string
    const targetQuadrant = QUADRANTS.find(q => q.id === over.id)
    if (!targetQuadrant) return

    const task = activeTasks.find(t => t.id === taskId)
    if (task && getQuadrant(task) !== targetQuadrant.id) {
      onTaskMove(taskId, targetQuadrant.priority, targetQuadrant.importance)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="eisenhower-grid">
        <div className="axis-label axis-y-top">Importante</div>
        <div className="axis-label axis-y-bottom">No importante</div>
        <div className="axis-label axis-x-left">Urgente</div>
        <div className="axis-label axis-x-right">No urgente</div>
        {QUADRANTS.map(q => {
          const qTasks = getQuadrantTasks(q.id)
          return (
            <DroppableQuadrant key={q.id} id={q.id} title={q.title} subtitle={q.subtitle} color={q.color} bg={q.bg} count={qTasks.length}>
              {qTasks.map(task => (
                <DraggableTaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
              ))}
              {qTasks.length === 0 && !activeTask && (
                <p className="quadrant-empty">Sin tareas</p>
              )}
              {qTasks.length === 0 && activeTask && (
                <p className="quadrant-empty drop-hint">Soltar aqui</p>
              )}
            </DroppableQuadrant>
          )
        })}
      </div>
      <DragOverlay>
        {activeTask && <OverlayCard task={activeTask} />}
      </DragOverlay>
    </DndContext>
  )
}
