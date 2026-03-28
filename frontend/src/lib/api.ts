import { supabase } from './supabase'
import type { Task, TaskStatus, Project, Workspace } from '../types'

// Projects
export const projectsApi = {
  async list(workspace?: Workspace): Promise<Project[]> {
    let query = supabase
      .from('projects')
      .select('*')
      .order('created_at')
    if (workspace) {
      query = query.eq('workspace', workspace)
    }
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data
  },

  async get(id: string): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  async create(project: Partial<Project>): Promise<Project> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...project, owner_id: user!.id })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  async update(id: string, project: Partial<Project>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .update(project)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
  },
}

// Tasks
export const tasksApi = {
  async list(workspace?: Workspace, projectId?: string): Promise<Task[]> {
    let query = supabase
      .from('tasks')
      .select('*, project:projects(*)')
      .order('position')
    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    if (workspace) {
      query = query.eq('project.workspace', workspace)
    }
    const { data, error } = await query
    if (error) throw new Error(error.message)
    // When filtering by project.workspace, rows with non-matching projects
    // come back with project: null — filter them out
    if (workspace) {
      return (data || []).filter((t: Task) => t.project !== null)
    }
    return data
  },

  async get(id: string): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, project:projects(*)')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  async create(task: Partial<Task>): Promise<Task> {
    const { data: existing } = await supabase
      .from('tasks')
      .select('position')
      .eq('project_id', task.project_id!)
      .eq('status', task.status || 'todo')
      .order('position', { ascending: false })
      .limit(1)
    const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0

    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...task, position: nextPosition })
      .select('*, project:projects(*)')
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  async update(id: string, task: Partial<Task>): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update(task)
      .eq('id', id)
      .select('*, project:projects(*)')
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  async updateStatus(id: string, status: TaskStatus, position: number): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status, position })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },
}
