import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '../../types'
import './KanbanBoard.css'

interface Props {
  task: Task
  onClick: () => void
  isDragging?: boolean
}

export default function KanbanCard({ task, onClick, isDragging }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
  }

  const priorityLabel = task.priority === 'urgent' ? 'Urgente' : ''
  const importanceLabel = task.importance === 'important' ? 'Importante' : ''

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`kanban-card card ${isDragging ? 'dragging' : ''}`}
      onClick={onClick}
    >
      {task.project && (
        <span className="task-project-badge" style={{ background: task.project.color + '20', color: task.project.color }}>
          {task.project.name}
        </span>
      )}
      <p className="task-title">{task.title}</p>
      <div className="task-meta">
        {priorityLabel && <span className="tag tag-urgent">{priorityLabel}</span>}
        {importanceLabel && <span className="tag tag-important">{importanceLabel}</span>}
        {task.assignee_name && (
          <span className="task-assignee">{task.assignee_name}</span>
        )}
        {task.due_date && (
          <span className="task-due">{new Date(task.due_date).toLocaleDateString('es')}</span>
        )}
      </div>
    </div>
  )
}
