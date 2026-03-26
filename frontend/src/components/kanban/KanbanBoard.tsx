import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import KanbanCard from './KanbanCard'
import type { Task, TaskStatus } from '../../types'
import './KanbanBoard.css'

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'backlog', title: 'Backlog', color: '#94a3b8' },
  { id: 'todo', title: 'Por hacer', color: '#3b82f6' },
  { id: 'in_progress', title: 'En progreso', color: '#f59e0b' },
  { id: 'done', title: 'Hecho', color: '#22c55e' },
]

interface Props {
  tasks: Task[]
  onTaskMove: (taskId: string, status: TaskStatus, position: number) => void
  onTaskClick: (task: Task) => void
  onAddTask: (status: TaskStatus) => void
}

function Column({ id, title, color, children }: { id: string; title: string; color: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div className={`kanban-column ${isOver ? 'column-over' : ''}`} ref={setNodeRef}>
      <div className="column-header">
        <span className="column-dot" style={{ background: color }} />
        <h3 className="column-title">{title}</h3>
      </div>
      <div className="column-content">
        {children}
      </div>
    </div>
  )
}

export default function KanbanBoard({ tasks, onTaskMove, onTaskClick, onAddTask }: Props) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const getColumnTasks = (status: TaskStatus) =>
    tasks.filter(t => t.status === status).sort((a, b) => a.position - b.position)

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragOver = (_event: DragOverEvent) => {
    // Visual feedback handled by useDroppable
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    // Check if dropped on a column
    const targetColumn = COLUMNS.find(c => c.id === overId)
    if (targetColumn) {
      const columnTasks = getColumnTasks(targetColumn.id)
      onTaskMove(taskId, targetColumn.id, columnTasks.length)
      return
    }

    // Dropped on another task
    const overTask = tasks.find(t => t.id === overId)
    if (overTask) {
      onTaskMove(taskId, overTask.status, overTask.position)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board">
        {COLUMNS.map(col => {
          const columnTasks = getColumnTasks(col.id)
          return (
            <Column key={col.id} id={col.id} title={col.title} color={col.color}>
              <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {columnTasks.map(task => (
                  <KanbanCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                ))}
              </SortableContext>
              <button className="add-task-btn" onClick={() => onAddTask(col.id)}>
                + Agregar tarea
              </button>
            </Column>
          )
        })}
      </div>
      <DragOverlay>
        {activeTask && <KanbanCard task={activeTask} onClick={() => {}} isDragging />}
      </DragOverlay>
    </DndContext>
  )
}
