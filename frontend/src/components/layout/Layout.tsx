import { NavLink } from 'react-router-dom'
import type { User } from '../../types'
import { WORKSPACE_CONFIG } from '../../types'
import type { Workspace } from '../../types'
import { useWorkspace } from '../../context/WorkspaceContext'
import './Layout.css'

interface Props {
  user: User
  onSignOut: () => void
  children: React.ReactNode
}

export default function Layout({ user, onSignOut, children }: Props) {
  const { workspace, setWorkspace } = useWorkspace()

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo">Fokus</h1>
        </div>

        <div className="workspace-switcher">
          {(Object.keys(WORKSPACE_CONFIG) as Workspace[]).map(ws => {
            const config = WORKSPACE_CONFIG[ws]
            const isActive = workspace === ws
            return (
              <button
                key={ws}
                className={`workspace-btn ${isActive ? 'active' : ''}`}
                onClick={() => setWorkspace(ws)}
                style={isActive ? { borderColor: config.color, background: config.color + '10' } : {}}
              >
                <span className="workspace-icon">{config.icon}</span>
                <span className="workspace-label">{config.label}</span>
              </button>
            )
          })}
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/kanban" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">&#9634;</span>
            Kanban
          </NavLink>
          <NavLink to="/eisenhower" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">&#9638;</span>
            Eisenhower
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">&#9776;</span>
            Proyectos
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user.full_name.charAt(0).toUpperCase()}</div>
            <span className="user-name">{user.full_name}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onSignOut}>Salir</button>
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
