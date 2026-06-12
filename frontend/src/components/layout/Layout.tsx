import { useState, useEffect } from 'react'
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
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('fokus_sidebar') === 'collapsed'
  })

  useEffect(() => {
    localStorage.setItem('fokus_sidebar', collapsed ? 'collapsed' : 'expanded')
  }, [collapsed])

  return (
    <div className={`layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h1 className="logo">{collapsed ? 'F' : 'Fokus'}</h1>
          <button
            className="collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expandir menu' : 'Comprimir menu'}
          >
            {collapsed ? '\u276F' : '\u276E'}
          </button>
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
                title={config.label}
              >
                <span className="workspace-icon">{config.icon}</span>
                {!collapsed && <span className="workspace-label">{config.label}</span>}
              </button>
            )
          })}
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title="Dashboard">
            <span className="nav-icon">&#9673;</span>
            {!collapsed && <span>Dashboard</span>}
          </NavLink>
          <NavLink to="/kanban" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title="Kanban">
            <span className="nav-icon">&#9634;</span>
            {!collapsed && <span>Kanban</span>}
          </NavLink>
          <NavLink to="/eisenhower" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title="Eisenhower">
            <span className="nav-icon">&#9638;</span>
            {!collapsed && <span>Eisenhower</span>}
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title="Proyectos">
            <span className="nav-icon">&#9776;</span>
            {!collapsed && <span>Proyectos</span>}
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title="Configuracion">
            <span className="nav-icon">&#9881;</span>
            {!collapsed && <span>Settings</span>}
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user.full_name.charAt(0).toUpperCase()}</div>
            {!collapsed && <span className="user-name">{user.full_name}</span>}
          </div>
          {!collapsed && <button className="btn btn-secondary btn-sm" onClick={onSignOut}>Salir</button>}
          {collapsed && (
            <button className="btn btn-secondary btn-sm collapse-signout" onClick={onSignOut} title="Salir">
              &#x2192;
            </button>
          )}
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
