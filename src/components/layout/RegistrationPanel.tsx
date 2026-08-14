import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import SectionTransition from '../ui/SectionTransition'
import { useShatter } from '../../hooks/useShatter'
import type { EventData, UserProfile } from '../../mocks/types'
import { eventService } from '../../services/eventService'
import { profileService } from '../../services/profileService'
import { useApp } from '../../context/AppContext'

interface RegistrationPanelProps {
  event: EventData
}

// Required profile fields for enrollment
const REQUIRED_FIELDS: { key: keyof UserProfile; label: string }[] = [
  { key: 'name',         label: 'Full Name' },
  { key: 'pnr',         label: 'PNR Number' },
  { key: 'classYear',   label: 'Year' },
  { key: 'division',    label: 'Division' },
  { key: 'branch',      label: 'Branch' },
  { key: 'contactEmail', label: 'Email' },
]

function getMissingFields(profile: UserProfile) {
  return REQUIRED_FIELDS.filter(f => !profile[f.key] || String(profile[f.key]).trim() === '')
}

export default function RegistrationPanel({ event }: RegistrationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { user, refreshTickets } = useApp()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [missingFields, setMissingFields] = useState<{ key: keyof UserProfile; label: string }[]>([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { state: shatterState, fire: shatterFire } = useShatter(
    panelRef as React.RefObject<HTMLElement>,
    () => {}
  )

  // Fetch profile when this section comes into view or user changes
  useEffect(() => {
    if (!user) return
    setProfileLoading(true)
    profileService.getProfile(user.id).then(p => {
      setProfile(p)
      if (p) setMissingFields(getMissingFields(p))
      setProfileLoading(false)
    })
  }, [user])

  const handleEnrollClick = () => {
    if (!profile) return
    const missing = getMissingFields(profile)
    if (missing.length > 0) {
      setMissingFields(missing)
      return
    }
    setMissingFields([])
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    if (!user || !profile) return
    setIsSubmitting(true)
    setError('')
    try {
      await eventService.registerForEvent(event.id)
      await refreshTickets()
      shatterFire()
    } catch (e: any) {
      setError(e?.message || 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const summaryRows = profile
    ? [
        { label: 'Event',    value: event.title },
        { label: 'Name',     value: profile.name },
        { label: 'PNR',      value: profile.pnr || '—' },
        { label: 'Year',     value: profile.classYear },
        { label: 'Division', value: profile.division },
        { label: 'Branch',   value: profile.branch || '—' },
        { label: 'Email',    value: profile.contactEmail },
      ]
    : []

  return (
    <>
      <SectionTransition
        id="register"
        direction="ltr"
        numSelector=".reg-section-num"
        style={{ padding: '4rem 0' }}
      >
      <div
        className="w-full max-w-5xl mx-auto p-8 md:p-12 animate-slide-up-fade"
        style={{
          background: 'var(--color-surface)',
          borderRadius: '24px',
          border: '1px solid var(--color-cream)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Left Column: Headline */}
          <div>
            <p className="font-ui font-semibold tracking-widest text-xs mb-4" style={{ color: 'var(--color-slate-blue)', letterSpacing: '0.25em' }}>
              JOIN US
            </p>
            <h2 className="font-display leading-[1.1] mb-6" style={{ fontSize: 'clamp(3rem, 6vw, 4.5rem)', color: 'var(--color-text-primary)' }}>
              SECURE<br />YOUR <span className="text-gradient-primary" style={{ color: 'var(--color-slate-blue)' }}>SEAT</span>
            </h2>
          </div>

          {/* Right Column: Actions / Status */}
          <div ref={panelRef} style={{ visibility: shatterState === 'shattering' ? 'hidden' : 'visible' }}>

            {/* ── Loading profile ── */}
            {profileLoading && (
              <div className="flex items-center justify-center gap-3 py-12">
                <div className="w-5 h-5 border-2 rounded-full" style={{ borderColor: 'var(--color-slate-blue)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                <span className="font-ui text-sm tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>LOADING PROFILE...</span>
              </div>
            )}

            {/* ── Missing required fields — prompt to complete profile ── */}
            {!profileLoading && missingFields.length > 0 && (
              <div className="space-y-6">
                <div className="p-6 rounded-xl" style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-cream)', borderLeft: '4px solid #f59e0b' }}>
                  <div className="flex items-start gap-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" className="mt-0.5 flex-shrink-0">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <div>
                      <p className="font-ui font-bold text-xs tracking-widest mb-2 uppercase" style={{ color: '#d97706', letterSpacing: '0.15em' }}>
                        PROFILE INCOMPLETE
                      </p>
                      <p className="font-body text-[13px] mb-4" style={{ color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
                        To enroll, your profile must have all required details filled in. Missing fields:
                      </p>
                      <ul className="space-y-1.5 ml-1">
                        {missingFields.map(f => (
                          <li key={f.key} className="font-body text-xs flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                            <span className="w-1 h-1 rounded-full bg-[#f59e0b] opacity-60 flex-shrink-0" />
                            {f.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                <Link
                  to="/profile"
                  className="w-full py-4 px-6 rounded-full text-sm flex items-center justify-center gap-2 font-body font-bold tracking-widest uppercase no-underline transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                  style={{ backgroundColor: 'var(--color-slate-blue)', color: 'var(--color-white)', border: 'none' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  COMPLETE MY PROFILE →
                </Link>
              </div>
            )}

            {/* ── Ready to enroll — show enroll button (no confirm yet) ── */}
            {!profileLoading && missingFields.length === 0 && !showConfirm && profile && (
              <div className="space-y-6">
                {/* Quick profile preview */}
                <div className="p-6 rounded-xl" style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-cream)' }}>
                  <p className="font-ui font-bold text-[10px] tracking-widest mb-5 uppercase" style={{ color: 'var(--color-slate-blue)', letterSpacing: '0.15em' }}>
                    YOUR DETAILS · AUTO-FILLED
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {[
                      { label: 'Name',     value: profile.name },
                      { label: 'PNR',      value: profile.pnr },
                      { label: 'Year',     value: profile.classYear },
                      { label: 'Division', value: profile.division },
                      { label: 'Branch',   value: profile.branch },
                      { label: 'Email',    value: profile.contactEmail },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col gap-1">
                        <span className="font-ui font-bold text-[10px] tracking-wider uppercase" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                        <span className="font-body font-semibold text-sm truncate" title={value} style={{ color: 'var(--color-text-primary)' }}>{value || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="font-body text-xs text-center" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  Your profile details will be used for this enrollment.{' '}
                  <Link to="/profile" className="font-semibold underline transition-colors hover:text-opacity-80" style={{ color: 'var(--color-slate-blue)' }}>Update profile</Link> if anything is incorrect.
                </p>

                <button
                  type="button"
                  onClick={handleEnrollClick}
                  className="w-full py-4 px-6 rounded-full text-sm flex items-center justify-center gap-2 font-body font-bold tracking-widest uppercase transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                  style={{ backgroundColor: 'var(--color-slate-blue)', color: 'var(--color-white)', border: 'none' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  ENROLL NOW →
                </button>
              </div>
            )}

            {/* ── Confirming state ── */}
            {showConfirm && (
              <div className="space-y-6">
                <div className="p-6 rounded-xl" style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-cream)' }}>
                  <p className="font-ui font-bold text-[10px] tracking-widest mb-5 uppercase" style={{ color: 'var(--color-slate-blue)', letterSpacing: '0.15em' }}>
                    ENROLLMENT SUMMARY
                  </p>
                  <div className="space-y-4">
                    {summaryRows.map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center pb-4 border-b last:border-0" style={{ borderColor: 'var(--color-sand)' }}>
                        <span className="font-ui font-bold text-[10px] tracking-wider uppercase" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                        <span className="font-body font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{value || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-xs px-4 py-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontFamily: 'var(--font-body)' }}>
                    {error}
                  </p>
                )}

                <p className="font-body text-xs text-center" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  By confirming, you agree to the university's event code of conduct. Your registration pass will be issued immediately.
                </p>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-4 px-6 rounded-full text-sm flex items-center justify-center font-body font-bold tracking-widest uppercase cursor-pointer transition-all duration-200 hover:bg-[rgba(62,88,104,0.05)]"
                    style={{ border: '1px solid var(--color-sand)', color: 'var(--color-text-primary)', background: 'transparent' }}
                    disabled={isSubmitting}
                  >
                    ← BACK
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="flex-1 py-4 px-6 rounded-full text-sm flex items-center justify-center gap-2 font-body font-bold tracking-widest uppercase transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                    style={{ backgroundColor: 'var(--color-slate-blue)', color: 'var(--color-white)', border: 'none' }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'ENROLLING...' : '✦ CONFIRM'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </SectionTransition>

      {shatterState === 'done' && profile && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: 'rgba(10,10,15,0.96)', backdropFilter: 'blur(24px)' }}>
          <div className="text-center max-w-lg px-8">
            <div className="w-24 h-24 mx-auto mb-8 flex items-center justify-center rounded-full" style={{ border: '2px solid var(--color-accent)', background: 'rgba(34,211,238,0.08)', animation: 'pulse-glow 2s ease-in-out infinite', boxShadow: '0 0 40px rgba(34,211,238,0.3)' }}>
              <span className="font-display text-4xl" style={{ color: 'var(--color-accent)' }}>✓</span>
            </div>
            <h2 className="font-display mb-4" style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)', color: 'var(--color-text)', lineHeight: 1 }}>YOU'RE IN.</h2>
            <p className="text-lg mb-2" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>WELCOME TO {event.title.toUpperCase()}</p>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.8, marginBottom: '2rem' }}>
              Your pass for <strong style={{ color: 'var(--color-text)' }}>{profile.name}</strong> has been confirmed.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/teams"
                className="btn-primary px-8 py-3.5 no-underline inline-flex items-center justify-center gap-2 text-base font-bold"
                style={{ textDecoration: 'none', background: 'rgba(34,211,238,0.15)', borderColor: 'var(--color-accent)', color: 'var(--color-accent)', boxShadow: '0 0 25px rgba(34,211,238,0.3)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                CREATE OR JOIN A TEAM →
              </Link>
              <Link to="/my-tickets" className="px-6 py-3.5 font-ui font-semibold text-xs tracking-widest no-underline inline-flex items-center justify-center border" style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'var(--color-text-muted)', letterSpacing: '0.12em' }}>
                VIEW MY TICKETS
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
