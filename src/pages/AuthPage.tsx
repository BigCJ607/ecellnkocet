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
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px',
    color: '#ffffff',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    padding: '0.85rem 1.1rem',
    outline: 'none',
    transition: 'all 0.2s ease',
  }
  const inputFocusStyle = { borderColor: '#22d3ee', background: 'rgba(255,255,255,0.1)', boxShadow: '0 0 0 4px rgba(34,211,238,0.1)' }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-slate-950">
      {/* Dynamic Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-cyan-950 opacity-90" />
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[0%] right-[0%] w-[50%] h-[50%] rounded-full bg-cyan-600/20 blur-[120px]" />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="font-ui font-semibold text-xs tracking-widest text-cyan-400 mb-8 inline-flex items-center gap-2 hover:text-cyan-300 transition-colors">
          <span style={{ fontSize: '16px' }}>←</span> BACK TO HOME
        </Link>
        
        <div 
          className="p-10 rounded-3xl"
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          <h1 className="font-display text-4xl mb-3 font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-cyan-300 leading-tight">
            {isLogin ? 'WELCOME BACK' : 'JOIN THE NETWORK'}
          </h1>
          <p className="text-sm mb-8 text-slate-400 font-body leading-relaxed">
            {isLogin ? 'Enter your university credentials to access your tickets and teams.' : 'Create your student account to register for upcoming hackathons.'}
          </p>

          {error && <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm font-ui">{error}</div>}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label className="font-ui font-bold text-[10px] tracking-widest block mb-2 text-slate-400 uppercase">Full Name</label>
                <input 
                  type="text" 
                  style={inputStyle} 
                  onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)} 
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                    e.target.style.background = 'rgba(255,255,255,0.06)';
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
              <label className="font-ui font-bold text-[10px] tracking-widest block mb-2 text-slate-400 uppercase">University Email</label>
              <input 
                type="email" 
                style={inputStyle} 
                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)} 
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.target.style.background = 'rgba(255,255,255,0.06)';
                  e.target.style.boxShadow = 'none';
                }} 
                placeholder="student@university.edu" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="font-ui font-bold text-[10px] tracking-widest block mb-2 text-slate-400 uppercase">Password</label>
              <input 
                type="password" 
                style={inputStyle} 
                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)} 
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.target.style.background = 'rgba(255,255,255,0.06)';
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
              className="w-full py-4 text-sm font-bold tracking-widest uppercase mt-6 rounded-xl transition-all duration-300" 
              style={{ 
                background: 'linear-gradient(to right, #6366f1, #06b6d4)',
                color: '#ffffff',
                boxShadow: '0 4px 14px 0 rgba(6, 182, 212, 0.39)',
                opacity: loading ? 0.7 : 1,
                transform: loading ? 'scale(0.98)' : 'scale(1)',
              }}
            >
              {loading ? 'PROCESSING...' : (isLogin ? 'LOG IN' : 'CREATE ACCOUNT')}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-white/10">
            <button 
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="font-ui font-bold text-xs tracking-widest cursor-pointer text-slate-400 hover:text-cyan-400 transition-colors uppercase"
              style={{ background: 'transparent', border: 'none' }}
            >
              {isLogin ? "DON'T HAVE AN ACCOUNT? REGISTER" : "ALREADY HAVE AN ACCOUNT? LOG IN"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
