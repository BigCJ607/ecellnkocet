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

function getCompletedCount(profile: UserProfile | null) {
  if (!profile) return 0;
  return REQUIRED_FIELDS.filter(f => profile[f.key] && String(profile[f.key]).trim() !== '').length;
}

export default function RegistrationPanel({ event }: RegistrationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { user, refreshTickets } = useApp()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { state: shatterState, fire: shatterFire } = useShatter(
    panelRef as React.RefObject<HTMLElement>,
    () => {}
  )

  useEffect(() => {
    if (!user) return
    setProfileLoading(true)
    profileService.getProfile(user.id).then(p => {
      setProfile(p)
      setProfileLoading(false)
    })
  }, [user])

  const completedCount = getCompletedCount(profile)
  const totalCount = REQUIRED_FIELDS.length
  const isProfileComplete = completedCount === totalCount

  const handleEnrollClick = () => {
    if (!isProfileComplete) return
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

  return (
    <>
      <SectionTransition
        id="register"
        direction="ltr"
        numSelector=".reg-section-num"
        className="relative w-full"
        style={{ padding: '8rem 0', display: 'flex', justifyContent: 'center' }}
      >
        {/* Aesthetic CSS Background: Darker Beige */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" style={{ background: '#E8E4D9' }}>
          {/* Subtle floating gradient orbs */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] opacity-40 translate-x-1/3 -translate-y-1/3" style={{ background: '#F5F1E8' }} />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[150px] opacity-20 -translate-x-1/4 translate-y-1/4" style={{ background: 'var(--color-dusty-blue)' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '56rem', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '1.5rem', paddingRight: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* Centered Headline */}
          <div style={{ textAlign: 'center', marginBottom: '3rem', width: '100%' }}>
            <p className="font-ui font-semibold" style={{ letterSpacing: '0.25em', fontSize: '0.75rem', marginBottom: '1rem', textTransform: 'uppercase', color: 'var(--color-slate-blue)', textAlign: 'center' }}>
              JOIN US
            </p>
            <h2 className="font-display" style={{ fontSize: 'clamp(3.5rem, 6vw, 5rem)', lineHeight: 1.05, marginBottom: '1rem', color: 'var(--color-text-primary)', textAlign: 'center' }}>
              SECURE YOUR <span style={{ color: 'var(--color-slate-blue)' }}>SEAT</span>
            </h2>
            <p className="font-body" style={{ fontSize: '0.95rem', maxWidth: '32rem', marginLeft: 'auto', marginRight: 'auto', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
              Step into the arena. Ensure your profile is fully set up to claim your spot in {event.title}. 
            </p>
          </div>

          {/* Centered Spacious Card */}
          <div ref={panelRef} style={{ width: '100%', visibility: shatterState === 'shattering' ? 'hidden' : 'visible' }}>
            <div 
              style={{ background: '#fff', borderRadius: '2rem', padding: '2rem', boxShadow: '0 20px 60px -15px rgba(0,0,0,0.05)', border: '1px solid #E8E4D9', position: 'relative', width: '100%', textAlign: 'center' }}
            >
              {profileLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', gap: '1rem', width: '100%' }}>
                  <div className="w-8 h-8 border-[3px] rounded-full" style={{ borderColor: 'var(--color-slate-blue)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                  <span className="font-ui" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--color-text-secondary)' }}>LOADING PROFILE...</span>
                </div>
              ) : (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Progress Indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2.5rem', width: '100%', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      {REQUIRED_FIELDS.map((_, idx) => (
                        <div key={idx} style={{ height: '6px', flex: 1, borderRadius: '9999px', background: idx < completedCount ? '#22c55e' : '#f1f5f9', transition: 'background-color 0.5s' }} />
                      ))}
                    </div>
                    <span className="font-ui" style={{ marginLeft: '1.5rem', fontWeight: 700, fontSize: '10px', letterSpacing: '0.1em', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                      {completedCount} OF {totalCount}
                    </span>
                  </div>

                  {!showConfirm ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem', width: '100%' }}>
                      <div style={{ textAlign: 'center', width: '100%' }}>
                        <h3 className="font-display" style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)', textAlign: 'center' }}>
                          {isProfileComplete ? 'Profile Complete' : 'Complete Your Profile'}
                        </h3>
                        <p className="font-body" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                          {isProfileComplete 
                            ? 'All required details are set. You are ready to enroll.' 
                            : 'Please update your missing details to continue.'}
                        </p>
                      </div>

                      {/* Fields Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', width: '100%' }}>
                        {REQUIRED_FIELDS.map(f => {
                          const isCompleted = profile && profile[f.key] && String(profile[f.key]).trim() !== '';
                          return (
                            <div key={f.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.25rem', borderRadius: '1rem', background: '#fafafa', border: '1px solid #f3f4f6', textAlign: 'center', position: 'relative' }}>
                              <span className="font-ui" style={{ fontWeight: 700, fontSize: '10px', letterSpacing: '0.1em', color: '#9ca3af', textTransform: 'uppercase', textAlign: 'center' }}>{f.label}</span>
                              {isCompleted ? (
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: '1rem', right: '1rem' }}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                </div>
                              ) : (
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2.5px dashed #d1d5db', position: 'absolute', top: '1rem', right: '1rem' }} />
                              )}
                              <span className="font-body" style={{ fontSize: '0.8rem', fontWeight: 600, color: isCompleted ? 'var(--color-text-primary)' : 'var(--color-text-muted)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                                {isCompleted ? String(profile[f.key]) : 'Pending...'}
                              </span>
                            </div>
                          )
                        })}
                      </div>

                      {/* Actions */}
                      <div style={{ paddingTop: '1.5rem', display: 'flex', justifyContent: 'center', width: '100%' }}>
                        {!isProfileComplete ? (
                          <Link
                            to="/profile"
                            state={{ autoEdit: true }}
                            className="font-body"
                            style={{ width: '100%', maxWidth: '240px', padding: '1rem 2rem', borderRadius: '9999px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', background: 'var(--color-slate-blue)', color: '#fff', textDecoration: 'none', textAlign: 'center' }}
                          >
                            Edit Profile
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={handleEnrollClick}
                            className="font-body"
                            style={{ width: '100%', maxWidth: '240px', padding: '1rem 2rem', borderRadius: '9999px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', background: 'var(--color-slate-blue)', color: '#fff', border: 'none', cursor: 'pointer', textAlign: 'center' }}
                          >
                            Continue
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Confirm State */
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem', width: '100%' }}>
                      <div style={{ textAlign: 'center', width: '100%' }}>
                        <h3 className="font-display" style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)', textAlign: 'center' }}>
                          Confirm Registration
                        </h3>
                        <p className="font-body" style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                          You are about to register for <strong>{event.title}</strong>.
                        </p>
                      </div>

                      <div style={{ width: '100%', maxWidth: '28rem', margin: '0 auto', padding: '1.5rem', borderRadius: '1rem', background: '#fafafa', border: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb', marginBottom: '1.25rem' }}>
                          <span className="font-ui" style={{ fontWeight: 700, fontSize: '10px', letterSpacing: '0.1em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Participant</span>
                          <span className="font-body" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>{profile?.name}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb', marginBottom: '1.25rem' }}>
                          <span className="font-ui" style={{ fontWeight: 700, fontSize: '10px', letterSpacing: '0.1em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Contact</span>
                          <span className="font-body" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>{profile?.contactEmail}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                          <span className="font-ui" style={{ fontWeight: 700, fontSize: '10px', letterSpacing: '0.1em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Event Fee</span>
                          <span className="font-body" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#16a34a' }}>Free Entry</span>
                        </div>
                      </div>

                      {error && (
                        <div style={{ width: '100%', maxWidth: '28rem', margin: '0 auto', padding: '1rem', borderRadius: '0.75rem', background: '#fef2f2', border: '1px solid #fee2e2', textAlign: 'center' }}>
                          <p className="font-body" style={{ fontSize: '0.875rem', color: '#dc2626' }}>{error}</p>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', paddingTop: '0.5rem', width: '100%', maxWidth: '24rem', margin: '0 auto', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setShowConfirm(false)}
                          className="font-body"
                          style={{ flex: 1, padding: '1rem', borderRadius: '9999px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#4b5563', background: 'transparent', border: '1px solid #e5e7eb', cursor: 'pointer' }}
                          disabled={isSubmitting}
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirm}
                          className="font-body"
                          style={{ flex: 1, padding: '1rem', borderRadius: '9999px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', background: 'var(--color-slate-blue)', color: '#fff', border: 'none', cursor: 'pointer' }}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Confirming...' : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionTransition>


      {/* Success Modal */}
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
