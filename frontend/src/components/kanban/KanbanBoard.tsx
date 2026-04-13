import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
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

interface ProjectGroup {
  projectId: string
  projectName: string
  projectColor: string
  tasks: Task[]
}

function Column({ id, title, color, count, children }: { id: string; title: string; color: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div className={`kanban-column ${isOver ? 'column-over' : ''}`} ref={setNodeRef}>
      <div className="column-header">
        <span className="column-dot" style={{ background: color }} />
        <h3 className="column-title">{title}</h3>
        <span className="column-count">{count}</span>
      </div>
      <div className="column-content">
        {children}
      </div>
    </div>
  )
}

function ProjectSection({ group, collapsed, onToggle, completed, children }: {
  group: ProjectGroup; collapsed: boolean; onToggle: () => void; completed?: boolean; children: React.ReactNode
}) {
  return (
    <div className={`project-section ${completed ? 'project-section-completed' : ''}`}>
      <button className="project-section-header" onClick={onToggle}>
        <span className="project-section-dot" style={{ background: group.projectColor }} />
        <span className="project-section-name">{group.projectName}</span>
        {completed && <span className="project-completed-badge">✓ Completado</span>}
        <span className="project-section-count">{group.tasks.length}</span>
        <span className={`project-section-toggle ${collapsed ? '' : 'open'}`}>{collapsed ? '+' : '−'}</span>
      </button>
      {!collapsed && (
        <div className="project-section-tasks">
          {children}
        </div>
      )}
    </div>
  )
}

export default function KanbanBoard({ tasks, onTaskMove, onTaskClick, onAddTask }: Props) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  // Compute which projects are fully completed (all tasks in 'done' status)
  const completedProjects = useMemo(() => {
    const completed = new Set<string>()
    const projectTasks = new Map<string, Task[]>()
    for (const t of tasks) {
      if (!projectTasks.has(t.project_id)) projectTasks.set(t.project_id, [])
      projectTasks.get(t.project_id)!.push(t)
    }
    for (const [pid, pTasks] of projectTasks) {
      if (pTasks.length > 0 && pTasks.every(t => t.status === 'done')) {
        completed.add(pid)
      }
    }
    return completed
  }, [tasks])

  const getColumnTasks = (status: TaskStatus) =>
    tasks.filter(t => t.status === status).sort((a, b) => a.position - b.position)

  const getProjectGroups = (columnTasks: Task[]): ProjectGroup[] => {
    const map = new Map<string, ProjectGroup>()
    for (const task of columnTasks) {
      const pid = task.project_id
      if (!map.has(pid)) {
        map.set(pid, {
          projectId: pid,
          projectName: task.project?.name || 'Sin proyecto',
          projectColor: task.project?.color || '#94a3b8',
          tasks: [],
        })
      }
      map.get(pid)!.tasks.push(task)
    }
    return Array.from(map.values()).sort((a, b) => a.projectName.localeCompare(b.projectName))
  }

  // Check if grouping is useful (more than 1 project in any column with 5+ tasks)
  // Always group by project
  const shouldGroup = useMemo(() => tasks.length > 0, [tasks])

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragOver = (_event: DragOverEvent) => {}

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    const targetColumn = COLUMNS.find(c => c.id === overId)
    if (targetColumn) {
      const columnTasks = getColumnTasks(targetColumn.id)
      onTaskMove(taskId, targetColumn.id, columnTasks.length)
      return
    }

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
          const groups = getProjectGroups(columnTasks)

          return (
            <Column key={col.id} id={col.id} title={col.title} color={col.color} count={columnTasks.length}>
              <button className="add-task-btn" onClick={() => onAddTask(col.id)}>
                + Agregar tarea
              </button>
              <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {shouldGroup ? (
                  groups.map(group => {
                    const sectionKey = `${col.id}-${group.projectId}`
                    return (
                      <ProjectSection
                        key={sectionKey}
                        group={group}
                        collapsed={!expandedSections.has(sectionKey)}
                        onToggle={() => toggleSection(sectionKey)}
                        completed={completedProjects.has(group.projectId)}
                      >
                        {group.tasks.map(task => (
                          <KanbanCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                        ))}
                      </ProjectSection>
                    )
                  })
                ) : (
                  columnTasks.map(task => (
                    <KanbanCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                  ))
                )}
              </SortableContext>
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
