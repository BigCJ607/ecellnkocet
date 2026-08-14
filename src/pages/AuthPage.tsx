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
  const [hoveredButton, setHoveredButton] = useState(false)
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
    background: 'var(--color-white)',
    border: '1px solid rgba(62, 88, 104, 0.2)', // subtle navy border
    borderRadius: '12px',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    padding: '0.9rem 1.2rem',
    outline: 'none',
    transition: 'all 0.2s ease',
  }
  const inputFocusStyle = { borderColor: 'var(--color-slate-blue)', background: 'var(--color-white)', boxShadow: '0 0 0 4px rgba(62, 88, 104, 0.1)' }

  return (
    <div className="w-full flex items-center justify-center p-6 relative overflow-hidden" style={{ minHeight: 'calc(100vh - 160px)', background: 'var(--color-bg)' }}>
      {/* Override browser autofill styling */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px var(--color-white) inset !important;
          -webkit-text-fill-color: var(--color-text-primary) !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
      
      {/* Dynamic Background Gradients */}
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: 'linear-gradient(to bottom right, var(--color-ivory), var(--color-white))' }} />
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full blur-[100px]" style={{ background: 'var(--color-dusty-blue)', opacity: 0.15 }} />
        <div className="absolute top-[40%] -right-[10%] w-[30%] h-[50%] rounded-full blur-[120px]" style={{ background: 'var(--color-slate-blue)', opacity: 0.1 }} />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="font-ui font-semibold text-xs tracking-widest text-[var(--color-slate-blue)] mb-8 mt-4 inline-flex items-center gap-2 hover:opacity-70 transition-opacity">
          <span style={{ fontSize: '16px' }}>←</span> BACK TO HOME
        </Link>
        
        <div 
          className="px-8 py-10 sm:px-12 sm:py-12 rounded-3xl"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-cream)',
            boxShadow: '0 25px 50px -12px rgba(62, 88, 104, 0.1), 0 10px 25px rgba(0, 0, 0, 0.05)'
          }}
        >
          <h1 className="font-display text-4xl mb-3 font-black tracking-tight leading-tight" style={{ color: 'var(--color-slate-blue)' }}>
            {isLogin ? 'WELCOME BACK' : 'JOIN THE NETWORK'}
          </h1>
          <p className="text-sm mb-10 font-body leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {isLogin ? 'Enter your university credentials to access your tickets and teams.' : 'Create your student account to register for upcoming hackathons.'}
          </p>

          {error && <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-50 text-red-600 text-sm font-ui">{error}</div>}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label className="font-ui font-bold text-[10px] tracking-wider block mb-3 uppercase" style={{ color: 'var(--color-slate-blue)' }}>Full Name</label>
                <input 
                  type="text" 
                  style={inputStyle} 
                  onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)} 
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(62, 88, 104, 0.2)';
                    e.target.style.background = 'var(--color-white)';
                    e.target.style.boxShadow = 'none';
                  }} 
                  placeholder="Jane Doe" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}
            <div>
              <label className="font-ui font-bold text-[10px] tracking-wider block mb-3 uppercase" style={{ color: 'var(--color-slate-blue)' }}>University Email</label>
              <input 
                type="email" 
                style={inputStyle} 
                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)} 
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(62, 88, 104, 0.2)';
                  e.target.style.background = 'var(--color-white)';
                  e.target.style.boxShadow = 'none';
                }} 
                placeholder="student@university.edu" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="font-ui font-bold text-[10px] tracking-wider block mb-3 uppercase" style={{ color: 'var(--color-slate-blue)' }}>Password</label>
              <input 
                type="password" 
                style={inputStyle} 
                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)} 
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(62, 88, 104, 0.2)';
                  e.target.style.background = 'var(--color-white)';
                  e.target.style.boxShadow = 'none';
                }} 
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              onMouseEnter={() => setHoveredButton(true)}
              onMouseLeave={() => setHoveredButton(false)}
              className="w-full py-4 text-sm font-bold tracking-widest uppercase mt-8 rounded-full transition-all duration-300" 
              style={{ 
                background: hoveredButton ? '#2a363b' : 'var(--color-slate-blue)',
                color: '#ffffff',
                boxShadow: hoveredButton ? '0 10px 20px -5px rgba(62, 88, 104, 0.4)' : '0 4px 6px -1px rgba(62, 88, 104, 0.1)',
                opacity: loading ? 0.7 : 1,
                transform: loading ? 'scale(0.98)' : (hoveredButton ? 'translateY(-1px)' : 'translateY(0)'),
              }}
            >
              {loading ? 'PROCESSING...' : (isLogin ? 'LOG IN' : 'CREATE ACCOUNT')}
            </button>
          </form>
        </div>

        {/* Secondary Action Link outside the card */}
        <div className="mt-8 text-center">
          <button 
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="font-ui font-medium text-xs tracking-wide cursor-pointer transition-colors"
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', textDecoration: 'underline', textUnderlineOffset: '4px' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-slate-blue)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
          >
            {isLogin ? "Don't have an account? Register" : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  )
}
