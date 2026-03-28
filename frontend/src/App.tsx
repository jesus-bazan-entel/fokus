import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { WorkspaceProvider } from './context/WorkspaceContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import KanbanPage from './pages/KanbanPage'
import EisenhowerPage from './pages/EisenhowerPage'
import ProjectsPage from './pages/ProjectsPage'

export default function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Cargando...</p>
      </div>
    )
  }

  if (!user) {
    return <LoginPage onSignIn={signIn} onSignUp={signUp} />
  }

  return (
    <WorkspaceProvider>
      <Layout user={user} onSignOut={signOut}>
        <Routes>
          <Route path="/" element={<Navigate to="/kanban" replace />} />
          <Route path="/kanban" element={<KanbanPage />} />
          <Route path="/eisenhower" element={<EisenhowerPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
        </Routes>
      </Layout>
    </WorkspaceProvider>
  )
}
