import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import './SettingsPage.css'

interface UserSettings {
  full_name: string
  email: string
  phone: string
  due_soon_days: number
  notify_email: boolean
  notify_whatsapp: boolean
  notify_overdue: boolean
  notify_due_today: boolean
  notify_due_soon: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    full_name: '',
    email: '',
    phone: '',
    due_soon_days: 3,
    notify_email: true,
    notify_whatsapp: false,
    notify_overdue: true,
    notify_due_today: true,
    notify_due_soon: true,
  })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')

  const loadSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setSettings(prev => ({
        ...prev,
        full_name: user.user_metadata?.full_name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
      }))

      // Load custom settings from user_settings table
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setSettings(prev => ({
          ...prev,
          phone: data.phone || prev.phone,
          due_soon_days: data.due_soon_days ?? 3,
          notify_email: data.notify_email ?? true,
          notify_whatsapp: data.notify_whatsapp ?? false,
          notify_overdue: data.notify_overdue ?? true,
          notify_due_today: data.notify_due_today ?? true,
          notify_due_soon: data.notify_due_soon ?? true,
        }))
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: settings.full_name,
          phone: settings.phone,
        },
      })
      if (authError) throw authError

      // Upsert user_settings
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error: settingsError } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            phone: settings.phone,
            due_soon_days: settings.due_soon_days,
            notify_email: settings.notify_email,
            notify_whatsapp: settings.notify_whatsapp,
            notify_overdue: settings.notify_overdue,
            notify_due_today: settings.notify_due_today,
            notify_due_soon: settings.notify_due_soon,
          }, { onConflict: 'user_id' })
        if (settingsError) throw settingsError
      }

      setMessage('Configuracion guardada correctamente')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage('')

    if (newPassword.length < 6) {
      setPasswordMessage('La contrasena debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Las contrasenas no coinciden')
      return
    }

    setSavingPassword(true)
    try {
      // Verify current password by re-signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: settings.email,
        password: currentPassword,
      })
      if (signInError) {
        setPasswordMessage('Contrasena actual incorrecta')
        return
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setPasswordMessage('Contrasena actualizada correctamente')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : 'Error al cambiar contrasena')
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) return <p>Cargando configuracion...</p>

  return (
    <div className="settings-page">
      <h2>Configuracion</h2>

      <div className="settings-grid">
        {/* Profile section */}
        <div className="settings-card card">
          <h3 className="settings-card-title">Perfil de usuario</h3>
          <form onSubmit={handleSaveProfile} className="settings-form">
            <div className="form-group">
              <label>Nombre completo</label>
              <input
                className="input"
                value={settings.full_name}
                onChange={e => setSettings(s => ({ ...s, full_name: e.target.value }))}
                placeholder="Tu nombre"
              />
            </div>
            <div className="form-group">
              <label>Correo electronico</label>
              <input className="input" value={settings.email} disabled />
              <span className="form-hint">El correo no se puede cambiar</span>
            </div>
            <div className="form-group">
              <label>Celular / WhatsApp</label>
              <input
                className="input"
                value={settings.phone}
                onChange={e => setSettings(s => ({ ...s, phone: e.target.value }))}
                placeholder="+51 999 888 777"
              />
              <span className="form-hint">Formato internacional para notificaciones WhatsApp</span>
            </div>

            <h4 className="settings-subtitle">Alertas de tareas</h4>

            <div className="form-group">
              <label>Dias de anticipacion para alerta "Por vencer"</label>
              <input
                className="input"
                type="number"
                min={1}
                max={30}
                value={settings.due_soon_days}
                onChange={e => setSettings(s => ({ ...s, due_soon_days: parseInt(e.target.value) || 3 }))}
              />
            </div>

            <div className="settings-checkboxes">
              <label className="checkbox-label">
                <input type="checkbox" checked={settings.notify_overdue} onChange={e => setSettings(s => ({ ...s, notify_overdue: e.target.checked }))} />
                Alertar tareas vencidas
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={settings.notify_due_today} onChange={e => setSettings(s => ({ ...s, notify_due_today: e.target.checked }))} />
                Alertar tareas que vencen hoy
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={settings.notify_due_soon} onChange={e => setSettings(s => ({ ...s, notify_due_soon: e.target.checked }))} />
                Alertar tareas por vencer
              </label>
            </div>

            <h4 className="settings-subtitle">Canales de notificacion</h4>

            <div className="settings-checkboxes">
              <label className="checkbox-label">
                <input type="checkbox" checked={settings.notify_email} onChange={e => setSettings(s => ({ ...s, notify_email: e.target.checked }))} />
                Notificar por correo electronico
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={settings.notify_whatsapp} onChange={e => setSettings(s => ({ ...s, notify_whatsapp: e.target.checked }))} />
                Notificar por WhatsApp
                {settings.notify_whatsapp && !settings.phone && (
                  <span className="form-warning">Ingresa tu numero de celular arriba</span>
                )}
              </label>
            </div>

            {message && (
              <div className={`settings-message ${message.includes('Error') ? 'error' : 'success'}`}>
                {message}
              </div>
            )}

            <button className="btn btn-primary settings-save" type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar configuracion'}
            </button>
          </form>
        </div>

        {/* Password section */}
        <div className="settings-card card">
          <h3 className="settings-card-title">Cambiar contrasena</h3>
          <form onSubmit={handleChangePassword} className="settings-form">
            <div className="form-group">
              <label>Contrasena actual</label>
              <input
                className="input"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Nueva contrasena</label>
              <input
                className="input"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Minimo 6 caracteres"
              />
            </div>
            <div className="form-group">
              <label>Confirmar nueva contrasena</label>
              <input
                className="input"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {passwordMessage && (
              <div className={`settings-message ${passwordMessage.includes('correctamente') ? 'success' : 'error'}`}>
                {passwordMessage}
              </div>
            )}

            <button className="btn btn-secondary settings-save" type="submit" disabled={savingPassword}>
              {savingPassword ? 'Cambiando...' : 'Cambiar contrasena'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
