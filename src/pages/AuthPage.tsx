import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import { useApp } from '../context/AppContext'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useApp()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      let user;
      if (isLogin) {
        user = await authService.login(email, password)
      } else {
        user = await authService.register(name, email, password)
      }
      login(user)
      navigate('/') // Redirect to events catalog after login
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 0,
    color: 'var(--color-text)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    padding: '0.75rem 1rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  }
  const inputFocusStyle = { borderColor: 'var(--color-primary)' }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 noise-overlay relative" style={{ background: 'var(--color-bg)' }}>
      <div className="scanline" />
      
      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="font-ui font-semibold text-sm tracking-widest text-white mb-8 inline-block hover:text-primary transition-colors">
          ← BACK TO HOME
        </Link>
        
        <div className="card-glass p-10 content-backdrop">
          <h1 className="font-display text-5xl mb-2 text-gradient-primary">
            {isLogin ? 'WELCOME BACK' : 'JOIN THE NETWORK'}
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>
            {isLogin ? 'Enter your university credentials to access your tickets and teams.' : 'Create your student account to register for upcoming hackathons.'}
          </p>

          {error && <div className="mb-6 p-4 border border-red-500/50 bg-red-500/10 text-red-200 text-sm font-ui">{error}</div>}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label className="font-ui font-semibold text-xs tracking-widest block mb-2" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.15em' }}>FULL NAME</label>
                <input 
                  type="text" 
                  style={inputStyle} 
                  onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)} 
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} 
                  placeholder="Jane Doe" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}
            <div>
              <label className="font-ui font-semibold text-xs tracking-widest block mb-2" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.15em' }}>UNIVERSITY EMAIL</label>
              <input 
                type="email" 
                style={inputStyle} 
                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)} 
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} 
                placeholder="student@university.edu" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="font-ui font-semibold text-xs tracking-widest block mb-2" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.15em' }}>PASSWORD</label>
              <input 
                type="password" 
                style={inputStyle} 
                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)} 
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} 
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base mt-4" style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? 'PROCESSING...' : (isLogin ? 'LOG IN' : 'CREATE ACCOUNT')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="font-ui font-semibold text-xs tracking-widest cursor-pointer"
              style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', letterSpacing: '0.1em' }}
            >
              {isLogin ? "DON'T HAVE AN ACCOUNT? REGISTER" : "ALREADY HAVE AN ACCOUNT? LOG IN"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
