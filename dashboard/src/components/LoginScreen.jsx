import { useState } from 'react'

export default function LoginScreen({ onLogin }) {
  const [user, setUser]     = useState('')
  const [pass, setPass]     = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user || !pass) { setError('Preencha usuário e senha.'); return }
    setError('')
    setLoading(true)
    try {
      await onLogin(user, pass)
    } catch {
      setError('Usuário ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo / branding */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52, height: 52,
            borderRadius: 14,
            background: 'var(--navy)',
            marginBottom: 16,
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M3 17l4-4 4 4 4-8 4 4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 21h18" stroke="rgba(255,255,255,.4)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--muted2)', marginBottom: 4 }}>
            FP&amp;A Dashboard
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy)' }}>
            XPTO Campinas
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px 28px' }}>
          <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text2)', marginBottom: 20 }}>
            Acesse com suas credenciais
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Username */}
            <div>
              <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                Usuário
              </label>
              <input
                type="text"
                value={user}
                onChange={e => setUser(e.target.value)}
                autoComplete="username"
                autoFocus
                placeholder="admin"
                style={inputStyle(!!error)}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                Senha
              </label>
              <input
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                style={inputStyle(!!error)}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                fontSize: '.78rem',
                color: 'var(--red)',
                background: 'rgba(220,38,38,.06)',
                border: '1px solid rgba(220,38,38,.2)',
                borderRadius: 7,
                padding: '8px 12px',
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? 'var(--muted2)' : 'var(--navy)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '11px 0',
                fontSize: '.88rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 4,
                transition: 'background .15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    display: 'inline-block', animation: 'spin .7s linear infinite',
                  }} />
                  Verificando…
                </>
              ) : 'Entrar'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: '.72rem', color: 'var(--muted2)' }}>
          Q1 2025 · Acesso restrito
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { outline: none; border-color: var(--teal) !important; box-shadow: 0 0 0 3px rgba(13,148,136,.12); }
      `}</style>
    </div>
  )
}

function inputStyle(hasError) {
  return {
    width: '100%',
    background: 'var(--surface)',
    border: `1px solid ${hasError ? 'rgba(220,38,38,.4)' : 'var(--border)'}`,
    color: 'var(--text)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: '.88rem',
    outline: 'none',
    transition: 'border-color .15s, box-shadow .15s',
    boxSizing: 'border-box',
  }
}
