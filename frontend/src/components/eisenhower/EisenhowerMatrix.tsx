import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useState, useMemo } from 'react'
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

interface ProjectGroup {
  projectId: string
  projectName: string
  projectColor: string
  tasks: Task[]
}

function groupByProject(tasks: Task[]): ProjectGroup[] {
  const map = new Map<string, ProjectGroup>()
  for (const task of tasks) {
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

function ProjectSection({ group, collapsed, onToggle, children }: {
  group: ProjectGroup; collapsed: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="eq-project-section">
      <button className="eq-project-header" onClick={onToggle}>
        <span className="eq-project-dot" style={{ background: group.projectColor }} />
        <span className="eq-project-name">{group.projectName}</span>
        <span className="eq-project-count">{group.tasks.length}</span>
        <span className="eq-project-toggle">{collapsed ? '+' : '−'}</span>
      </button>
      {!collapsed && <div className="eq-project-tasks">{children}</div>}
    </div>
  )
}

export default function EisenhowerMatrix({ tasks, onTaskClick, onTaskMove }: Props) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const activeTasks = tasks.filter(t => t.status !== 'done')

  const shouldGroup = useMemo(() => activeTasks.length > 0, [activeTasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const getQuadrantTasks = (quadrantId: string) =>
    activeTasks.filter(t => getQuadrant(t) === quadrantId)

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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
          const groups = groupByProject(qTasks)
          return (
            <DroppableQuadrant key={q.id} id={q.id} title={q.title} subtitle={q.subtitle} color={q.color} bg={q.bg} count={qTasks.length}>
              {shouldGroup && qTasks.length > 0 ? (
                groups.map(group => {
                  const sectionKey = `${q.id}-${group.projectId}`
                  return (
                    <ProjectSection
                      key={sectionKey}
                      group={group}
                      collapsed={collapsedSections.has(sectionKey)}
                      onToggle={() => toggleSection(sectionKey)}
                    >
                      {group.tasks.map(task => (
                        <DraggableTaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                      ))}
                    </ProjectSection>
                  )
                })
              ) : (
                qTasks.map(task => (
                  <DraggableTaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                ))
              )}
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
