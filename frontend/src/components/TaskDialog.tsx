import { useState, useEffect, useRef } from 'react'
import type { Task, TaskStatus, TaskPriority, TaskImportance, TaskComment, Project } from '../types'
import { commentsApi } from '../lib/api'
import './TaskDialog.css'

interface Props {
  task?: Task | null
  projects: Project[]
  defaultStatus?: TaskStatus
  onSave: (data: Partial<Task>) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const mon = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${mon}/${year} ${h}:${m}`
}

function isImageType(type?: string): boolean {
  return !!type && type.startsWith('image/')
}

export default function TaskDialog({ task, projects, defaultStatus, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [status, setStatus] = useState<TaskStatus>(task?.status || defaultStatus || 'todo')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'not_urgent')
  const [importance, setImportance] = useState<TaskImportance>(task?.importance || 'not_important')
  const [projectId, setProjectId] = useState(task?.project_id || projects[0]?.id || '')
  const [dueDate, setDueDate] = useState(task?.due_date?.split('T')[0] || '')

  // Comments
  const [comments, setComments] = useState<TaskComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [commentFile, setCommentFile] = useState<File | null>(null)
  const [loadingComments, setLoadingComments] = useState(false)
  const [postingComment, setPostingComment] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!projectId && projects.length > 0) {
      setProjectId(projects[0].id)
    }
  }, [projects, projectId])

  // Load comments when editing an existing task
  useEffect(() => {
    if (task?.id) {
      setLoadingComments(true)
      commentsApi.list(task.id)
        .then(setComments)
        .catch(err => console.error('Error loading comments:', err))
        .finally(() => setLoadingComments(false))
    }
  }, [task?.id])

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...(task?.id ? { id: task.id } : {}),
      title,
      description,
      status,
      priority,
      importance,
      project_id: projectId,
      due_date: dueDate || undefined,
    })
  }

  const handleAddComment = async () => {
    if (!task?.id || (!newComment.trim() && !commentFile)) return
    setPostingComment(true)
    try {
      const comment = await commentsApi.create(task.id, newComment.trim(), commentFile || undefined)
      setComments(prev => [...prev, comment])
      setNewComment('')
      setCommentFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      console.error('Error posting comment:', err)
    } finally {
      setPostingComment(false)
    }
  }

  const handleDeleteComment = async (id: string) => {
    try {
      await commentsApi.delete(id)
      setComments(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error('Error deleting comment:', err)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddComment()
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className={`dialog card ${task?.id ? 'dialog-wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{task ? 'Editar tarea' : 'Nueva tarea'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className={`dialog-body ${task?.id ? 'dialog-split' : ''}`}>
          {/* Left: Task form */}
          <form onSubmit={handleSubmit} className="dialog-form">
            <div className="form-group">
              <label>Titulo</label>
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Nombre de la tarea" />
            </div>
            <div className="form-group">
              <label>Descripcion</label>
              <textarea className="input" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalles opcionales..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Proyecto</label>
                <select className="input" value={projectId} onChange={e => setProjectId(e.target.value)} required>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select className="input" value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
                  <option value="backlog">Backlog</option>
                  <option value="todo">Por hacer</option>
                  <option value="in_progress">En progreso</option>
                  <option value="done">Hecho</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Prioridad</label>
                <select className="input" value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
                  <option value="urgent">Urgente</option>
                  <option value="not_urgent">No urgente</option>
                </select>
              </div>
              <div className="form-group">
                <label>Importancia</label>
                <select className="input" value={importance} onChange={e => setImportance(e.target.value as TaskImportance)}>
                  <option value="important">Importante</option>
                  <option value="not_important">No importante</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Fecha limite</label>
              <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="dialog-actions">
              {task && onDelete && (
                <button type="button" className="btn btn-danger" onClick={() => onDelete(task.id)}>Eliminar</button>
              )}
              <div style={{ flex: 1 }} />
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary">{task ? 'Guardar' : 'Crear'}</button>
            </div>
          </form>

          {/* Right: Comments / Activity log */}
          {task?.id && (
            <div className="comments-panel">
              <h3 className="comments-title">Seguimiento</h3>

              <div className="comments-list">
                {loadingComments && <p className="comments-loading">Cargando...</p>}
                {!loadingComments && comments.length === 0 && (
                  <p className="comments-empty">Sin seguimientos. Agrega una nota o archivo.</p>
                )}
                {comments.map(c => (
                  <div key={c.id} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-time">{formatDateTime(c.created_at)}</span>
                      <button className="comment-delete" onClick={() => handleDeleteComment(c.id)} title="Eliminar">&times;</button>
                    </div>
                    {c.content && <p className="comment-text">{c.content}</p>}
                    {c.file_url && (
                      <div className="comment-file">
                        {isImageType(c.file_type) ? (
                          <a href={c.file_url} target="_blank" rel="noopener noreferrer">
                            <img src={c.file_url} alt={c.file_name} className="comment-image" />
                          </a>
                        ) : (
                          <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="comment-attachment">
                            <span className="attachment-icon">&#128206;</span>
                            {c.file_name || 'Archivo adjunto'}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>

              <div className="comment-input-area">
                <textarea
                  className="input comment-input"
                  placeholder="Escribe una nota de seguimiento..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                />
                <div className="comment-input-actions">
                  <label className="btn btn-secondary btn-sm file-upload-btn">
                    {commentFile ? commentFile.name : 'Adjuntar'}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.csv,.xlsx,.xls,.pdf,.doc,.docx,.txt"
                      onChange={e => setCommentFile(e.target.files?.[0] || null)}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {commentFile && (
                    <button className="btn btn-sm clear-file-btn" onClick={() => { setCommentFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}>
                      &times;
                    </button>
                  )}
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleAddComment}
                    disabled={postingComment || (!newComment.trim() && !commentFile)}
                  >
                    {postingComment ? '...' : 'Enviar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
