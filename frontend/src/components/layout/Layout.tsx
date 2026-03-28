import { NavLink } from 'react-router-dom'
import type { User } from '../../types'
import './Layout.css'

interface Props {
  user: User
  onSignOut: () => void
  children: React.ReactNode
}

export default function Layout({ user, onSignOut, children }: Props) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo">Fokus</h1>
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
