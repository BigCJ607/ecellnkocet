import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import TransitionLink from './TransitionLink'
import { useApp } from '../../context/AppContext'
import { teamService } from '../../services/teamService'
import { teamChatService } from '../../services/teamChatService'
import { isOriginalAdminEmail } from '../../services/authService'

const BASE_NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Events', href: '/events' },
  { label: 'Past Events', href: '/past-events' },
  { label: 'Teams', href: '/teams' },
  { label: 'About', href: '/about' },
]

export default function NavMenu() {
  const [scrolled, setScrolled] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [scrollDirection, setScrollDirection] = useState<'up'|'down'>('up')
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
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
    let lastScrollY = window.scrollY;
    const onScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      setScrolled(currentScrollY > 40);
      
      if (currentScrollY > lastScrollY && currentScrollY > 10) {
        setScrollDirection('down');
      } else if (currentScrollY < lastScrollY) {
        setScrollDirection('up');
      }
      lastScrollY = currentScrollY;
    }
    window.addEventListener('scroll', onScroll, { passive: true })
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
    const interval = setInterval(checkUnread, 5000)
    return () => { isMounted = false; clearInterval(interval) }
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

  useEffect(() => { 
    setProfileOpen(false)
    setMenuOpen(false)
    if (menuOpen) {
      document.body.style.overflow = 'auto'
    }
  }, [location.pathname])

  const toggleMenu = () => {
    setMenuOpen(!menuOpen)
    document.body.style.overflow = !menuOpen ? 'hidden' : 'auto'
  }

  const [hovered, setHovered] = useState(false)

  const handleLogout = async () => {
    setProfileOpen(false)
    await logout()
  }

  const isActiveBg = scrolled || hovered || menuOpen;

  const [forceToggle, setForceToggle] = useState<'show'|'hide'|null>(null);

  useEffect(() => {
    if (forceToggle) setForceToggle(null);
  }, [scrollDirection]);

  let navHidden = false;
  if (scrollY > 10) {
    navHidden = scrollDirection === 'down' && !hovered && !menuOpen && !profileOpen;
  }
  if (forceToggle === 'show') navHidden = false;
  if (forceToggle === 'hide') navHidden = true;

  return (
    <>
      <div 
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
        style={{ height: 'var(--nav-h)' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="absolute top-0 left-0 right-0 h-4 pointer-events-auto" />
        
        <nav
          className="pointer-events-auto flex items-center justify-between px-6 md:px-12 transition-all duration-500 w-full h-full relative"
          style={{
            transform: navHidden ? 'translateY(-100%)' : 'translateY(0)',
            background: isActiveBg ? 'rgba(251, 249, 244, 0.98)' : 'transparent',
            backdropFilter: isActiveBg ? 'blur(12px)' : 'none',
            borderBottom: isActiveBg ? '1px solid var(--color-cream)' : '1px solid transparent',
          }}
        >
          {/* Logo */}
          <TransitionLink to="/" className="flex items-center no-underline text-2xl" aria-label="Event Zero Home">
            <span className="font-display font-bold" style={{ color: 'var(--color-text-primary)' }}>Event</span>
            <span className="font-display" style={{ color: 'var(--color-slate-blue)', marginLeft: '4px' }}>Zero</span>
          </TransitionLink>

          {/* Toggle Arrow */}
          <button 
            onClick={() => setForceToggle(navHidden ? 'show' : 'hide')}
            className="absolute left-1/2 -translate-x-1/2 z-[60] flex items-center justify-center bg-[var(--color-surface)] shadow-sm border border-[var(--color-cream)] cursor-pointer transition-all duration-300"
            style={{ 
              bottom: '-20px', 
              width: '44px', 
              height: '20px', 
              borderBottomLeftRadius: '12px', 
              borderBottomRightRadius: '12px',
              borderTop: 'none',
              color: 'var(--color-slate-blue)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: navHidden ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.4s' }}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-10 list-none m-0">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <TransitionLink
                  to={item.href}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  {item.label}
                  {item.href === '/teams' && (unreadChatCount > 0 || pendingInviteCount > 0) && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-12px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--color-dusty-blue)',
                      }}
                      title="New updates"
                    />
                  )}
                </TransitionLink>
              </li>
            )
          })}
        </ul>

        {/* Auth section */}
        <div className="hidden md:flex items-center">
          {user ? (
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-3 cursor-pointer p-0"
                style={{ background: 'none', border: 'none' }}
              >
                <div className="flex flex-col items-end text-right">
                  <span className="font-body text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {user.name.split(' ')[0]}
                  </span>
                  {isAdmin && (
                    <span className="text-[10px] font-body tracking-widest text-editorial uppercase">Admin</span>
                  )}
                </div>
                <div
                  className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-display text-sm font-bold"
                  style={{
                    background: user.avatarUrl ? 'transparent' : 'var(--color-cream)',
                    color: 'var(--color-slate-blue)',
                    border: '1px solid var(--color-sand)'
                  }}
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{(user.name.charAt(0) || 'U').toUpperCase()}</span>
                  )}
                </div>
              </button>

              {/* Profile Dropdown */}
              <div
                className={`absolute right-0 top-full mt-4 w-56 py-4 bg-white shadow-xl transition-all duration-300 ease-out origin-top-right ${profileOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
                style={{ border: '1px solid var(--color-cream)' }}
              >
                <div className="px-5 pb-4 mb-2 border-b border-gray-100">
                  <p className="font-display font-medium text-lg text-gray-900 truncate">{user.name}</p>
                  <p className="font-body text-xs text-gray-500 truncate mt-1">{user.email}</p>
                </div>

                {[
                  { label: 'My Profile', href: '/profile' },
                  { label: 'My Passes', href: '/my-tickets' },
                  { label: 'Admin Console', href: '/admin', show: isAdmin },
                ].filter(item => item.show !== false).map(({ label, href }) => (
                  <TransitionLink
                    key={href}
                    to={href}
                    className="block px-5 py-2.5 font-body text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    {label}
                  </TransitionLink>
                ))}

                <div className="mt-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-5 py-2.5 font-body text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <TransitionLink
              to="/auth"
              className="btn-primary py-2 px-6"
            >
              Sign In
            </TransitionLink>
          )}
        </div>

        {/* Mobile: Avatar + Hamburger */}
        <div className="md:hidden flex items-center gap-2 z-[60]">
          {/* Mobile avatar (tap → drawer where profile links live) */}
          {user && (
            <button
              onClick={toggleMenu}
              className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center font-display text-sm font-bold flex-shrink-0"
              style={{
                background: user.avatarUrl ? 'transparent' : 'var(--color-cream)',
                color: 'var(--color-slate-blue)',
                border: '1px solid var(--color-sand)',
                cursor: 'pointer',
                padding: 0,
              }}
              aria-label="Open menu"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span>{(user.name.charAt(0) || 'U').toUpperCase()}</span>
              )}
            </button>
          )}
          {/* Hamburger — 44×44 tap target */}
          <button
            onClick={toggleMenu}
            className="w-11 h-11 flex flex-col items-center justify-center gap-1.5"
            aria-label="Toggle menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span className={`block w-6 h-[1.5px] bg-black transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block w-6 h-[1.5px] bg-black transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-[1.5px] bg-black transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>
        </div>
        </nav>
      </div>

      {/* Mobile Drawer Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 z-[55] md:hidden transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleMenu}
      />

      {/* Mobile Fullscreen Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-[85%] max-w-sm z-[55] bg-[var(--color-white)] border-l border-[var(--color-cream)] shadow-2xl flex flex-col md:hidden transition-transform duration-500 ease-out ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full pt-28 px-8 pb-10 overflow-y-auto">
          <ul className="flex flex-col gap-8 list-none p-0 m-0 flex-grow">
            {navItems.map((item) => (
              <li key={item.href}>
                <TransitionLink
                  to={item.href}
                  onClick={toggleMenu}
                  className="font-display text-3xl font-medium text-[var(--color-text-primary)]"
                >
                  {item.label}
                  {item.href === '/teams' && (unreadChatCount > 0 || pendingInviteCount > 0) && (
                    <span className="ml-3 inline-block w-2 h-2 rounded-full bg-[var(--color-dusty-blue)] align-middle" />
                  )}
                </TransitionLink>
              </li>
            ))}
          </ul>

          <div className="pt-8 mt-8 border-t border-[var(--color-cream)]">
            {user ? (
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-[var(--color-cream)] text-[var(--color-slate-blue)] font-display text-lg border border-[var(--color-sand)]">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{(user.name.charAt(0) || 'U').toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-display font-medium text-lg text-[var(--color-text-primary)] leading-none">{user.name}</p>
                    <p className="font-body text-sm text-[var(--color-text-secondary)] mt-1">{user.email}</p>
                  </div>
                </div>
                
                <TransitionLink to="/profile" onClick={toggleMenu} className="font-body text-base text-[var(--color-text-primary)] min-h-[44px] flex items-center">
                  My Profile
                </TransitionLink>
                <TransitionLink to="/my-tickets" onClick={toggleMenu} className="font-body text-base text-[var(--color-text-primary)] min-h-[44px] flex items-center">
                  My Passes
                </TransitionLink>
                <button onClick={handleLogout} className="text-left font-body text-base text-red-500 mt-2 min-h-[44px] flex items-center" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Sign Out
                </button>
              </div>
            ) : (
              <TransitionLink
                to="/auth"
                onClick={toggleMenu}
                className="btn-primary w-full"
              >
                Sign In
              </TransitionLink>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
