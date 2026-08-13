import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import TransitionLink from './TransitionLink'
import { gsap } from 'gsap'
import { useApp } from '../../context/AppContext'
import { teamService } from '../../services/teamService'
import { teamChatService } from '../../services/teamChatService'
import { isOriginalAdminEmail } from '../../services/authService'

const BASE_NAV_ITEMS = [
  { label: 'Events', href: '/' },
  { label: 'Past Events', href: '/past-events' },
  { label: 'Teams', href: '/teams' },
  { label: 'About', href: '/about' },
  { label: 'My Passes', href: '/my-tickets' },
]

export default function NavMenu() {
  const navRef = useRef<HTMLElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const profileDropdownRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const { user, logout } = useApp()
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const [pendingInviteCount, setPendingInviteCount] = useState(0)

  const isAdmin = user?.role === 'admin' || isOriginalAdminEmail(user?.email)

  const navItems = isAdmin
    ? [...BASE_NAV_ITEMS, { label: 'Admin', href: '/admin' }]
    : BASE_NAV_ITEMS

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Poll for unread team chat messages
  useEffect(() => {
    if (!user?.id) return
    let isMounted = true

    const checkUnread = async () => {
      try {
        const teams = await teamService.getUserTeams(user.id)
        if (!isMounted || teams.length === 0) {
          if (isMounted) setUnreadChatCount(0)
          return
        }
        let total = 0
        for (const t of teams) {
          const count = await teamChatService.getUnreadCount(t.id, user.id)
          total += count
        }
        if (isMounted) setUnreadChatCount(total)
      } catch (err) {
        console.warn('Check unread error:', err)
      }
    }

    checkUnread()
    const interval = setInterval(checkUnread, 3000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [user?.id, location.pathname])

  // Poll for pending team invitations
  useEffect(() => {
    if (!user?.id) { setPendingInviteCount(0); return }
    let isMounted = true
    const check = async () => {
      try {
        const count = await teamService.getPendingInviteCount(user.id)
        if (isMounted) setPendingInviteCount(count)
      } catch { /* silent */ }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => { isMounted = false; clearInterval(interval) }
  }, [user?.id, location.pathname])

  useEffect(() => {
    if (!navRef.current) return
    gsap.fromTo(
      navRef.current,
      { y: -80, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'p5Overshoot', delay: 0.3 }
    )
  }, [])

  // Close profile dropdown when clicking outside
  useEffect(() => {
    if (!profileOpen) return
    const handler = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [profileOpen])

  // Close dropdown on route change
  useEffect(() => { setProfileOpen(false); setMenuOpen(false) }, [location.pathname])

  const toggleMenu = () => {
    if (!mobileMenuRef.current) return
    if (!menuOpen) {
      setMenuOpen(true)
      gsap.fromTo(
        mobileMenuRef.current,
        { clipPath: 'polygon(0 0, 100% 0, 95% 0, 0 0)', opacity: 0 },
        { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', opacity: 1, duration: 0.35, ease: 'p5Overshoot' }
      )
    } else {
      gsap.to(mobileMenuRef.current, {
        clipPath: 'polygon(0 0, 100% 0, 95% 0, 0 0)',
        opacity: 0,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => setMenuOpen(false),
      })
    }
  }

  const handleLogout = async () => {
    setProfileOpen(false)
    await logout()
  }

  return (
    <>
      <nav
        ref={navRef}
        id="main-nav"
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12"
        style={{
          height: 'var(--nav-h)',
          background: scrolled ? 'rgba(10,10,15,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(99,102,241,0.2)' : 'none',
          transition: 'background 0.3s ease, border-color 0.3s ease',
        }}
      >
        {/* Logo */}
        <TransitionLink to="/" className="flex items-center gap-3 no-underline group" aria-label="EventX Home">
          <span className="font-display text-2xl tracking-widest" style={{ color: 'var(--color-accent)', letterSpacing: '0.15em' }}>EVENT</span>
          <span className="font-display text-2xl tracking-widest" style={{ color: 'var(--color-primary)', letterSpacing: '0.15em' }}>ZERO</span>
        </TransitionLink>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-8 list-none m-0">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <TransitionLink
                  to={item.href}
                  className="font-ui font-semibold tracking-wider text-sm no-underline relative group flex items-center"
                  style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)', letterSpacing: '0.12em', transition: 'color 0.2s ease' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = isActive ? 'var(--color-primary)' : 'var(--color-text-muted)')}
                >
                  {item.label.toUpperCase()}
                  {item.href === '/teams' && unreadChatCount > 0 && (
                    <span
                      style={{
                        marginLeft: 6,
                        padding: '1px 6px',
                        borderRadius: 10,
                        background: '#ef4444',
                        color: '#ffffff',
                        fontSize: 10,
                        fontWeight: 800,
                        lineHeight: '1.2',
                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                        animation: 'pulse 2s infinite',
                      }}
                      title={`${unreadChatCount} unread team message${unreadChatCount > 1 ? 's' : ''}`}
                    >
                      {unreadChatCount}
                    </span>
                  )}
                  {item.href === '/teams' && pendingInviteCount > 0 && (
                    <span
                      style={{
                        marginLeft: unreadChatCount > 0 ? 4 : 6,
                        padding: '1px 6px',
                        borderRadius: 10,
                        background: '#d97706',
                        color: '#ffffff',
                        fontSize: 10,
                        fontWeight: 800,
                        lineHeight: '1.2',
                        boxShadow: '0 0 10px rgba(245,158,11,0.8)',
                        animation: 'pulse 2s infinite',
                      }}
                      title={`${pendingInviteCount} pending team invitation${pendingInviteCount > 1 ? 's' : ''}`}
                    >
                      ✉{pendingInviteCount}
                    </span>
                  )}
                  <span className="absolute -bottom-1 left-0 h-px transition-all duration-200" style={{ background: 'var(--color-primary)', width: isActive ? '100%' : '0%' }} />
                </TransitionLink>
              </li>
            )
          })}

          {/* Auth section */}
          <li className="ml-4">
            {user ? (
              /* Profile avatar + dropdown */
              <div className="relative" ref={profileDropdownRef}>
                <button
                  id="nav-profile-btn"
                  onClick={() => setProfileOpen(v => !v)}
                  className="flex items-center gap-3 cursor-pointer"
                  style={{ background: 'none', border: 'none', padding: 0 }}
                >
                  <div
                    className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-display text-sm font-bold text-white"
                    style={{
                      background: user.avatarUrl ? 'transparent' : 'rgba(99,102,241,0.25)',
                      border: `2px solid ${profileOpen ? 'var(--color-accent)' : 'rgba(99,102,241,0.4)'}`,
                      transition: 'border-color 0.2s',
                      boxShadow: profileOpen ? '0 0 12px rgba(34,211,238,0.4)' : 'none',
                    }}
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{(user.name.charAt(0) || 'U').toUpperCase()}</span>
                    )}
                  </div>
                  <div className="hidden lg:flex flex-col items-start">
                    <div className="flex items-center gap-1.5">
                      <span className="font-ui font-semibold text-xs tracking-wider leading-tight" style={{ color: 'var(--color-text)', letterSpacing: '0.05em' }}>
                        {user.name.split(' ')[0].toUpperCase()}
                      </span>
                      {isAdmin && (
                        <span className="px-1.5 py-0.5 text-[9px] font-ui font-bold tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <span className="font-ui text-xs leading-tight" style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>
                      {user.email}
                    </span>
                  </div>
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ color: 'var(--color-text-muted)', transition: 'transform 0.2s', transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {/* Dropdown */}
                {profileOpen && (
                  <div
                    className="absolute right-0 top-full mt-3 w-56 py-2"
                    style={{
                      background: 'rgba(14,14,22,0.98)',
                      border: '1px solid rgba(99,102,241,0.25)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)',
                      animation: 'fadeInUp 0.2s ease',
                    }}
                  >
                    {/* User info header */}
                    <div className="px-4 py-3 mb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between">
                        <p className="font-ui font-semibold text-xs tracking-wider truncate" style={{ color: 'var(--color-text)' }}>{user.name}</p>
                        {isAdmin && (
                          <span className="px-1.5 py-0.5 text-[9px] font-ui font-bold tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <p className="font-ui text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{user.email}</p>
                    </div>

                    {[
                      { label: 'MY PROFILE', href: '/profile', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', show: true },
                      { label: 'MY PASSES', href: '/my-tickets', icon: 'M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z', show: true },
                      { label: 'ADMIN CONSOLE', href: '/admin', icon: 'M12 2v20M2 12h20', show: isAdmin },
                    ].filter(item => item.show).map(({ label, href, icon }) => (
                      <TransitionLink
                        key={href}
                        to={href}
                        className="flex items-center gap-3 px-4 py-2.5 no-underline w-full font-ui text-xs tracking-wider"
                        style={{ color: 'var(--color-text-muted)', letterSpacing: '0.1em', transition: 'background 0.15s, color 0.15s', display: 'flex' }}
                        onMouseEnter={e => Object.assign((e.currentTarget as HTMLAnchorElement).style, { background: 'rgba(99,102,241,0.08)', color: 'var(--color-text)' })}
                        onMouseLeave={e => Object.assign((e.currentTarget as HTMLAnchorElement).style, { background: 'transparent', color: 'var(--color-text-muted)' })}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={icon}/></svg>
                        {label}
                      </TransitionLink>
                    ))}

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4, paddingTop: 4 }}>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 w-full font-ui text-xs tracking-wider"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', letterSpacing: '0.1em', transition: 'background 0.15s' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,113,113,0.08)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                        </svg>
                        SIGN OUT
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <TransitionLink
                to="/auth"
                className="btn-primary px-8 py-3 text-base font-bold no-underline inline-block shadow-lg shadow-indigo-500/20"
                style={{ textDecoration: 'none', border: '2px solid var(--color-primary)' }}
              >
                LOGIN
              </TransitionLink>
            )}
          </li>
        </ul>

        {/* Mobile hamburger */}
        <button
          onClick={toggleMenu}
          className="md:hidden flex flex-col gap-1.5 p-2"
          aria-label="Toggle menu"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className="block w-6 h-px" style={{ background: 'var(--color-primary)', transition: 'all 0.3s ease' }} />
          ))}
        </button>
      </nav>

      {/* Mobile fullscreen menu */}
      {menuOpen && (
        <div
          ref={mobileMenuRef}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 md:hidden"
          style={{ background: 'rgba(10,10,15,0.97)', backdropFilter: 'blur(20px)' }}
        >
          {navItems.map((item) => (
            <TransitionLink
              key={item.href}
              to={item.href}
              onClick={toggleMenu}
              className="font-display text-4xl md:text-5xl tracking-widest no-underline flex items-center gap-3"
              style={{ color: 'var(--color-text)', letterSpacing: '0.15em' }}
            >
              {item.label.toUpperCase()}
              {item.href === '/teams' && pendingInviteCount > 0 && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: '#d97706',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 800,
                    boxShadow: '0 0 10px rgba(245,158,11,0.8)',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  ✉{pendingInviteCount}
                </span>
              )}
            </TransitionLink>
          ))}

          {user ? (
            <div className="flex flex-col items-center gap-4 mt-4">
              <TransitionLink to="/profile" onClick={toggleMenu} className="btn-primary px-10 py-3 text-xl no-underline inline-block" style={{ textDecoration: 'none' }}>
                MY PROFILE
              </TransitionLink>
              <button onClick={handleLogout} className="font-ui font-semibold tracking-widest text-base" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', letterSpacing: '0.12em' }}>
                SIGN OUT
              </button>
            </div>
          ) : (
            <TransitionLink
              to="/auth"
              onClick={toggleMenu}
              className="btn-primary px-10 py-3 text-xl no-underline inline-block mt-4"
              style={{ textDecoration: 'none' }}
            >
              LOGIN
            </TransitionLink>
          )}
        </div>
      )}
    </>
  )
}
