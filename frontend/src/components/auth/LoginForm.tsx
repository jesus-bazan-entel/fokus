import { useState } from 'react'
import './LoginForm.css'

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string, fullName: string) => Promise<void>
}

export default function LoginForm({ onSignIn, onSignUp }: Props) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (isSignUp) {
        await onSignUp(email, password, fullName)
        setSuccess('Cuenta creada. Revisa tu correo para confirmar.')
      } else {
        await onSignIn(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card card">
        <h1 className="login-logo">Fokus</h1>
        <p className="login-subtitle">
          {isSignUp ? 'Crea tu cuenta' : 'Inicia sesion para continuar'}
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          {isSignUp && (
            <div className="form-group">
              <label>Nombre completo</label>
              <input
                className="input"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                placeholder="Tu nombre"
              />
            </div>
          )}
          <div className="form-group">
            <label>Correo electronico</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="tu@correo.com"
            />
          </div>
          <div className="form-group">
            <label>Contrasena</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Minimo 6 caracteres"
            />
          </div>

          {error && <div className="login-error">{error}</div>}
          {success && <div className="login-success">{success}</div>}

          <button className="btn btn-primary login-btn" type="submit" disabled={loading}>
            {loading ? 'Cargando...' : isSignUp ? 'Crear cuenta' : 'Iniciar sesion'}
          </button>
        </form>

        <p className="login-toggle">
          {isSignUp ? 'Ya tienes cuenta?' : 'No tienes cuenta?'}{' '}
          <button className="link-btn" onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess('') }}>
            {isSignUp ? 'Inicia sesion' : 'Registrate'}
          </button>
        </p>
      </div>
    </div>
  )
}
