import { createContext, useContext, useState, useEffect } from 'react'
import type { Workspace } from '../types'

interface WorkspaceContextType {
  workspace: Workspace
  setWorkspace: (ws: Workspace) => void
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspace: 'corporate',
  setWorkspace: () => {},
})

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>(() => {
    return (localStorage.getItem('fokus_workspace') as Workspace) || 'corporate'
  })

  useEffect(() => {
    localStorage.setItem('fokus_workspace', workspace)
  }, [workspace])

  return (
    <WorkspaceContext.Provider value={{ workspace, setWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  return useContext(WorkspaceContext)
}
