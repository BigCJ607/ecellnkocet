import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import './styles/index.css'
import NavMenu from './components/ui/NavMenu'
import EventsListingPage from './pages/EventsListingPage'
import EventDetailPage from './pages/EventDetailPage'
import AboutPage from './pages/AboutPage'
import AuthPage from './pages/AuthPage'
import PastEventsPage from './pages/PastEventsPage'
import MyTicketsPage from './pages/MyTicketsPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import AdminEventTeamsPage from './pages/AdminEventTeamsPage'
import TeamsPage from './pages/TeamsPage'

import { AppProvider } from './context/AppContext'
import { useApp } from './context/AppContext'
import { useSessionTracker } from './hooks/useSessionTracker'
import gsap from 'gsap'


// Inner shell — needs to be inside both AppProvider and BrowserRouter to access useLocation
function AppShell() {
  const { user } = useApp()
  const location = useLocation()
  useSessionTracker(user?.id)

  useEffect(() => {
    gsap.fromTo(
      '#main-content',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
    )
  }, [location.pathname])

  return (
    <div id="app-root" className="relative flex flex-col min-h-screen overflow-hidden">

      <div id="page-wrapper" className="flex flex-col min-h-screen w-full relative z-0">
        <NavMenu />

        <main id="main-content" className="flex-1">
          <Routes>
            <Route path="/" element={<EventsListingPage />} />
            <Route path="/events" element={<EventsListingPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/past-events" element={<PastEventsPage />} />
            <Route path="/my-tickets" element={<MyTicketsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/events/:eventId/teams" element={<AdminEventTeamsPage />} />
            <Route path="/teams" element={<TeamsPage />} />
          </Routes>
        </main>

        <footer
          style={{
            background: 'var(--color-bg)',
            borderTop: '1px solid rgba(99,102,241,0.15)',
            padding: '3rem 0',
          }}
        >
          <div className="max-w-7xl mx-auto px-6 md:px-12 xl:px-32 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="font-display font-black text-xl tracking-widest" style={{ color: 'var(--color-slate-blue)' }}>
                ECELL
              </span>
            </div>
            <p
              className="font-ui text-xs tracking-widest text-center"
              style={{ color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}
            >
              © 2026 Ecell. ALL RIGHTS RESERVED.
            </p>
            <div className="flex gap-6">
              {['Privacy', 'Terms', 'Contact'].map((link) => (
                <a
                  key={link}
                  href="#"
                  className="font-ui text-xs tracking-widest no-underline"
                  style={{
                    color: 'var(--color-text-muted)',
                    letterSpacing: '0.1em',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-primary)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-muted)')}
                >
                  {link.toUpperCase()}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AppProvider>
  )
}
