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
        style={{
          background: 'var(--color-surface)',
          padding: '6rem 0 8rem',
          position: 'relative',
        }}
      >
        <span className="section-num reg-section-num" aria-hidden="true">03</span>

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 xl:px-32">
          <div className="mb-12 content-backdrop max-w-3xl">
            <p className="font-ui font-semibold tracking-widest text-xs mb-3" style={{ color: 'var(--color-primary)', letterSpacing: '0.25em' }} data-reveal>
              JOIN US
            </p>
            <h2 className="font-display leading-none" style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', color: 'var(--color-text)' }} data-reveal>
              SECURE YOUR <br /><span className="text-gradient-primary">SEAT</span>
            </h2>
          </div>

          <div className="max-w-3xl">
            <div ref={panelRef} className="card-glass p-8" style={{ visibility: shatterState === 'shattering' ? 'hidden' : 'visible' }}>

              {/* ── Loading profile ── */}
              {profileLoading && (
                <div className="flex items-center gap-3 py-8">
                  <div className="w-5 h-5 border-2 rounded-full" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                  <span className="font-ui text-sm tracking-widest" style={{ color: 'var(--color-text-muted)' }}>LOADING YOUR PROFILE...</span>
                </div>
              )}

              {/* ── Missing required fields — prompt to complete profile ── */}
              {!profileLoading && missingFields.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-start gap-3 p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }}>
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <div>
                      <p className="font-ui font-semibold text-xs tracking-widest mb-2" style={{ color: '#ef4444', letterSpacing: '0.15em' }}>PROFILE INCOMPLETE</p>
                      <p className="font-ui text-sm mb-3" style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                        To enroll, your profile must have all required details filled in. The following fields are missing:
                      </p>
                      <ul className="space-y-1">
                        {missingFields.map(f => (
                          <li key={f.key} className="font-ui text-xs flex items-center gap-2" style={{ color: '#ef4444' }}>
                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#ef4444' }} />
                            {f.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <Link
                    to="/profile"
                    className="btn-primary w-full py-4 text-base no-underline inline-flex items-center justify-center gap-2"
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
                  <div className="p-5" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <p className="font-ui text-xs tracking-widest mb-4" style={{ color: 'var(--color-primary)', letterSpacing: '0.15em' }}>
                      YOUR DETAILS · AUTO-FILLED FROM PROFILE
                    </p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      {[
                        { label: 'Name',     value: profile.name },
                        { label: 'PNR',      value: profile.pnr },
                        { label: 'Year',     value: profile.classYear },
                        { label: 'Division', value: profile.division },
                        { label: 'Branch',   value: profile.branch },
                        { label: 'Email',    value: profile.contactEmail },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex flex-col gap-0.5">
                          <span className="font-ui text-xs tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label.toUpperCase()}</span>
                          <span className="font-ui font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{value || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs" style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                    Your profile details will be used for this enrollment.{' '}
                    <Link to="/profile" className="underline" style={{ color: 'var(--color-primary)' }}>Update profile</Link> if anything is incorrect.
                  </p>

                  <button
                    type="button"
                    onClick={handleEnrollClick}
                    className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    ENROLL NOW →
                  </button>
                </div>
              )}

              {/* ── Confirm step ── */}
              {!profileLoading && showConfirm && profile && (
                <div className="space-y-6">
                  <div className="p-5" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <p className="font-ui text-xs tracking-widest mb-4" style={{ color: 'var(--color-primary)', letterSpacing: '0.15em' }}>
                      ENROLLMENT SUMMARY
                    </p>
                    {summaryRows.map(({ label, value }) => (
                      <div key={label} className="flex justify-between py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <span className="font-ui text-xs tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label.toUpperCase()}</span>
                        <span className="font-ui font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {error && (
                    <p className="text-xs px-4 py-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
                      {error}
                    </p>
                  )}

                  <p className="text-xs" style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                    By confirming, you agree to the university's event code of conduct. Your registration pass will be issued immediately.
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowConfirm(false)}
                      className="font-ui font-semibold text-sm tracking-widest px-6 py-3"
                      style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-muted)', background: 'transparent', cursor: 'pointer', letterSpacing: '0.12em' }}
                      disabled={isSubmitting}
                    >
                      ← BACK
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm}
                      className="btn-primary flex-1 py-3 text-base"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'ENROLLING...' : '✦ CONFIRM ENROLLMENT'}
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
